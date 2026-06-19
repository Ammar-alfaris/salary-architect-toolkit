## الهدف
1. إزالة Paddle بالكامل كبوابة دفع — Paylink هي البوابة الوحيدة.
2. إضافة مفتاح تبديل في لوحة Super Admin بين بيئتي Paylink: **Test** و **Production**، حتى تختبر الدفع أولاً ثم تُطلق البيئة الحقيقية بضغطة زر دون أي تغيير في الكود.

---

## 1) إزالة Paddle

### ملفات تُحذف
- `src/lib/paddle.ts`
- `src/lib/paddle.server.ts`
- `src/lib/billing.functions.ts` (يعتمد بالكامل على Paddle API — سيُستبدل بدوال خفيفة تقرأ من `subscriptions`)
- `src/lib/payments.functions.ts` (resolver لأسعار Paddle)
- `src/routes/api/public/payments/webhook.ts` (webhook Paddle)
- `src/components/PaymentTestModeBanner.tsx` ← يُعاد كتابته ليقرأ من إعداد Paylink الجديد بدل التوكن

### ملفات تُعدَّل لإزالة استيرادات Paddle والـUI المرتبطة
- `src/routes/pricing.tsx` — حذف زر/مسار Paddle Checkout، الإبقاء فقط على تدفّق Paylink (`/checkout`).
- `src/routes/trust.tsx` — حذف ذكر Paddle.
- `src/routes/auth.tsx` — إزالة أي تتبع Paddle.
- `src/routes/app.billing.tsx`:
  - استبدال `getCurrentSubscription` (Paddle) بدالة `getCurrentSubscription` جديدة تقرأ مباشرة من جدول `subscriptions` + `plans` عبر `requireSupabaseAuth`.
  - حذف `getCustomerPortalUrl` وزر "Cancel via portal"، وإحلال زر إلغاء يحدّث `cancel_at_period_end=true` محليًا.
  - حذف `getPaddleEnvironment` واستبداله بـ `usePaymentEnvironment()` (هوك جديد).
- `.env.development` و `.env.production` — حذف `VITE_PAYMENTS_CLIENT_TOKEN*` (متعلقة بـ Paddle.js).

### تنظيف قاعدة البيانات
- لن نُسقط الجدول `subscriptions` ولا الأعمدة (`paddle_subscription_id` ستبقى لأنها بالفعل تُستخدم لتخزين معرّف Paylink بشكل عام، أو نتركها فارغة).
- لا migration حذف ضروري — فقط نوقف استخدام webhook Paddle.

---

## 2) مفتاح تبديل بيئة Paylink (Test ↔ Production)

### مفهوم
- Paylink يميّز البيئة عبر `apiId` + `secretKey` + `baseUrl` المختلفة بين Test و Live.
- نخزّن **زوجَين** من المفاتيح كأسرار في الباك إند، وننشئ علم `payment_mode` في `admin_settings` يتحكم في أي زوج يُستخدم وقت التشغيل.

### Migration جديدة
```sql
ALTER TABLE public.admin_settings
  ADD COLUMN payment_mode text NOT NULL DEFAULT 'test'
    CHECK (payment_mode IN ('test','live'));

-- دالة عامة آمنة لقراءة الوضع (للهوك الأمامي + للسيرفر)
CREATE OR REPLACE FUNCTION public.get_payment_mode()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT payment_mode FROM public.admin_settings LIMIT 1), 'test');
$$;
GRANT EXECUTE ON FUNCTION public.get_payment_mode() TO anon, authenticated;
```

### الأسرار المطلوبة (عبر `add_secret`)
- `PAYLINK_TEST_BASE_URL`, `PAYLINK_TEST_API_ID`, `PAYLINK_TEST_SECRET_KEY`
- `PAYLINK_LIVE_BASE_URL`, `PAYLINK_LIVE_API_ID`, `PAYLINK_LIVE_SECRET_KEY`

(القيم الحالية `PAYLINK_BASE_URL/…` ستُهجَّر إلى مفاتيح `_TEST_` ثم يُطلب من المستخدم إدخال مفاتيح `_LIVE_` عبر `add_secret` قبل التبديل إلى Production.)

### تعديل `src/lib/paylink.server.ts`
```ts
function getConfig(mode: 'test' | 'live') {
  const prefix = mode === 'live' ? 'PAYLINK_LIVE_' : 'PAYLINK_TEST_';
  const baseUrl = process.env[`${prefix}BASE_URL`];
  const apiId   = process.env[`${prefix}API_ID`];
  const secret  = process.env[`${prefix}SECRET_KEY`];
  if (!baseUrl || !apiId || !secret) throw new Error(`Paylink ${mode} not configured`);
  return { baseUrl: baseUrl.replace(/\/$/, ''), apiId, secretKey: secret };
}
```
- كل الدوال (`authenticate`, `addInvoice`, `getInvoice`) تأخذ `mode` كباراميتر أول.

