# الأولوية #2 — نظام Dunning + توسيع سجل التدقيق

## الهدف
1. **Dunning**: عند فشل خصم التجديد التلقائي، نُجري محاولات ذكية متعددة مع إشعارات تصاعدية بدلاً من إيقاف الاشتراك فوراً.
2. **Audit Log موسّع**: تسجيل أحداث الفوترة والأمان والصلاحيات (وليس فقط أحداث المنتج) مع IP و user-agent.

---

## 1) نظام Dunning للمدفوعات الفاشلة

### السلوك (دورة 14 يوماً)
- **يوم 0**: فشل أول محاولة خصم → بريد `payment_failed` + حالة `past_due`.
- **يوم +1**: محاولة تلقائية #2 + بريد تذكير ودّي.
- **يوم +3**: محاولة تلقائية #3 + تحذير "بطاقتك بحاجة للتحديث".
- **يوم +7**: محاولة أخيرة + بريد عاجل "آخر إنذار".
- **يوم +14**: إذا لم تنجح → الاشتراك → `restricted` (قراءة فقط) + بريد إشعار بالإيقاف.
- **نجاح أي محاولة** → إلغاء سلسلة Dunning، تفعيل، بريد "تم الاستئناف".

### التغييرات على قاعدة البيانات (migration)
على جدول `subscriptions`:
- `dunning_status` text: `none | past_due | recovering | suspended`
- `dunning_started_at`, `dunning_next_retry_at`, `dunning_recovered_at` (timestamptz)
- `dunning_attempts` int default 0
- `dunning_last_error` text

على جدول `audit_logs` (لدعم تتبع الأمان):
- `ip_address` inet
- `user_agent` text
- توسيع نوع `action` و `entity_type` (نص حر — لا CHECK).

### الكود
- **`src/lib/dunning.server.ts`** (جديد): دوال `attemptRenewalCharge()` / `scheduleNextRetry()` / `markRecovered()` / `markSuspended()`. تستخدم Paylink recurring charge API بـ `card_token` المخزّن في `payment_methods`.
- **`src/routes/api/public/cron/billing-engine.ts`** (جديد): يومياً 02:00 UTC — يفحص:
  1. اشتراكات `active` + `renewal_at <= now()` + `auto_renew=true` + `cancel_at_period_end=false` → يحاول الخصم.
  2. اشتراكات `dunning_status='past_due'` + `dunning_next_retry_at <= now()` → يعيد المحاولة.
  3. اشتراكات `dunning_status='past_due'` + بدأت قبل 14+ يوماً → تعليق.
- **`src/lib/notify.server.ts`**: إضافة `sendDunningRetryEmail()` (3 مراحل) + `sendSubscriptionSuspendedEmail()` + `sendPaymentRecoveredEmail()`.
- **`src/lib/billing.functions.ts`**: إضافة `retryFailedPaymentNow()` (زر يدوي في صفحة الفوترة).

### واجهة المستخدم
- **`src/routes/app.billing.index.tsx`**: لافتة حمراء عند `dunning_status='past_due'` تعرض المحاولات السابقة + زر "حدّث البطاقة" + زر "إعادة المحاولة الآن".
- **`src/routes/admin.subscriptions.tsx`**: عمود `Dunning` يبيّن للمشرف الاشتراكات المتعثّرة.

---

## 2) توسيع Audit Log

### أحداث جديدة تُسجَّل
- **فوترة**: `subscription.created`, `subscription.activated`, `subscription.cancelled`, `subscription.renewed`, `payment.succeeded`, `payment.failed`, `dunning.started`, `dunning.retry`, `dunning.recovered`, `dunning.suspended`.
- **أمان/صلاحيات**: `auth.login`, `auth.logout`, `auth.password_changed`, `role.granted`, `role.revoked`, `invitation.sent`, `invitation.accepted`.

### الكود
- **`src/lib/audit.server.ts`** (جديد): `logAuditServer({ orgId, actorId, action, entityType, ..., ip, userAgent })`. يستخدم `supabaseAdmin` ويُستدعى من server functions و cron.
- **`src/lib/audit.ts`** (الحالي): توسيع أنواع `AuditAction` و `AuditEntity`.
- ربط النداءات في:
  - `paylink-process.server.ts` (نجاح/فشل دفع).
  - `dunning.server.ts` (كل تحوّل حالة).
  - `billing.functions.ts` (إلغاء).
  - `src/lib/auth.tsx` (تسجيل الدخول/الخروج).
  - `invitations.functions.ts` (دعوات).

### واجهة المستخدم
- **`src/routes/app.audit.tsx`**: 
  - إضافة فلاتر للأنواع الجديدة (billing, security).
  - إظهار IP في صف موسّع عند الضغط.
  - تلوين خاص لأحداث Dunning والأمان.
- **`src/routes/admin.audit.tsx`**: نفس التحسينات على المستوى الإداري.

---

## ملاحظات تقنية

- **Paylink recurring charging**: يستخدم `card_token` المحفوظ في `payment_methods`. سنطلب الـ token الموجود حالياً عبر API نفسه (`/api/v2/payInvoice` بـ `cardToken`). إن لم يتوفر token، نُعلّم الاشتراك مباشرة `past_due` ونرسل بريد "حدّث بطاقتك" دون محاولات.
- **التزامن (Idempotency)**: كل محاولة خصم تنشئ سجل order مستقل بـ `idempotency_key = sub_id-attempt_n` لتجنّب الخصم المزدوج عند إعادة تشغيل الـ cron.
- **حماية الـ cron**: نفس نمط `lifecycle-notices.ts` (`apikey` header = `SUPABASE_PUBLISHABLE_KEY`).
- **i18n**: مفاتيح جديدة عربي/إنجليزي لكل البانرات والأزرار.

---

## ترتيب التنفيذ
1. Migration (أعمدة Dunning + Audit).
2. `dunning.server.ts` + إضافات `notify.server.ts`.
3. cron `billing-engine.ts` + جدولته (pg_cron, 02:00 UTC).
4. `audit.server.ts` + ربط النداءات.
5. تحديثات UI (فوترة، تدقيق، إدارة).
6. مفاتيح i18n.

هل تريد البدء بتنفيذ الخطة كاملة، أم نبدأ بـ Dunning أولاً ثم Audit في خطوة لاحقة؟
