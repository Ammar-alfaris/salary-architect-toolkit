import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Locale = "en" | "ar";

type Dict = Record<string, string>;

const en: Dict = {
  app_name: "RewardArchitect",
  tagline: "Compensation, structured.",
  hero_headline: "Design salary structures and total rewards with confidence",
  hero_sub: "Build grade-based salary ranges, plan annual bonuses, run merit cycles and manage allowances — all in one workspace built for Total Rewards teams.",
  start_free: "Start Free",
  view_demo: "View Demo",
  sign_in: "Sign In",
  sign_up: "Create Account",
  get_started: "Get Started",
  features: "Features",
  modules: "Modules",
  pricing: "Pricing",
  email: "Email",
  password: "Password",
  full_name: "Full name",
  confirm_password: "Confirm password",
  continue_google: "Continue with Google",
  forgot_password: "Forgot password?",
  back_home: "Back to home",
  dashboard: "Dashboard",
  salary_structures: "Salary Structures",
  salary_matrix: "Salary Matrix",
  bonus: "Bonus",
  merit_increase: "Merit Increase",
  allowances: "Allowances",
  employees: "Employees",
  reports: "Reports",
  settings: "Settings",
  total_employees: "Total Employees",
  active_structures: "Active Structures",
  payroll_snapshot: "Payroll Snapshot",
  avg_compa_ratio: "Avg Compa-Ratio",
  bonus_budget: "Bonus Budget",
  merit_budget: "Merit Budget",
  recent_structures: "Recent Salary Structures",
  out_of_range: "Employees Outside Range",
  due_for_review: "Due for Increase Review",
  quick_actions: "Quick Actions",
  create_structure: "Create Salary Structure",
  add_employee: "Add Employee",
  run_bonus: "Run Bonus Calculation",
  start_merit: "Start Merit Cycle",
  structure_basics: "Structure Basics",
  midpoint_logic: "Midpoint Logic",
  range_spread: "Range Spread",
  rounding: "Rounding",
  generate: "Generate Structure",
  save: "Save",
  cancel: "Cancel",
  reset: "Reset",
  export_csv: "Export CSV",
  grade: "Grade",
  minimum: "Minimum",
  midpoint: "Midpoint",
  maximum: "Maximum",
  spread: "Spread %",
  progression: "Progression %",
  base_salary: "Base Salary",
  target_bonus_pct: "Target Bonus %",
  performance: "Performance",
  department: "Department",
  job_title: "Job Title",
  location: "Location",
  hire_date: "Hire Date",
  status: "Status",
  actions: "Actions",
  view: "View",
  edit: "Edit",
  delete: "Delete",
  loading: "Loading…",
  no_data: "No data yet.",
  language: "Language",
  theme: "Theme",
  logout: "Sign Out",
  profile: "Profile",
  not_found: "Page not found",
  return_dashboard: "Return to Dashboard",
  return_home: "Return to Home",
};

const ar: Dict = {
  app_name: "ريوارد أركيتكت",
  tagline: "الأجور بشكل منظم.",
  hero_headline: "صمم هياكل الرواتب والمكافآت الشاملة بثقة",
  hero_sub: "أنشئ نطاقات أجور حسب الدرجات، خطط للمكافآت السنوية، نفذ دورات الزيادات السنوية وأدر البدلات في مساحة عمل واحدة لفرق المكافآت الشاملة.",
  start_free: "ابدأ مجانًا",
  view_demo: "عرض توضيحي",
  sign_in: "تسجيل الدخول",
  sign_up: "إنشاء حساب",
  get_started: "ابدأ الآن",
  features: "المميزات",
  modules: "الوحدات",
  pricing: "الأسعار",
  email: "البريد الإلكتروني",
  password: "كلمة المرور",
  full_name: "الاسم الكامل",
  confirm_password: "تأكيد كلمة المرور",
  continue_google: "المتابعة عبر جوجل",
  forgot_password: "نسيت كلمة المرور؟",
  back_home: "العودة للصفحة الرئيسية",
  dashboard: "لوحة التحكم",
  salary_structures: "هياكل الرواتب",
  salary_matrix: "مصفوفة الرواتب",
  bonus: "المكافآت",
  merit_increase: "الزيادات السنوية",
  allowances: "البدلات",
  employees: "الموظفون",
  reports: "التقارير",
  settings: "الإعدادات",
  total_employees: "إجمالي الموظفين",
  active_structures: "الهياكل النشطة",
  payroll_snapshot: "لقطة الرواتب",
  avg_compa_ratio: "متوسط نسبة المقارنة",
  bonus_budget: "ميزانية المكافآت",
  merit_budget: "ميزانية الزيادات",
  recent_structures: "أحدث الهياكل",
  out_of_range: "خارج النطاق",
  due_for_review: "مستحقون للمراجعة",
  quick_actions: "إجراءات سريعة",
  create_structure: "إنشاء هيكل رواتب",
  add_employee: "إضافة موظف",
  run_bonus: "حساب المكافآت",
  start_merit: "بدء دورة زيادات",
  structure_basics: "أساسيات الهيكل",
  midpoint_logic: "منطق نقطة الوسط",
  range_spread: "اتساع النطاق",
  rounding: "التقريب",
  generate: "توليد الهيكل",
  save: "حفظ",
  cancel: "إلغاء",
  reset: "إعادة تعيين",
  export_csv: "تصدير CSV",
  grade: "الدرجة",
  minimum: "الحد الأدنى",
  midpoint: "نقطة الوسط",
  maximum: "الحد الأقصى",
  spread: "% الاتساع",
  progression: "% التدرج",
  base_salary: "الراتب الأساسي",
  target_bonus_pct: "% المكافأة المستهدفة",
  performance: "الأداء",
  department: "القسم",
  job_title: "المسمى الوظيفي",
  location: "الموقع",
  hire_date: "تاريخ التعيين",
  status: "الحالة",
  actions: "الإجراءات",
  view: "عرض",
  edit: "تعديل",
  delete: "حذف",
  loading: "جارٍ التحميل…",
  no_data: "لا توجد بيانات بعد.",
  language: "اللغة",
  theme: "المظهر",
  logout: "تسجيل الخروج",
  profile: "الملف الشخصي",
  not_found: "الصفحة غير موجودة",
  return_dashboard: "العودة للوحة التحكم",
  return_home: "العودة للرئيسية",
};

const dictionaries: Record<Locale, Dict> = { en, ar };

interface I18nCtx {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: (key: keyof typeof en | string) => string;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && (localStorage.getItem("locale") as Locale)) || "en";
    setLocaleState(stored);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") localStorage.setItem("locale", l);
  };

  const t = (key: string) => dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
  const dir = locale === "ar" ? "rtl" : "ltr";

  return <I18nContext.Provider value={{ locale, dir, t, setLocale }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
