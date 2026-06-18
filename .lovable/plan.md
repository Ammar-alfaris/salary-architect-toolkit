
# تكامل Paylink آمن وجاهز للإنتاج

## 1) الأسرار (Secrets)
سأطلب إضافة المتغيرات التالية عبر أداة الأسرار (تُحفظ في backend فقط، لا تُكشف للواجهة):
- `PAYLINK_BASE_URL` — مثال: `https://restpilot.paylink.sa` (test) أو `https://restapi.paylink.sa` (prod)
- `PAYLINK_API_ID`
- `PAYLINK_SECRET_KEY`
- `APP_BASE_URL` — مثال: `https://totalreward.app`

(لا حاجة لـ `PAYLINK_MERCHANT_ID` في Flow A.)

## 2) قاعدة البيانات — جدول `orders` جديد (migration)

أعمدة:
- `user_id` (FK → auth.users)
- `product_key` (نص: pricing plan أو منتج)
- `amount` (numeric)
- `currency` (default 'SAR')
- `customer_name`, `customer_phone`, `customer_email`
- `items` (jsonb)
- `status` (enum: `pending` | `paid` | `failed` | `cancelled`)
- `paylink_transaction_no`, `paylink_invoice_id`, `paylink_payment_url`
- `paid_amount`, `paid_at`
- `raw_create_response` jsonb, `raw_verify_response` jsonb
- timestamps + trigger `updated_at`

السياسات (RLS):
- `authenticated`: SELECT/INSERT الخاصة بـ `auth.uid() = user_id`
- التحديث يقتصر على `service_role` (server functions فقط)
- `GRANT SELECT, INSERT ON public.orders TO authenticated; GRANT ALL ON public.orders TO service_role;`

## 3) طبقة الخدمة `src/lib/paylink.server.ts`

تعليق توضيحي في أعلى الملف يؤكد أن تأكيد الدفع يجب أن يعتمد فقط على verify endpoint من السيرفر وليس query params من الـ callback.

دوال:
- `authenticate()` → POST `${BASE}/api/auth` بـ `{ apiId, secretKey, persistToken: false }` ⇒ يعيد `id_token`
- `addInvoice({ amount, callBackUrl, clientName, clientMobile, orderNumber, products })` → POST `${BASE}/api/addInvoice` بـ `Authorization: Bearer <token>` ⇒ يعيد `{ transactionNo, url, ... }`
- `getInvoice(transactionNo)` → GET `${BASE}/api/getInvoice/{transactionNo}` ⇒ يعيد حالة الفاتورة + `orderStatus` + `amount`

TypeScript types:
- `PaylinkAuthResponse`, `PaylinkAddInvoiceResponse`, `PaylinkGetInvoiceResponse`, `PaylinkVerifyResult`

كل دالة داخل try/catch مع logging منظّم: `orderId`, `transactionNo`, `status`, `httpStatus` — بدون طباعة `secretKey` أو `id_token`.

## 4) Server functions (TanStack `createServerFn`)

ملف `src/lib/paylink.functions.ts`:

### `createPaylinkInvoice`
- middleware: `requireSupabaseAuth`
- input (zod): `{ productKey, customerName, customerPhone, customerEmail?, amount, items: [{title, price, qty}] }`
- منطق:
  1. أنشئ صفًا في `orders` بحالة `pending` (يحصل على `id` = orderId)
  2. `callBackUrl = ${APP_BASE_URL}/payment/paylink/callback?orderId=${orderId}`
  3. `authenticate()` → `addInvoice(...)`
  4. خزّن `paylink_transaction_no`, `paylink_invoice_id`, `paylink_payment_url`, `raw_create_response`
  5. إذا لم يرجع `url` → throw مع رسالة واضحة
- يعيد: `{ success, orderId, transactionNumber, paymentUrl }`

### `verifyPaylinkPayment`
- middleware: `requireSupabaseAuth`
- input: `{ orderId }` (يحضر transactionNo من DB ليمنع spoofing)
- منطق:
  1. اقرأ الطلب من DB (يجب أن يكون ملك المستخدم)
  2. `getInvoice(transactionNo)`
  3. حدّث `status` (Paid ⇒ `paid`، غير ذلك ⇒ `failed`/`pending`)، `paid_amount`, `paid_at`, `raw_verify_response`
- يعيد: `{ paymentStatus, paidAmount, orderStatus, invoice }`

## 5) صفحات الواجهة

### `src/routes/_authenticated/checkout.tsx`
- يقرأ `?product=<key>&amount=<x>` من query
- نموذج: اسم + جوال + (إيميل)
- زر "ادفع الآن" يستدعي `createPaylinkInvoice` ثم `window.location.href = paymentUrl`
- معالجة أخطاء واضحة + حالة تحميل

### `src/routes/payment.paylink.callback.tsx` (عام، يدخله المستخدم بعد الرجوع)
- يقرأ `orderId` من query
- يستدعي `verifyPaylinkPayment({ orderId })` عبر `useServerFn` داخل `useQuery`
- يعرض:
  - paid → ✓ نجاح الدفع + رقم الطلب + المبلغ
  - failed/cancelled → ✗ فشل + زر إعادة المحاولة → `/checkout`
  - pending → "جارٍ التأكيد..." مع زر إعادة فحص

## 6) معالجة الأخطاء واللوجز
- كل استدعاء HTTP داخل try/catch، يرمي Error بـ status + body مختصر
- `console.error` بـ JSON منظم: `{ scope: 'paylink', step, orderId, transactionNo, status, message }`
- لا تُطبع أبداً: `PAYLINK_SECRET_KEY`, `id_token`, full headers

## 7) Flow B
سيُترك كـ TODO معلّق في `paylink.server.ts` (تعليق فقط) — حسب اختيارك Flow A فقط الآن. سهل الإضافة لاحقاً بـ config flag بدون تغيير الـ API الخارجي.

## ملفات سيتم إنشاؤها/تعديلها
- migration: جدول `orders` + enum + RLS + grants + trigger
- جديد: `src/lib/paylink.server.ts`
- جديد: `src/lib/paylink.functions.ts`
- جديد: `src/routes/_authenticated/checkout.tsx`
- جديد: `src/routes/payment.paylink.callback.tsx`
- تحديث: زر "اشترك/ادفع" في `src/routes/pricing.tsx` ليوجّه إلى `/checkout?product=...&amount=...`

## ملاحظات تقنية
- `_authenticated/checkout` لأن إنشاء الفاتورة يتطلب مستخدم مسجل (لربط الطلب بـ user_id ومنع abuse)
- صفحة الـ callback عامة (المستخدم قد يرجع في نافذة جديدة) لكن `verifyPaylinkPayment` نفسها محمية بـ `requireSupabaseAuth` ⇒ تُستدعى من component وليس loader
- جميع قراءات `process.env.*` داخل `.handler()` فقط
- لا توجد أي قيمة Paylink في الكود؛ كلها من env

بعد موافقتك سأطلب إضافة الأسرار ثم أُنشئ الـ migration ثم بقية الملفات.
