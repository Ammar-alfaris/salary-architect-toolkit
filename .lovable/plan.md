
## الهدف
بعد نجاح أي دفعة عبر Paylink (بطاقة أو Apple Pay) يجب أن تتحول صفحة `Billing` فورًا إلى وضع "اشتراك نشط"، يختفي بنر "الفترة التجريبية"، يحفظ التطبيق الفاتورة، يولّد PDF رسمي بهوية الموقع، يرسلها للعميل بالبريد مع رابط آمن للتحميل، ويسجّل تاريخ الدفع التالي للتجديد الشهري الآلي.

## ما المشكلة الحالية
- `verifyPaylinkPayment` يحدّث جدول `orders` فقط ولا يلمس `subscriptions`، لذلك تبقى الباقة في حالة `trial` وتظهر كل عناصر التجربة.
- لا يوجد ربط بين الطلب والمؤسسة، ولا توجد فاتورة، ولا بريد تأكيد، ولا صفحة فواتير، ولا منطق تجديد.

## نطاق العمل

### 1) Migration (ترقية قاعدة البيانات)
- إضافة أعمدة لـ `public.orders`:
  - `organization_id uuid` (مرجع `organizations`)
  - `subscription_id uuid` (مرجع `subscriptions`)
  - `plan_id uuid`، `billing_cycle text`
  - `invoice_number text UNIQUE` (نمط `INV-YYYY-00001`)
  - `invoice_issued_at timestamptz`
  - `vat_amount numeric(12,2) DEFAULT 0`، `subtotal_amount numeric(12,2)`
- إنشاء `public.payment_methods` (لحفظ بطاقة العميل من Paylink: token, brand, last4, exp_month/year, organization_id, is_default) مع RLS للأعضاء قراءة فقط و service_role للكتابة.
- دالة `next_invoice_number()` آمنة مع advisory lock.
- منح GRANTs لـ authenticated/service_role.
- منح `UPDATE` لـ service_role على `subscriptions` (موجود).

### 2) ربط الطلب بالاشتراك عند الإنشاء (`src/lib/paylink.functions.ts`)
- داخل `createPaylinkInvoice` نقرأ `organization_id` للمستخدم من `user_roles` + أحدث `subscription_id`/`plan_id`/`billing_cycle` ونخزّنها في `orders` لحظة الإنشاء، حتى يعرف الـ verify بأي اشتراك يربط الدفعة.
- نمرّر للـ Paylink الحقول التي تفعّل حفظ البطاقة لإعادة الخصم لاحقًا (`recurring: true` + علم لحفظ البطاقة) ضمن نفس طلب `addInvoice`.

### 3) تفعيل الاشتراك بعد التحقق (`verifyPaylinkPayment`)
عند `paymentStatus === "paid"` وعدم وجود تفعيل سابق لنفس الطلب:
1. توليد `invoice_number` وتحديث صف `orders` (issued_at، subtotal، VAT 15%، الإجمالي = paidAmount).
2. تحديث `subscriptions` للمؤسسة عبر `supabaseAdmin`:
   - `status='active'`، `payment_status='paid'`
   - `start_at=now`، `renewal_at = now + (شهر/سنة حسب billing_cycle)`
   - `trial_end_at` يبقى لكن `org_lifecycle_status` ستعيد `active` تلقائيًا (الدالة الموجودة).
3. حفظ بطاقة الدفع في `payment_methods` من حقول الاستجابة (إن وُجد cardBrand/last4/cardToken في `raw_verify_response`).
4. إدراج صف فاتورة في سجل `email_send_log` عبر استدعاء راوت إرسال البريد.
5. السلوك idempotent عبر التحقق من `invoice_number IS NULL`.

