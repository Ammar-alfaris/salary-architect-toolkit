## نظرة عامة

سنقوم بتفعيل **Paddle (Seamless Payments by Paddle)** كمزود دفع لتطبيق Total Reward، وربطه بالباقات الموجودة في لوحة تحكم الأدمن، وإعادة تصميم صفحة التسعير لتعكس قرارك بتوحيد المزايا.

> ملاحظة مهمة: فحص الأهلية الآلي لـ Paddle رفض حالياً بسبب وجود ميزتي **CV Analysis** و **Merit AI recommendations** (مصنّفتان ضمن "AI في التوظيف وإدارة العاملين"). بناءً على اختيارك، سنقوم بإزالة هاتين الميزتين قبل تفعيل Paddle. إن لم نتمكن من اجتياز الفحص بعد الإزالة، سأبلغك للنقاش قبل المتابعة.

---

## الخطة

### 1. إزالة ميزات AI غير المؤهلة

- حذف صفحة `src/routes/app.assistant.tsx` ودالة `src/lib/assistant.functions.ts`.
- إزالة رابط "AI Assistant" من `src/components/app-shell.tsx` ومفاتيح الترجمة المرتبطة.
- إزالة منطق توصيات الزيادة المبنية على AI من `src/routes/app.merit.tsx` (الإبقاء على مصفوفة merit التقليدية بدون توليد AI). يبقى merit cycle يدوياً قائماً على مصفوفة الأداء × compa-ratio لكن بدون استدعاء نموذج لغوي.
- تنظيف `routeTree.gen.ts` تلقائياً عبر vite plugin.

### 2. إعادة تشغيل فحص الأهلية وتفعيل Paddle

- استدعاء `recommend_payment_provider` مجدداً للتحقق من اجتياز الفحص.
- إذا نجح: استدعاء `enable_paddle_payments` لإنشاء بيئة sandbox تلقائياً.
- المستخدم لا يحتاج لإنشاء حساب Paddle خارجي — الإعداد كامل عبر Lovable.

### 3. ربط الباقات بـ Paddle (مزامنة المنتجات)

- استخدام أداة `batch_create_product` لإنشاء 4 منتجات في Paddle مطابقة للباقات الموجودة في جدول `plans`:
  - Starter — 199$/شهر، 1999$/سنة
  - Growth — 299$/شهر، 2999$/سنة
  - Professional — 499$/شهر، 4999$/سنة (recommended)
  - Enterprise — 999$/شهر، 9999$/سنة
- إضافة عمودين جديدين على جدول `plans`: `paddle_monthly_price_id` و `paddle_annual_price_id` لحفظ المعرفات الراجعة من Paddle.
- تحديث صفحة الأدمن `src/routes/admin.plans.tsx` لعرض هذه الحقول للقراءة فقط (تظهر فقط بعد التزامن).

### 4. توحيد المزايا في قاعدة البيانات

- migration لتحديث حقل `features` في جميع الباقات الأربع ليكون متطابقاً 100% ويحوي المزايا المتوفّرة فعلياً في التطبيق فقط:
  - `salary_structures`, `matrix`, `bonus`, `merit`, `allowances`, `registry` (employees)
  - `approvals` (سلاسل الموافقات)
  - `reports`, `analytics` (compa/equity/penetration)
  - `ar_support` (دعم العربية الكامل)
  - `audit_log`
  - `multi_admin`
- حذف ميزة `api` من النموذج بالكامل (غير مقدّمة).
- إضافة عمودين جديدين على `plans` للتفرقة:
  - `support_tier` enum: `email` | `priority` | `dedicated`
  - `onboarding_type` enum: `self_serve` | `guided` | `custom`
- تعبئة القيم:

  | الباقة       | المستخدمون | الموظفون | الدعم     | الإعداد    |
  | ------------ | ---------- | -------- | --------- | ---------- |
  | Starter      | 3          | 50       | email     | self_serve |
  | Growth       | 5          | 100      | email     | guided     |
  | Professional | 10         | 300      | priority  | guided     |
  | Enterprise   | 15         | 800      | dedicated | custom     |


### 5. إعادة تصميم صفحة التسعير `/pricing`

بدلاً من 4 أعمدة كل منها يكرر نفس قائمة المزايا، سيكون التصميم:

```text
┌─────────────────────────────────────────────────────┐
│  All plans include every feature                    │
│  ✓ Salary structures   ✓ Bonus cycles   ✓ Merit    │
│  ✓ Approvals  ✓ Analytics  ✓ Arabic  ✓ Audit log   │
└─────────────────────────────────────────────────────┘

┌──────────┬──────────┬──────────────┬────────────┐
│ Starter  │ Growth   │ Professional │ Enterprise │
│ $199/mo  │ $299/mo  │ $499/mo ★    │ $999/mo    │
│          │          │              │            │
│ 3 users  │ 5 users  │ 10 users     │ 15 users   │
│ 50 emp.  │ 100 emp. │ 300 emp.     │ 800 emp.   │
│ Email    │ Email    │ Priority     │ Dedicated  │
│ Self     │ Guided   │ Guided       │ Custom     │
│          │          │              │            │
│ [Start]  │ [Start]  │ [Start]      │ [Contact]  │
└──────────┴──────────┴──────────────┴────────────┘
```

