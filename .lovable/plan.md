راجعت الخطة ابدء بالمهم اولاً خطوة أ

ونعم اريد استهداف السوق السعودي والخليجي او العربي اولاً

&nbsp;

# خطة جاهزية الإطلاق — Total Reward

تشخيص شامل قبل الإطلاق، مرتّب حسب الأولوية: **حواجز إطلاق (Blockers) → مهم جداً → تحسينات تجربة → تلميع**.

---

## 1) حواجز إطلاق (Blockers) — يجب معالجتها قبل النشر

### 1.1 الدفع عبر Paylink لا يعمل بشكل موثوق

- **البيئة التجريبية**: `restpilot.paylink.sa` يرجع Cloudflare 1016 (DNS غير صالح). لا يمكن اختبار الـ sandbox من السيرفر الحالي.
- **البيئة الحية**: `addInvoice` كان يفشل بسبب `applePay` وصيغة رقم الطلب — تم إصلاحه لكن لم يُتحقق منه بدفعة نهائية حية (1 ر.س + استرجاع).
- **المعالجة**:
  1. التواصل مع Paylink لتأكيد المضيف الصحيح للـ sandbox (قد يكون `restpilot.paylink.biz`)، ثم تحديث `PAYLINK_TEST_BASE_URL`.
  2. تنفيذ معاملة حية بـ 1 ر.س بمادا/فيزا، التأكد من callback، استرجاع.
  3. التأكد من أن `payment.paylink.callback.tsx` يستدعي `getInvoice` للتحقق ثم يحدّث `orders` و `subscriptions` ذرّياً (idempotent).

### 1.2 لا يوجد webhook فعلي لـ Paylink

- الاعتماد فقط على صفحة callback في المتصفح خطر: إن أغلق المستخدم الصفحة بعد الدفع، لن تُحدَّث الاشتراك.
- **المعالجة**: مسار عام `src/routes/api/public/paylink/webhook.ts` يتحقق من الفاتورة عبر `getInvoice` (لا يثق بالـpayload)، يحدّث `orders` + `subscriptions`، ويتعامل مع التكرار (idempotency على `transactionNo`).

### 1.3 حلقة الـ Onboarding على الجوال (مُعالَجة جزئياً)

- تم إضافة retry + localStorage cache، لكن يحتاج اختبار فعلي على iOS Safari + Android Chrome مع شبكة بطيئة (Throttle 3G) لتأكيد عدم تكرار الحلقة.

### 1.4 رسائل البريد (Auth + Transactional)

- التحقق من أن قوالب التحقق وإعادة تعيين كلمة المرور تُرسل فعلياً عبر المزود المُهيأ، وأن روابط `redirectTo` تشير إلى `https://totalreward.app` وليس preview.
- تفعيل **Leaked Password Protection (HIBP)**.

### 1.5 سياسات RLS وصلاحيات GRANT

- مراجعة كل الجداول الـ44 للتأكد من:
  - وجود `GRANT` صريح لكل جدول جديد (خاصة الجداول الإدارية).
  - عدم وجود سياسات `USING (true)` لجداول حساسة.
- تشغيل `security--run_security_scan` قبل النشر ومعالجة كل النتائج الحرجة.

### 1.6 محتوى الصفحات القانونية والـSEO

- صفحة `trust.tsx` — مراجعة ذكر بوّابات الدفع (إزالة Paddle، إضافة Paylink + شارة PCI الخاصة بهم).
- التأكد من وجود: Privacy Policy, Terms of Service, Refund Policy (مطلوبة لبوّابة الدفع السعودية).
- `sitemap.xml` + `robots.txt` يشيران للدومين الصحيح `totalreward.app`.
- meta tags + `og:image` لكل صفحة عامة (الحالية تفتقد `og:image`).

---

## 2) مهم جداً — معالجة قبل أو في الأسبوع الأول

### 2.1 الموثوقية والأخطاء

- **Error Boundaries**: التحقق من أن كل route فيها `errorComponent` و`notFoundComponent` (مطلوب بحسب قواعد TanStack).
- **Sentry أو مرصد أخطاء**: إضافة تتبع أخطاء أمامية + خلفية (server function logs غير كافية للمستخدم النهائي).
- **Toast errors**: توحيد رسائل الخطأ بالعربية (حالياً بعضها يعرض رسائل تقنية من Supabase/Paylink مباشرة).

### 2.2 الترجمة (i18n)

- ملفا `ar.ts` و `en.ts` بنفس الحجم (1044 سطر) — مراجعة سريعة للمفاتيح الناقصة وللركاكة في العربية، خاصة في:
  - رسائل الفواتير والدفع
  - رسائل الـ onboarding
  - رسائل صلاحيات RBAC
- التأكد من اتجاه RTL في كل صفحة (خصوصاً الجداول والـ charts).

### 2.3 الأداء

- صفحة الهبوط `index.tsx` تستورد كل ملفات الترجمة (2088 سطر) مرة واحدة — code-split عبر dynamic import للـ locale غير النشط.
- صور الـ landing/blog: lazy loading + `aspect-*` + WebP.
- فحص `Largest Contentful Paint` على الجوال (الـviewport الحالي 390×702).

