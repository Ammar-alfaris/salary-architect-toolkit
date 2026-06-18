
## الهدف
عند الضغط على "ابدأ مجانًا" يختار الزائر الباقة أولًا، ثم ينشئ حسابًا، فيبدأ تلقائيًا في فترة تجريبية مجانية بمدة وسعر يحددهما السوبر آدمن من صفحة الباقات. بعد انتهاء التجربة نطبّق سياسة تخفيض تدريجي للخدمات لتعظيم التحويل إلى اشتراك مدفوع.

---

## 1) تدفّق التسجيل الجديد (Trial-first)

تغيير سلوك زر "ابدأ مجانًا" في الصفحة الرئيسية:

```
الصفحة الرئيسية
  └─ "ابدأ مجانًا"
       └─ /pricing?intent=trial   ← اختيار الباقة
            └─ "جرّبه مجانًا" (بدل "اشترك الآن")
                 └─ /auth?next=/app&plan=<slug>&cycle=<monthly|annual>
                      └─ إنشاء الحساب
                           └─ إنشاء organization + subscription (status='trial')
                                └─ /app (داخل التطبيق مباشرة)
```

تغييرات الواجهة في `src/routes/pricing.tsx`:
- زر الباقات (غير Enterprise) يصبح **"جرّبه مجانًا لمدة {trial_days} يومًا"** بدل "اشترك".
- لا يفتح Paylink checkout عند التسجيل الأول — يُمرر فقط `plan` و `cycle` إلى `/auth`.
- بطاقة "Enterprise" تبقى "تواصل مع المبيعات".

تغييرات في `src/routes/auth.tsx`:
- بعد نجاح SignUp/SignIn، نقرأ `plan` و `cycle` من query، وننفّذ server function `startTrial({ planSlug, cycle })`.

server function جديدة `src/lib/trial.functions.ts` (محمية بـ `requireSupabaseAuth`):
1. تتأكد أن المستخدم ليس عضوًا في organization حالية (وإلا تتجاهل).
2. تنشئ organization جديدة باسم افتراضي مشتق من البريد.
3. تربط المستخدم بدور `org_admin` في `user_roles`.
4. تنشئ صفًا في `subscriptions`:
   - `plan_id` = الباقة المختارة
   - `status='trial'`، `billing_cycle=cycle`
   - `trial_start_at = now()`، `trial_end_at = now() + plan.trial_days`
   - `amount` = سعر الباقة (للعرض فقط؛ لا يُحصّل الآن)
   - `payment_status='pending'`، `auto_renew=true`

إذا دخل المستخدم بدون اختيار باقة من قبل (دخول مباشر إلى /auth)، يُحوَّل بعد التسجيل إلى `/pricing?intent=trial` بدل `/app`.

---

## 2) سياسة انتهاء التجربة (Graduated Lifecycle)

نتدرّج في تقييد الحساب بدل الإيقاف الفوري، لمنح فرص متعددة للتحويل:

| اليوم نسبةً لـ `trial_end_at` | الحالة (`status`) | تجربة المستخدم |
|---|---|---|
| T-3 إلى T-1 | `trial` | بانر أصفر + إيميل: "تنتهي تجربتك خلال X أيام — فعّل اشتراكك" |
| T+0 يوم الانتهاء | `trial_ended` | بانر أحمر + إيميل + إشعار داخل التطبيق |
| T+1 إلى T+7 (Grace) | `grace` | **القراءة فقط** — يمكن تصفح كل البيانات، لا يمكن إنشاء/تعديل/تصدير. مودال اشتراك يظهر عند أي محاولة كتابة |
| T+8 إلى T+30 (Restricted) | `restricted` | الدخول يُحوّل مباشرة إلى `/app/billing` فقط. بقية المسارات محجوبة. البيانات محفوظة |
| T+31 وما بعد (Dormant) | `dormant` | الحساب موجود، البيانات محفوظة 90 يومًا إضافية، تسجيل الدخول يعرض شاشة "أعد التفعيل" |
| بعد 120 يومًا من T+0 بدون اشتراك | حذف ناعم اختياري (يدوي من Admin) | — |