### 4) صفحة Billing (`src/routes/app.billing.tsx`)
- بعد التفعيل: تختفي بطاقة TrialStatusCard لأن `useTrialStatus` ترجع `active` (موجودة). نضيف `refetch` تلقائي عند الفتح + بعد العودة من الكولباك.
- بطاقة "Current plan" تعرض: اسم الباقة، الحالة (`active`)، دورة الفوترة، `renewal_at`، عدد المقاعد، **آخر بطاقة محفوظة** (Visa **** 4242) من `payment_methods`.
- قسم جديد "سجل الفواتير" يعرض جدول من `orders` للمؤسسة: رقم الفاتورة، التاريخ، المبلغ، الحالة، زر **تنزيل PDF** يفتح `/api/public/invoices/[orderId]?token=...`.
- زر "إلغاء الاشتراك" يضع `cancel_at_period_end=true` + يُبقي الوصول حتى `renewal_at`.

### 5) صفحة TrialBanner (`src/components/trial-banner.tsx`)
- لا تعديل منطقي مطلوب — تختفي تلقائيًا حين تصبح الحالة `active`. سنضمن استدعاء `trial.refetch()` بعد عودة `payment.paylink.callback` بنجاح حتى يختفي البنر فورًا دون انتظار إعادة تحميل.

### 6) توليد PDF الفاتورة (Worker-safe)
- مكتبة `pdf-lib` (متوافقة مع Cloudflare Worker — وفق `server-runtime`).
- ملف `src/lib/invoice-pdf.server.ts` يبني فاتورة A4 ببيانات:
  - **Total Reward App** — Riyadh, Saudi Arabia
  - رقم الفاتورة، تاريخ الإصدار، اسم العميل، البريد، الجوال
  - بنود الطلب، المجموع الفرعي، VAT 15%، الإجمالي بالـ SAR
  - شعار التطبيق (يُضمّن من `src/assets/logo.png` إن وجد، وإلا نص فقط)
  - تذييل: "شكراً لاستخدامك Total Reward".
- راوت عام موقّع بالـ HMAC: `src/routes/api/public/invoices.$orderId.ts` يقبل `?token=...` ويرجع PDF (`Content-Type: application/pdf`). التوقيع مولّد عبر `INVOICE_DOWNLOAD_SECRET` (سيُطلب من المستخدم عبر add_secret).
- داخل التطبيق نفسه (`/app/billing`) المستخدم المسجل يحمّل عبر serverFn `getInvoiceDownloadUrl({orderId})` التي تتحقق من ملكية الطلب ثم تُصدر رابطًا موقّتًا (HMAC + exp 10 دقائق).

### 7) بريد التأكيد (Lovable Emails)
- توجد بنية البريد جاهزة (`enqueue_email`, `email_send_log`, queue) لكن لا توجد templates للتطبيق.
- إنشاء قالب `src/lib/email-templates/payment-receipt.tsx` (React Email) بهوية Total Reward:
  - عنوان: "تم استلام دفعتك — Total Reward"
  - تفاصيل: اسم الباقة، الدورة، المبلغ، رقم الفاتورة، تاريخ الدفع، تاريخ التجديد القادم
  - زر CTA: **تحميل الفاتورة (PDF)** → الرابط الموقّع الصالح 30 يومًا
  - زر ثانوي: "إدارة الاشتراك" → `/app/billing`
- استخدام راوت `lovable/email/transactional/send` (سيتم توليده بـ `email_domain--scaffold_transactional_email` لأنه غير موجود)، ثم استدعاؤه من `verifyPaylinkPayment` بعد التفعيل مع `idempotencyKey = orderId`.

### 8) التجديد الشهري الآلي
- نسخدم Paylink Recurring Invoices: عند `paid` نخزّن `paylink_card_token` ضمن `payment_methods`.
- Cron يومي عبر pg_cron يستدعي راوت `/api/public/cron/billing-renewals` (موجود نمط مماثل لـ trial-lifecycle):
  - يبحث عن `subscriptions` بحالة `active` و `renewal_at <= now()` و `auto_renew=true`.
  - يُنشئ Paylink invoice جديدة مع `cardToken` المخزّن (auto-debit) ويُسجّل order جديد بنفس آلية verify.
  - عند الفشل: `payment_status='past_due'` + يرسل بريد تنبيه.
