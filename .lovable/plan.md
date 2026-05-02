# خطة الإصلاحات والتحسينات

سأنفّذ التعديلات بالترتيب الذي ذكرته، مقسّمة على 6 محاور:

---

## 1) عملة المؤسسة موحّدة + عرض ر.س / SAR حسب اللغة

**المشكلة:** كل الصفحات تمرّر `"USD"` ثابتة لـ `fmtCurrency`، فلا تتأثر بإعداد عملة المؤسسة.

**الحل:**
- إضافة `defaultCurrency` إلى `AuthProvider` (يُحمّل مع `organizationId` من `organizations.default_currency`).
- تحديث `fmtCurrency` ليعرض رمزًا محليًا للريال السعودي:
  - `locale=ar` + `SAR` → "ر.س"
  - `locale=en` + `SAR` → "SAR"
  - باقي العملات: `Intl.NumberFormat` الافتراضي.
- استبدال جميع `fmtCurrency(..., "USD", locale)` بـ `fmtCurrency(..., currency, locale)` حيث `currency = useAuth().defaultCurrency` في الصفحات: `app.index`, `app.merit`, `app.bonus`, `app.allowances`, `app.employees`, `app.employees.$id`, `app.reports`, `app.analytics.equity`.
- تأكيد بقاء `app.matrix` يستخدم عملة الهيكلة نفسها (لا تتغيّر).

## 2) RTL — تثبيت اتجاه الواجهة في الإعدادات وغيرها

**المشكلة:** `Tabs`/`Select`/بعض الجداول لا تأخذ الاتجاه الصحيح في وضع العربية (تظهر يسارًا).

**الحل:**
- التأكد من أن `<html dir="rtl">` يُضبط في `__root.tsx` بناءً على `locale` (موجود لكن سنتحقّق).
- داخل `app.settings.tsx` لفّ المحتوى بـ `dir={locale==="ar" ? "rtl" : "ltr"}` على حاوية `Tabs` لضمان أن أزرار التبويب وقوائم `Select` تمتد جهة اليمين.
- مراجعة `TabsList` لإضافة `justify-start` بدل أي `justify-end` تلقائي عكسي.
- إصلاح أي أيقونات لها `me-1`/`ms-1` ثابتة مكسورة في الصفحات المذكورة.

## 3) هيكلة الرواتب — زر حذف نهائي + وسم "Pay Structure" بالعربية

**المطلوب:**
- بجانب زر "أرشفة" نضيف زر **حذف نهائي** (Admin فقط) مع تأكيد عبر `AlertDialog` يحذف `salary_structures` + `salary_grades` المرتبطة (cascade يدوي عبر استعلامين متسلسلين).
- ترجمة عنوان "Pay Structure" → "هيكل الرواتب" (تصحيح أي مفتاح ناقص).
- تسجيل العملية في `audit_logs` بنوع `delete`.

## 4) ربط ميزانية الزيادة السنوية ديناميكيًا

**المشكلة الحالية:** تغيير "الميزانية المستهدفة" لا يُعيد حساب توصيات المصفوفة، فيظل "الفعلي" و"الإجمالي" ثابتين، وقائمة الموظفين لا تتحدث.

**الحل في `app.merit.tsx`:**
- إضافة `useEffect` يُعيد قياس مصفوفة `defaultMeritMatrix()` عند تغيّر `budget`:
  - إذا كان `budget` يختلف عن مرجع 4% الافتراضي، نضرب كل خلية في معامل `budget/4` (مع تقريب لخطوة 0.5%).
- بدلًا من ذلك (أنظف): دالة `scaleMatrixToBudget(matrix, targetPct, baselinePct)` في `lib/comp.ts`، تُستدعى عند تغيير `budget` فقط.
- بما أن `recommendations` مُحسوبة عبر `useMemo` تعتمد على `matrix`، ستتحدث القائمة كاملة + KPIs تلقائيًا.
- إضافة زر صغير "إعادة ضبط افتراضي" لاستعادة المصفوفة الأصلية.

## 5) الموظفون — قالب Excel + استيراد جماعي + تعديل من الواجهة

**ميزات جديدة في `app.employees.tsx`:**

أ) **تنزيل قالب Excel فارغ**
- زر "تنزيل القالب" (Admin/Analyst) ينشئ ملف `.xlsx` عبر `lib/excel.ts` بأعمدة:
  `employee_code, first_name, last_name, email, department, job_title, job_family, location, hire_date, manager_name, grade_code, base_salary, target_bonus_percent, performance_rating`