عند إتمام الدفع (Paylink callback) في أي مرحلة: `status='active'`، تُستعاد كل الصلاحيات فورًا.

---

## 3) الواجهة داخل التطبيق

- **مكوّن `TrialStatusBanner`** يظهر في أعلى `AppShell` طوال فترة التجربة وبعدها:
  - تجربة نشطة: "تبقى X يومًا في تجربتك — [فعّل اشتراكك]"
  - grace: "انتهت تجربتك. حسابك للقراءة فقط — [اشترك الآن]"
  - restricted: لا يظهر بانر، فقط شاشة Paywall كاملة
- **`useTrialStatus` hook** يحسب الحالة الفعلية من `trial_end_at` و `status` ويعيد `{ status, daysLeft, canWrite, canRead }`.
- **حارس كتابة**: غلاف بسيط حول mutations المهمة (employees/structures/...) يرفع `toast` ويفتح مودال الاشتراك إذا `!canWrite`.
- **حارس مسار**: في `src/routes/app.tsx` بعد فحص الـ session، إذا `status='restricted'` نُحوّل لـ `/app/billing` (باستثناء `/app/billing` و `/app/help`).

---

## 4) الأتمتة (Server-side)

- **cron يومي** (pg_cron + pg_net يستدعي endpoint عام)، الساعة 02:00:
  - يحدّث `subscriptions.status` بناءً على `trial_end_at` (trial → trial_ended → grace → restricted → dormant).
  - يصدر إيميلات: T-3, T-1, T+0, T+7, T+14.
- Endpoint: `src/routes/api/public/cron/trial-lifecycle.ts` محمي بـ `apikey` header.
- قوالب الإيميل تُضاف إلى `email_templates` الموجودة.

---

## 5) صفحة الفوترة `/app/billing`

- تُظهر بشكل بارز: الحالة الحالية، تاريخ الانتهاء، الباقة الحالية، زر **"فعّل الاشتراك الآن"** يفتح Paylink checkout بنفس الباقة والدورة.
- خيار تغيير الباقة/الدورة قبل الدفع.

---

## 6) تغييرات قاعدة البيانات (migration واحدة)

```sql
-- توسيع حالات subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS grace_end_at timestamptz,
  ADD COLUMN IF NOT EXISTS restricted_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_trial_email_at timestamptz;

-- دالة للتحقق من صلاحية الكتابة
CREATE OR REPLACE FUNCTION public.org_can_write(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE organization_id = _org
      AND status IN ('trial','active','grace_read_only'  -- grace = read only, لا تسمح بالكتابة
                    ) AND status <> 'grace_read_only'
  );
$$;
```
(سنضيف فحص `org_can_write` داخل RLS policies الخاصة بـ INSERT/UPDATE/DELETE على الجداول التشغيلية لاحقًا — خارج نطاق هذه الجولة لتقليل المخاطر؛ نبدأ بحارس على مستوى الواجهة + server functions.)

---

## 7) خارج النطاق (لاحقًا)
- محاولة دفع تلقائية متعددة عند فشل التجديد.
- خصومات استرداد ("نسيتنا؟ خصم 20%").
- A/B test لمدة التجربة.

---

## ملف العمل

1. Migration: أعمدة جديدة + دالة `org_can_write`.
2. `src/lib/trial.functions.ts` — `startTrial`, `getTrialStatus`.
3. تعديل `src/routes/pricing.tsx` — زر "جرّبه مجانًا" + تمرير الباقة.
4. تعديل `src/routes/auth.tsx` — استدعاء `startTrial` بعد التسجيل.
5. `src/lib/use-trial-status.ts` + `src/components/trial-banner.tsx`.
6. تعديل `src/components/app-shell.tsx` لإضافة البانر.
7. تعديل `src/routes/app.tsx` لحارس `restricted`.
8. تحديث `src/routes/app.billing.tsx` لإبراز التفعيل.
9. `src/routes/api/public/cron/trial-lifecycle.ts` + جدولة pg_cron.
10. قوالب إيميل التذكير + ترجمات ar/en.