- شريط علوي "All plans include every feature" مع شبكة أيقونات للمزايا (مرة واحدة فقط).
- بطاقات الباقات تركّز فقط على: السعر، المستخدمون، الموظفون، مستوى الدعم، نوع الإعداد، زر CTA.
- تبديل شهري/سنوي مع شارة الادخار.
- بطاقة Enterprise بزر "Contact sales" بدل checkout مباشر (اختياري بحسب رغبتك).
- FAQ موجود يبقى كما هو مع تحديث الأسئلة.

### 6. تدفّق الشراء والاشتراك

- صفحة جديدة `src/routes/app.billing.tsx` (داخل التطبيق بعد تسجيل الدخول) تعرض:
  - الاشتراك الحالي والباقة وعدد المقاعد المستخدمة/المتاحة.
  - زر "Change plan" و "Cancel subscription".
- زر "Start trial / Subscribe" في `/pricing` يستدعي `create_checkout_session` من Paddle ويحوّل المستخدم لصفحة Paddle hosted checkout.
- بعد العودة، صفحة `src/routes/billing.success.tsx` تؤكد الاشتراك.

### 7. Webhooks ومزامنة الحالة

- ملف server route عام: `src/routes/api/public/paddle-webhook.ts`:
  - التحقق من توقيع Paddle (`paddle-signature` header).
  - معالجة `subscription.activated`, `subscription.updated`, `subscription.canceled`, `transaction.completed`.
  - تحديث جدول `subscriptions` (موجود حالياً) بالحقول: `plan_id`, `status`, `billing_cycle`, `amount`, `renewal_at`, `payment_status`.
- إضافة حقول جديدة لجدول `subscriptions`: `paddle_subscription_id`, `paddle_customer_id`.

### 8. فرض حدود الباقة (Quota enforcement)

- helper جديد `src/lib/quota.ts` يعيد للمؤسسة الباقة الحالية وعدد المقاعد/الموظفين المستخدمين.
- حظر إضافة مستخدم/موظف جديد عند تجاوز الحد، مع toast واضح ورابط لترقية الباقة.
- نقاط الفرض: `src/routes/app.team.tsx` (دعوة مستخدم)، `src/routes/app.employees.tsx` (إضافة موظف).

### 9. الترجمة

- تحديث `src/lib/i18n/en.ts` و `ar.ts` بمفاتيح:
  - شريط "All features in every plan"
  - تسميات `support_tier` و `onboarding_type`
  - رسائل تجاوز الحد
  - صفحة الفوترة

---

## اقتراحات إضافية لتفرقة الباقات (للنقاش)

بناءً على اختيارك لمستوى الدعم والإعداد المخصص، إليك عوامل تفرقة إضافية اختيارية يمكن إضافتها لاحقاً لتقوية تدرّج الباقات بدون كسر مبدأ "نفس المزايا":

1. **عدد سلاسل الموافقة المخصّصة (Approval chains)**: مثلاً Starter=1, Growth=3, Pro=10, Enterprise=∞.
2. **مدة الاحتفاظ بسجلات Audit**: 3 / 6 / 12 / 24 شهراً.
3. **تكرار التصدير لإكسل**: حد شهري في Starter، غير محدود في الباقات الأعلى.
4. **SSO / SAML**: Enterprise فقط.
5. **اتفاقية SLA رسمية**: Pro/Enterprise فقط.
6. **بيئة Sandbox/Test منفصلة**: Enterprise فقط.

أخبرني أيها تريد ضمّها الآن لتدخل ضمن التنفيذ، أو نتركها لمرحلة لاحقة.

---

## تفاصيل تقنية (للمراجعة)

- **Provider**: Paddle (merchant of record) — رسوم 5% + 50¢ لكل معاملة، شاملة ضرائب VAT/Sales tax وdisputes.
- **Schema changes**: migration واحدة تضيف الأعمدة الجديدة وتحدّث features وتعبّئ support_tier/onboarding_type.
- **RLS**: تحديث سياسات `subscriptions` لتسمح فقط لأعضاء المؤسسة بالقراءة، والـ service_role بالكتابة من الـ webhook.
- **Server functions**: `createCheckoutSession`, `getCurrentSubscription`, `cancelSubscription` تحت `src/lib/billing.functions.ts` مع `requireSupabaseAuth`.
- **Webhook URL** بعد النشر: `https://project--2acbe2f2-b7be-4735-8fa4-d80fac74d23c.lovable.app/api/public/paddle-webhook`.

---

## ما لن نعمله الآن

- لن نعدّل صفحة `admin.subscriptions.tsx` (تبقى بنفس وظيفتها مع البيانات الجديدة القادمة من Paddle).
- لن نضيف دفع لمرّة واحدة (one-time) — اشتراكات فقط.
- لن نضيف paddle live mode (سيبقى sandbox حتى تكمل التحقق من Paddle لاحقاً).

هل أبدأ التنفيذ؟

اجعل العملة الريال السعودي ولا توضح بأن التواصل عن طريق الايميل اة غيره فقط ضع اولوية للتواصل والانبوردينق المتقدم للباقات المتقدمة