- ملاحظة: التنفيذ الفعلي للـ recurring مع Paylink يتطلب وجود `cardToken` في استجابة Paylink — إن لم يدعمه الحساب الحالي سنرسل تذكير بالبريد قبل 3 أيام للدفع اليدوي بدل الخصم التلقائي.

### 9) صفحة نتيجة الدفع (`src/routes/payment.paylink.callback.tsx`)
- بعد نجاح verify: زر "تنزيل الفاتورة" + زر "العودة للوحة التحكم".
- استدعاء `trial.refetch()` غير ممكن هنا — لكن سيتم تحديث الحالة بمجرد الانتقال إلى `/app/billing` لأننا نُجبر إعادة الجلب.

### 10) الترجمة (i18n)
- إضافة مفاتيح عربي/إنجليزي لكل النصوص الجديدة في `ar.ts` و `en.ts` (Billing الجديد، Invoice، Receipt email، Payment method on file).

## الملفات المتأثرة
- `supabase/migrations/<new>.sql` — جداول وأعمدة جديدة + دالة رقم الفاتورة.
- `src/lib/paylink.functions.ts` — ربط الطلب بالاشتراك + تفعيل + توليد فاتورة + إرسال بريد.
- `src/lib/paylink.server.ts` — تمرير حقول حفظ البطاقة.
- `src/lib/invoice-pdf.server.ts` — توليد PDF (جديد).
- `src/lib/invoice.functions.ts` — `getInvoiceDownloadUrl`, `listMyInvoices` (جديد).
- `src/lib/email-templates/payment-receipt.tsx` + تحديث `registry.ts` (جديد).
- `src/routes/lovable/email/transactional/*` — توليد عبر `scaffold_transactional_email`.
- `src/routes/api/public/invoices.$orderId.ts` — تحميل PDF موقّع (جديد).
- `src/routes/api/public/cron/billing-renewals.ts` — تجديد آلي (جديد).
- `src/routes/app.billing.tsx` — سجل الفواتير + بطاقة الدفع.
- `src/routes/payment.paylink.callback.tsx` — زر تحميل الفاتورة.
- `src/components/trial-banner.tsx` — لا تغيير منطقي.
- `src/lib/i18n/{ar,en}.ts` — نصوص جديدة.
- `package.json` — إضافة `pdf-lib`.

## أسرار جديدة مطلوبة
- `INVOICE_DOWNLOAD_SECRET` (HMAC لتوقيع روابط الفاتورة) — سيُطلب عبر `add_secret`.

## افتراضات تأكيدها لاحقاً
- ضريبة القيمة المضافة 15% تُحسب كجزء من المبلغ المُحصَّل (Inclusive) لأن أسعار الباقات السابقة معروضة كأرقام نهائية. إن أردت احتساب VAT منفصلًا أعلِمني.
- البريد الإلكتروني الرسمي على الفاتورة سيكون `support@totalreward.app` (موجود ضمن إعدادات الاتصال).

## النتيجة المتوقعة بعد التطبيق
- الضغط على Billing مباشرة بعد الدفع: لا بنر تجريبي، البطاقة "Starter — Active"، تاريخ التجديد القادم ظاهر، البطاقة المحفوظة معروضة، سجل فاتورة واحدة قابلة للتنزيل.
- يصل بريد بهوية Total Reward خلال دقائق فيه ملخص الدفعة وزر تحميل PDF رسمي.
- الشهر القادم يُخصم المبلغ تلقائيًا (أو يصل تذكير دفع إن لم يدعم الحساب الـ tokenization) ويُولَّد سجل/فاتورة جديدة.
