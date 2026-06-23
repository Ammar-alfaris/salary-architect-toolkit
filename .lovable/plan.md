## Goals

1. عند تصفح الموقع بالعربية تظهر فقط المقالات العربية، وبالإنجليزية تظهر فقط الإنجليزية — بدون تغيير لوحة الإدارة.
2. صفحة الباقات تعرض السعر بعملة الزائر المحلية (USD، KWD، AED، QAR، BHD، OMR، EGP، EUR، GBP…) مع إبقاء السعر الأساسي بالريال السعودي مرئيًا بجانبه. الدفع الفعلي يبقى بالريال (Paylink).

## Part 1 — Blog locale filtering (تلقائي بدون تغيير في الإدارة)

ملف جديد `src/lib/blog-locale.ts` يصدّر:
```ts
detectPostLocale(p): "ar" | "en"
```
المنطق:
- إذا الحقل `language` موجود في الصف ومعبّأ → استخدمه (للمستقبل، بدون اعتماد).
- وإلا: احسب نسبة الحروف العربية (نطاق `\u0600-\u06FF`) في `title + (excerpt ?? "")`. إن تجاوزت 30% → `ar`، وإلا → `en`.

تعديلات:
- `src/routes/blog.index.tsx`: بعد جلب المقالات، فلتر `posts.filter(p => detectPostLocale(p) === locale)` قبل البحث والـ featured. أضف رسالة فارغة محلية بالنص الموجود حاليًا.
- `src/routes/blog.$slug.tsx`: حدّث `<link rel="alternate" hreflang>` إن وُجد، لا تغييرات وظيفية أخرى — صفحة المقال نفسها متاحة عبر slug سواء كان عربي أو إنجليزي. (روابط المدونة في القائمة الرئيسية ستفلتر تلقائيًا.)
- `public/llms.txt` و sitemap: لا تغيير — كلتا اللغتين مفهرستان.

لا حاجة لـ migration؛ نعتمد على الكشف التلقائي كما طلبت.

## Part 2 — Geo-based currency on /pricing

### 2.1 جدول أسعار الصرف (cached)
Migration جديد:
```sql
CREATE TABLE public.fx_rates (
  base_currency text NOT NULL DEFAULT 'SAR',
  quote_currency text NOT NULL,
  rate numeric(18,8) NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (base_currency, quote_currency)
);
GRANT SELECT ON public.fx_rates TO anon, authenticated;
GRANT ALL ON public.fx_rates TO service_role;
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read fx" ON public.fx_rates FOR SELECT USING (true);
```

### 2.2 Cron يومي لتحديث الأسعار (exchangerate.host)
- ملف جديد `src/routes/api/public/cron/fx-refresh.ts` (server route، يتحقق من `apikey` = anon key).
- يستدعي `https://api.exchangerate.host/latest?base=SAR&symbols=USD,KWD,AED,QAR,BHD,OMR,EGP,JOD,EUR,GBP,TRY,INR,PKR` ثم upsert إلى `fx_rates`.
- جدولة عبر pg_cron يوميًا 03:00 UTC (تُنفّذ بعد النشر باستخدام أداة supabase insert، ليست في migration).

### 2.3 Server function للجيو + الأسعار
ملف جديد `src/lib/pricing-locale.functions.ts`:
- `getVisitorCurrency()` server fn، GET، بدون auth:
  - تقرأ `cf-ipcountry` (Cloudflare) أو `x-vercel-ip-country` أو `accept-language` كـ fallback من الـ request headers.
  - تربط الدولة → عملة عبر خريطة ثابتة (SA→SAR, US→USD, KW→KWD, AE→AED, QA→QAR, BH→BHD, OM→OMR, EG→EGP, JO→JOD, GB→GBP, EU countries→EUR, ...). الافتراضي SAR.
  - ترجع `{ country, currency, rate }` حيث `rate` يُقرأ من `fx_rates` (publishable client).

### 2.4 تعديلات `src/routes/pricing.tsx`
- جلب `currency` و `rate` عبر `useServerFn(getVisitorCurrency)` + `useQuery` (staleTime 1h).
- إضافة toggle صغير "عرض بـ [USD ⇄ SAR]" بجانب toggle شهري/سنوي، يخزّن الاختيار في localStorage (يطغى على الكشف التلقائي).
- `formatPrice(plan)` يصبح:
  ```
  USD 79  ·  SAR 296
  ```
  العملة المحلية كبيرة بارزة، الريال السعودي بجانبها بخط أصغر وبنص "≈ {SAR} {price} (تُحصّل بالريال)".
- التقريب: لـ JPY/KWD/BHD/OMR استخدم خانتين عشريتين فقط حيث يلزم. التقريب لأقرب عدد صحيح للعرض الإعلامي (نتجنّب 78.43).
- داخل `handleTrialClick` يبقى المبلغ الممرّر للـ checkout هو `plan.monthly_price`/`plan.annual_price` بالريال — لا تغيير في الفوترة.
- تحديث FAQ السؤال «What currencies are supported?» ليعكس: "نعرض السعر بعملتك المحلية للملاحظة، والتحصيل بالريال السعودي عبر Paylink."

## التفاصيل التقنية

- لا تغيير في schema لـ `blog_posts`.
- `fx_rates` جدول صغير عام للقراءة فقط (لا PII).
- العملات المدعومة في الخريطة الأولى: SAR, USD, AED, KWD, QAR, BHD, OMR, EGP, JOD, GBP, EUR (مع mapping دول EU)، TRY, INR, PKR. أي دولة خارجها → USD.
- Fallback آمن: إذا تعذّر جلب FX (cron لم يعمل بعد) → اعرض SAR فقط.
- لا تأثير على SEO/sitemap.

## ملفات سيتم تعديلها/إنشاؤها

إنشاء:
- `src/lib/blog-locale.ts`
- `src/lib/pricing-locale.functions.ts`
- `src/routes/api/public/cron/fx-refresh.ts`
- `supabase/migrations/<ts>_fx_rates.sql`

تعديل:
- `src/routes/blog.index.tsx` (فلترة باللغة)
- `src/routes/pricing.tsx` (عرض العملة المزدوج + toggle)
- `src/lib/i18n/{en,ar}.ts` (سلاسل: "Billed in SAR"، "≈"، "Show in")

بعد النشر: تشغيل cron via supabase insert.