- صف توضيحي واحد كمثال + تعليق في رأس الملف.

ب) **استيراد ملف موظفين**
- زر "استيراد من Excel" يقرأ `.xlsx` بـ `XLSX.read`، يحوّله لصفوف.
- تحقق Zod لكل صف (اسم، راتب رقم موجب…).
- ربط `grade_code` → `grade_id` عبر استعلام `salary_grades`.
- إدراج جماعي عبر `supabase.from("employees").insert(rows)`، مع تقرير "نجح N، فشل M" في حوار.
- تسجيل audit.

ج) **تعديل بيانات الموظف**
- زر "تعديل" (قلم) في كل صف يفتح نفس `Dialog` المستخدم للإضافة لكن في وضع تعديل (`form` معبأ مسبقًا) ويستدعي `update` بدل `insert`.
- يُحدّث `full_name` تلقائيًا، يسجّل audit مع `before/after`.

د) في صفحة بروفايل الموظف `app.employees.$id.tsx`، نضيف زر "تعديل" يفتح نفس الحوار.

## 6) صفحة الموافقات — توضيح الدور + صفحة تفويض الصلاحيات

**أ) إيضاح صفحة الموافقات داخل التطبيق:**
- إضافة بطاقة شرحية أعلى `app.approvals.tsx` (مكوّن `WhyThisMatters`) تشرح بالعربية:
  > "الموافقات تُستخدم لاعتماد دورات الزيادة السنوية والمكافآت قبل التطبيق. عند الاعتماد، تُقفل الدورة من التعديل (حسب إعدادات المؤسسة) ويُحفظ snapshot للنسخة المعتمدة. يطلب الموافقة المحلل، ويعتمدها المدير أو Admin."
- إضافة شارة "دورك الحالي: …" بناءً على `usePermissions().role`.

**ب) صفحة جديدة لتفويض الصلاحيات `/app/team`:**
- جدول لأعضاء المؤسسة (من `user_roles` join `profiles` على `user_id`).
- لكل عضو: عرض دوره (admin/analyst/manager/viewer) مع قائمة منسدلة لتغيير الدور.
- زر "دعوة عضو" (Admin فقط): إدخال email — يظهر الإيميل في قائمة "دعوات معلّقة" ويُحفظ في جدول جديد `pending_invitations` (سنُنشئه عبر migration). عند تسجيل المستخدم بنفس الإيميل، يربطه trigger `handle_new_user` بالمؤسسة بدور المدعو بدل إنشاء مؤسسة جديدة.
- زر "إزالة" يحذف صف من `user_roles`.
- جدول `role_permissions` توضيحي للقراءة فقط (مصفوفة: ماذا يستطيع كل دور؟).
- إضافة الصفحة لقائمة التنقل بأيقونة `UserCog`.

**migration مطلوبة:**
- جدول `pending_invitations(organization_id, email, role, invited_by, created_at, accepted_at)` مع RLS:
  - أعضاء المؤسسة يقرؤون.
  - Admin فقط يُنشئ/يحذف.
- تحديث `handle_new_user()` ليبحث في `pending_invitations` بالإيميل قبل إنشاء مؤسسة جديدة.

---

## ملخص الملفات المتأثرة

```text
src/lib/auth.tsx                    + defaultCurrency
src/lib/format.ts                   تخصيص رمز SAR
src/lib/comp.ts                     scaleMatrixToBudget
src/lib/i18n.tsx                    مفاتيح جديدة (ar+en)
src/components/app-shell.tsx        رابط /app/team
src/routes/__root.tsx               تأكيد dir
src/routes/app.index.tsx            عملة من useAuth
src/routes/app.settings.tsx         RTL على Tabs
src/routes/app.structures.tsx       زر حذف نهائي
src/routes/app.merit.tsx            ربط الميزانية بالمصفوفة
src/routes/app.bonus.tsx            عملة من useAuth
src/routes/app.allowances.tsx       عملة من useAuth
src/routes/app.employees.tsx        قالب + استيراد + تعديل
src/routes/app.employees.$id.tsx    زر تعديل + عملة
src/routes/app.reports.tsx          عملة من useAuth
src/routes/app.analytics.equity.tsx عملة من useAuth
src/routes/app.approvals.tsx        WhyThisMatters
src/routes/app.team.tsx             جديد
supabase migration                  pending_invitations + handle_new_user
```

هل أبدأ التنفيذ بهذا الترتيب؟