### تعديل `src/lib/paylink.functions.ts`
- في بداية كل serverFn يُقرأ الوضع من DB:
  ```ts
  const { data: mode } = await supabaseAdmin.rpc('get_payment_mode');
  ```
- يُمرَّر إلى `authenticate(mode)` و `addInvoice(mode, …)`.
- يُخزَّن `environment` على صف `orders` (`'sandbox' | 'live'`) ليُربط الطلب ببيئته (مفيد للتقارير ولتجنّب الخلط بعد التحوّل).

### serverFn جديد: `src/lib/payment-mode.functions.ts`
```ts
export const getPaymentMode = createServerFn({ method: 'GET' }).handler(async () => {
  // public — يستخدم publishable client (rpc public.get_payment_mode)
});

export const setPaymentMode = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { mode: 'test'|'live' }) => d)
  .handler(async ({ data, context }) => {
    // تحقق أن المستخدم super_admin، ثم UPDATE admin_settings
  });
```

### الهوك الأمامي
`src/hooks/use-payment-mode.ts` — يستدعي `getPaymentMode` ويحفظه في React Query (staleTime: 5 د).

### UI في لوحة Super Admin
- في `src/routes/admin.settings.tsx` نضيف قسم **"Payment Environment"** يحتوي:
  - Toggle/RadioGroup: `Test` ↔ `Live`.
  - Badge أحمر تحذيري عند `Live`: "البيئة الحقيقية مفعّلة — سيتم خصم مبالغ فعلية".
  - زر "Save" يستدعي `setPaymentMode`.
  - شرط ظهور القسم: `is_super_admin` فقط.

### `PaymentTestModeBanner` الجديد
- يقرأ من `useQuery(getPaymentMode)`.
- يظهر فقط عند `mode === 'test'` بنص: "وضع الدفع التجريبي مفعّل — استخدم بطاقات الاختبار من Paylink."
- يظهر للمستخدمين النهائيين أيضًا في صفحة `/checkout` و `/app/billing` ليعرفوا أن العمليات تجريبية.

---

## 3) تبسيط Billing بعد إزالة Paddle

ملف `src/lib/billing.functions.ts` (يُعاد إنشاؤه مختصرًا):
- `getCurrentSubscription({ organizationId })`: SELECT من `subscriptions` JOIN `plans`.
- `cancelSubscriptionAtPeriodEnd({ subscriptionId })`: UPDATE محلي.
- لا حاجة لـ `getCustomerPortalUrl`.

`app.billing.tsx`:
- يحذف زر "Open portal" ويستبدله بزر "إلغاء عند نهاية الفترة" يعمل عبر RPC الداخلي.
- يحذف `getPaddleEnvironment()` ويستخدم `usePaymentMode()`.

---

## 4) خطوات التنفيذ بالترتيب
1. تشغيل Migration: إضافة `payment_mode` + دالة `get_payment_mode()`.
2. طلب الأسرار الجديدة عبر `add_secret` لـ Test و Live.
3. تعديل `paylink.server.ts` و `paylink.functions.ts` لقبول الوضع.
4. إنشاء `payment-mode.functions.ts` + الهوك.
5. تعديل `admin.settings.tsx` لإضافة Toggle البيئة.
6. تعديل `PaymentTestModeBanner` ليعتمد على الوضع الجديد.
7. إعادة كتابة `billing.functions.ts` بدون Paddle.
8. تنظيف Paddle: حذف الملفات وإزالة الاستيرادات من `pricing.tsx` / `trust.tsx` / `auth.tsx` / `app.billing.tsx` / `payments/webhook.ts` / `.env.*`.
9. تحديث ترجمات `ar.ts` / `en.ts` بالنصوص الجديدة (Banner، Toggle، تحذير Live).

---

## النتيجة النهائية
- Paddle مُزال كليًا من الواجهة والكود وقاعدة البيانات.
- Super Admin يجد في `/admin/settings` قسم "Payment Environment" بمفتاح Test/Live.
- التبديل لـ Live يأخذ تأثيره فورًا على كل طلبات Paylink الجديدة دون إعادة نشر.
- بانر "وضع تجريبي" يظهر للجميع طوال فترة الاختبار، ويختفي تلقائيًا عند التحويل لـ Production.