### 2.4 الـAuth والـAccess

- **Google OAuth**: التأكد من تهيئته (مذكور في الذاكرة كافتراضي).
- **Session timeout**: ماذا يحدث عند انتهاء الجلسة أثناء عمل حساس (مثل تشغيل bonus cycle)؟
- **Onboarding bypass**: التأكد من عدم إمكانية تجاوز الـ subscription gate يدوياً عبر URL.

### 2.5 الفوترة (Billing)

- اختبار سيناريوهات: trial → trial_ending → grace → restricted → dormant.
- اختبار `cancelSubscriptionAtPeriodEnd` + إعادة الاشتراك.
- إيصالات/فواتير PDF (`invoice-pdf.server.ts`) — التحقق من توافقها مع متطلبات ضريبة القيمة المضافة السعودية (ZATCA) إذا كان السوق المستهدف السعودية.

### 2.6 الـCron Jobs

- `cron/trial-lifecycle` — التحقق من جدولته الفعلية (pg_cron) واستقرار التنفيذ.

---

## 3) تحسينات تجربة المستخدم (UX)

### 3.1 الـ Onboarding

- إضافة شاشة "أمثلة بيانات" (Sample data) لتعبئة الحساب بموظفين تجريبيين بضغطة، حتى يستكشف المستخدم الميزات قبل إدخال بياناته.
- مؤشّر تقدّم واضح في كل خطوة من الجولة الإرشادية.

### 3.2 لوحة التحكم الأولى (`app.index.tsx`)

- مراجعة العناصر الفارغة (empty states) — يجب أن تُرشد للخطوة التالية بدلاً من عرض "0".

### 3.3 الجداول الرئيسية (employees, structures, matrix)

- بحث/فلترة/ترتيب موحّد.
- استيراد/تصدير Excel مع رسائل أخطاء واضحة للصفوف الفاشلة.
- Bulk actions مع تأكيد.

### 3.4 الجوال

- viewport الحالي 390px — مراجعة جميع شاشات `app.*` على الجوال (الجداول الكبيرة، شاشات الموافقات، شاشة Paylink callback).
- تأكيد 44×44 minimum tap targets (خاصة icon-only buttons).

### 3.5 التنبيهات والإشعارات

- مركز إشعارات داخل التطبيق (الموافقات المعلّقة، التذاكر، انتهاء التجربة).
- بريد إلكتروني للأحداث الحرجة فقط (لا spam).

### 3.6 المساعدة والدعم

- صفحة `app.help.tsx` — التأكد من وجود FAQ + روابط لفيديوهات قصيرة.
- زر دعم سريع (chat widget أو نموذج تذكرة) في الـ shell.

---

## 4) تلميع نهائي

- إزالة ملفات tmp (`tmp-check-auth-email*.mjs`) من الجذر.
- مراجعة `console.log` المتبقية في الكود.
- التحقق من favicon وأيقونات PWA (192/512) + manifest.
- شاشة maintenance mode (الـ admin_settings فيها `maintenance_mode` لكن لا يُستخدم في الـ shell).
- مراجعة الـ analytics (PostHog/GA) — هل مُهيأة؟
- نسخ احتياطية للقاعدة (Supabase backups مفعّلة افتراضياً، لكن يجب التحقق).

---

## ترتيب التنفيذ المقترح (Sprints)

```text
Sprint 0 — اليوم (Blockers)
  1. تأكيد مضيف Paylink sandbox + اختبار end-to-end
  2. إنشاء Paylink webhook (idempotent)
  3. إكمال صفحات Privacy/Terms/Refund
  4. تشغيل security scan + معالجة الحرج

Sprint 1 — هذا الأسبوع
  5. مراجعة RLS كاملة
  6. توحيد رسائل الخطأ بالعربية
  7. اختبار Onboarding على iOS/Android فعليّاً
  8. تفعيل HIBP + مراجعة قوالب البريد

Sprint 2 — قبل النشر العام
  9. Error tracking (Sentry)
 10. تحسين أداء صفحة الهبوط (code-split i18n, og:image)
 11. مراجعة UX للجوال
 12. اختبار سيناريوهات Billing الكاملة
```

---

## ماذا أحتاج منك للبدء؟

اختر من أين تريد أن أبدأ التنفيذ الفعلي:

- **(أ)** Sprint 0 بالكامل (الـBlockers) — الأولوية القصوى.
- **(ب)** فقط Paylink webhook + اختبار الدفع.
- **(ج)** تشغيل الـ security scan أولاً ثم نقرر بناءً على النتائج.
- **(د)** شيء آخر تحدّده.

أيضاً أحتاج تأكيد:

- هل السوق المستهدف السعودية حصراً (لتفعيل ZATCA + اللغة العربية كأساسية)؟
- هل لديك حساب Sentry / PostHog أو تريدني أن أقترح بديلاً مجانياً؟
- هل تم تأكيد مضيف Paylink sandbox الصحيح مع دعمهم؟