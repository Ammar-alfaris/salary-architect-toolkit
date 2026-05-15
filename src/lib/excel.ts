import * as XLSX from "xlsx";

export function exportXLSX<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  sheetName = "Sheet1",
): void {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

export function exportXLSXWorkbook(
  filename: string,
  sheets: Array<{ name: string; rows: Record<string, unknown>[] }>,
): void {
  const wb = XLSX.utils.book_new();
  sheets.forEach((s) => {
    const ws = XLSX.utils.json_to_sheet(s.rows);
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  });
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

export interface ParsedTemplate {
  employees: Record<string, unknown>[];
  gradeMap: Map<string, string>;   // company_grade(lower) -> app_grade (e.g. "G03")
  ratingMap: Map<string, string>;  // company_rating(lower) -> app_rating
}

/** Parse the first worksheet of an uploaded file into rows (back-compat). */
export async function parseXLSX(file: File): Promise<Record<string, unknown>[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
}

/** Parse the full template workbook including mapping sheets. */
export async function parseEmployeeTemplate(file: File): Promise<ParsedTemplate> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const findSheet = (...needles: string[]) => {
    const name = wb.SheetNames.find((n) => needles.some((q) => n.toLowerCase().includes(q.toLowerCase())));
    return name ? wb.Sheets[name] : null;
  };
  const empSheet = findSheet("employee", "موظف") ?? wb.Sheets[wb.SheetNames[0]];
  const gradeSheet = findSheet("grade map", "grade_map", "مطابقة الدرجات", "درجات");
  const ratingSheet = findSheet("perform", "rating", "تقييم");
  const employees = empSheet ? XLSX.utils.sheet_to_json<Record<string, unknown>>(empSheet, { defval: "" }) : [];

  const gradeMap = new Map<string, string>();
  if (gradeSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(gradeSheet, { defval: "" });
    for (const r of rows) {
      const k = String(r.company_grade ?? r["Company Grade"] ?? r["درجة الشركة"] ?? "").trim().toLowerCase();
      const v = String(r.app_grade ?? r["App Grade"] ?? r["درجة التطبيق"] ?? "").trim();
      if (k && v) gradeMap.set(k, v);
    }
  }
  const ratingMap = new Map<string, string>();
  if (ratingSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ratingSheet, { defval: "" });
    for (const r of rows) {
      const k = String(r.company_rating ?? r["Company Rating"] ?? r["تقييم الشركة"] ?? "").trim().toLowerCase();
      const v = String(r.app_rating ?? r["App Rating"] ?? r["تقييم التطبيق"] ?? "").trim();
      if (k && v) ratingMap.set(k, v);
    }
  }
  return { employees, gradeMap, ratingMap };
}

// Standard top-level employee field columns (in canonical order for the template).
export const EMPLOYEE_TEMPLATE_HEADERS = [
  // Identity
  "employee_code",
  "first_name",
  "last_name",
  "email",
  "phone_number",
  "date_of_birth",
  "nationality",
  "gender",
  // Employment
  "department",
  "job_title",
  "job_family",
  "location",
  "cost_center",
  "business_unit",
  "employment_type",
  "employment_status",
  "hire_date",
  "contract_start_date",
  "contract_end_date",
  "manager_name",
  // Compensation
  "company_grade",
  "mapped_grade",
  "grade_code",
  "base_salary",
  "currency",
  "salary_effective_date",
  "target_bonus_percent",
  "company_rating",
  "mapped_rating",
  "performance_rating",
  // Standard allowances (annual amounts)
  "housing_allowance",
  "transportation_allowance",
  "mobile_allowance",
  "food_allowance",
  "shift_allowance",
  "hardship_allowance",
] as const;

/** Set of columns that are recognised as standard employee/allowance fields.
 * Anything else in the Employees sheet is treated as either:
 *  - a custom allowance (column ending in `_allowance`), or
 *  - a custom employee field (any other unknown column). */
export const KNOWN_EMPLOYEE_COLUMNS = new Set<string>(EMPLOYEE_TEMPLATE_HEADERS as readonly string[]);

export const STANDARD_ALLOWANCE_COLUMNS = [
  "housing_allowance",
  "transportation_allowance",
  "mobile_allowance",
  "food_allowance",
  "shift_allowance",
  "hardship_allowance",
] as const;

export const APP_GRADE_CODES = Array.from({ length: 15 }, (_, i) => `G${String(i + 1).padStart(2, "0")}`);
export const APP_RATINGS = ["Outstanding", "Exceeds", "Meets", "Below", "Unsatisfactory"];

export function downloadEmployeeTemplate(filename = "employees_template.xlsx") {
  const wb = XLSX.utils.book_new();

  // ---- Sheet 1: Employees ----
  const sample: Record<string, unknown>[] = [
    {
      employee_code: "EMP-1001",
      first_name: "Sara", last_name: "Khan", email: "sara.khan@company.com",
      phone_number: "+971500000001", date_of_birth: "1990-04-12", nationality: "Pakistani", gender: "Female",
      department: "Engineering", job_title: "Senior Engineer", job_family: "Software", location: "Dubai",
      cost_center: "ENG-100", business_unit: "Tech", employment_type: "Full-time", employment_status: "active",
      hire_date: "2022-03-15", contract_start_date: "2022-03-15", contract_end_date: "",
      manager_name: "Ahmed Hassan",
      company_grade: "S3", mapped_grade: "G05", grade_code: "",
      base_salary: 95000, currency: "AED", salary_effective_date: "2024-01-01",
      target_bonus_percent: 15,
      company_rating: "5 - Outstanding", mapped_rating: "Outstanding", performance_rating: "",
      housing_allowance: 23750, transportation_allowance: 9500, mobile_allowance: 600,
      food_allowance: 0, shift_allowance: 0, hardship_allowance: 0,
      remote_work_allowance: 1200, // example custom allowance (any *_allowance column is auto-imported)
    },
    {
      employee_code: "EMP-1002",
      first_name: "Omar", last_name: "Ali", email: "omar.ali@company.com",
      phone_number: "+966500000002", date_of_birth: "1995-09-30", nationality: "Saudi", gender: "Male",
      department: "Sales", job_title: "Account Executive", job_family: "Sales", location: "Riyadh",
      cost_center: "SAL-200", business_unit: "Commercial", employment_type: "Full-time", employment_status: "active",
      hire_date: "2023-08-01", contract_start_date: "2023-08-01", contract_end_date: "",
      manager_name: "Karim Adel",
      company_grade: "Band-B", mapped_grade: "G03", grade_code: "",
      base_salary: 62000, currency: "SAR", salary_effective_date: "2024-01-01",
      target_bonus_percent: 25,
      company_rating: "Meets", mapped_rating: "Meets", performance_rating: "",
      housing_allowance: 15500, transportation_allowance: 6200, mobile_allowance: 600,
      food_allowance: 1200, shift_allowance: 0, hardship_allowance: 0,
    },
  ];
  // Use full union of headers (template headers + the example custom column) so columns line up.
  const sampleHeaders = Array.from(
    new Set<string>([...(EMPLOYEE_TEMPLATE_HEADERS as readonly string[]), "remote_work_allowance"]),
  );
  const wsEmp = XLSX.utils.json_to_sheet(sample, { header: sampleHeaders });
  wsEmp["!cols"] = sampleHeaders.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, wsEmp, "Employees");

  // ---- Sheet 2: Grade Mapping ----
  const gradeRows = [
    { company_grade: "S1",     app_grade: "G01" },
    { company_grade: "S2",     app_grade: "G02" },
    { company_grade: "Band-A", app_grade: "G01" },
    { company_grade: "L3",     app_grade: "G05" },
    { company_grade: "M1",     app_grade: "G08" },
    { company_grade: "Director", app_grade: "G12" },
  ];
  const wsGrade = XLSX.utils.json_to_sheet(gradeRows, { header: ["company_grade", "app_grade"] });
  wsGrade["!cols"] = [{ wch: 22 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsGrade, "Grade Mapping");

  // ---- Sheet 3: Performance Mapping ----
  const ratingRows = [
    { company_rating: "5",            app_rating: "Outstanding" },
    { company_rating: "Outstanding",  app_rating: "Outstanding" },
    { company_rating: "ممتاز",         app_rating: "Outstanding" },
    { company_rating: "4",            app_rating: "Exceeds" },
    { company_rating: "Exceeds",      app_rating: "Exceeds" },
    { company_rating: "يفوق التوقعات", app_rating: "Exceeds" },
    { company_rating: "3",            app_rating: "Meets" },
    { company_rating: "Meets",        app_rating: "Meets" },
    { company_rating: "يحقق التوقعات", app_rating: "Meets" },
    { company_rating: "2",            app_rating: "Below" },
    { company_rating: "Below",        app_rating: "Below" },
    { company_rating: "دون التوقعات",   app_rating: "Below" },
    { company_rating: "1",            app_rating: "Unsatisfactory" },
    { company_rating: "Unsatisfactory", app_rating: "Unsatisfactory" },
    { company_rating: "غير مرضٍ",      app_rating: "Unsatisfactory" },
  ];
  const wsRate = XLSX.utils.json_to_sheet(ratingRows, { header: ["company_rating", "app_rating"] });
  wsRate["!cols"] = [{ wch: 24 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsRate, "Performance Mapping");

  // ---- Sheet 4: Instructions (EN) ----
  const enLines: string[][] = [
    ["TotalReward — Employee Import Template"],
    [""],
    ["1. Sheet 'Employees' — one row per employee. Required: employee_code, first_name, last_name, base_salary."],
    ["2. Personal info (optional): phone_number, date_of_birth (YYYY-MM-DD), nationality, gender. Age is calculated automatically from date_of_birth."],
    ["3. Employment info (optional): cost_center, business_unit, employment_type (Full-time/Part-time/Contract), employment_status (active/on_leave/terminated), contract_start_date, contract_end_date. Years of service is calculated automatically from hire_date."],
    ["4. Compensation: base_salary is required. currency (e.g. SAR, USD, AED), salary_effective_date (YYYY-MM-DD), target_bonus_percent are optional."],
    ["5. Use 'company_grade' for your internal code (e.g. S1, Band-A, L3). Translate to 'mapped_grade' (G01..G15) directly OR fill the 'Grade Mapping' sheet once and we'll translate automatically."],
    ["6. 'company_rating' is your label; 'mapped_rating' must be one of: Outstanding, Exceeds, Meets, Below, Unsatisfactory. Or fill the 'Performance Mapping' sheet."],
    ["7. STANDARD ALLOWANCES (annual amounts in employee currency): housing_allowance, transportation_allowance, mobile_allowance, food_allowance, shift_allowance, hardship_allowance."],
    ["8. CUSTOM ALLOWANCES: any extra column whose name ends with '_allowance' (e.g. remote_work_allowance, risk_allowance) is imported as a custom allowance for that employee. The column header becomes the allowance name; the cell value is the annual amount."],
    ["9. CUSTOM FIELDS: any other unknown column is imported as a custom employee field, using the column header as the field name. You can also pre-define custom fields in Settings → Employee fields."],
    ["10. Date format: YYYY-MM-DD. Numbers: no thousand separators (e.g. 95000)."],
    ["11. Leave a column empty when you don't have the value."],
    ["12. The grade range supported by the app is G01 to G15. If your company uses more than 15 grades, group the lowest two together into G01."],
    [""],
    ["See the 'Reference Values' sheet for the complete list of accepted values."],
  ];
  const wsEn = XLSX.utils.aoa_to_sheet(enLines);
  wsEn["!cols"] = [{ wch: 120 }];
  XLSX.utils.book_append_sheet(wb, wsEn, "Instructions (EN)");

  // ---- Sheet 5: Instructions (AR) ----
  const arLines: string[][] = [
    ["TotalReward — قالب رفع الموظفين"],
    [""],
    ["١. ورقة «Employees» — صف لكل موظف. الحقول الإلزامية: employee_code، first_name، last_name، base_salary."],
    ["٢. البيانات الشخصية (اختيارية): phone_number، date_of_birth (YYYY-MM-DD)، nationality، gender. يُحتسب العمر تلقائيًا من تاريخ الميلاد."],
    ["٣. بيانات التوظيف (اختيارية): cost_center، business_unit، employment_type (Full-time/Part-time/Contract)، employment_status (active/on_leave/terminated)، contract_start_date، contract_end_date. تُحتسب سنوات الخدمة تلقائيًا من hire_date."],
    ["٤. التعويض: base_salary إلزامي. أعمدة اختيارية: currency (مثل SAR, USD, AED)، salary_effective_date (YYYY-MM-DD)، target_bonus_percent."],
    ["٥. استخدم «company_grade» لدرجة شركتك الداخلية (مثل S1، Band-A، L3). اكتب ما يقابلها في «mapped_grade» باستخدام (G01..G15) أو عبّئ ورقة «Grade Mapping» مرة واحدة وسنحوّل تلقائيًا."],
    ["٦. «company_rating» مسمى التقييم لديكم، و«mapped_rating» يجب أن يكون أحد القيم: Outstanding / Exceeds / Meets / Below / Unsatisfactory. أو استخدم ورقة «Performance Mapping»."],
    ["٧. البدلات القياسية (مبالغ سنوية بعملة الموظف): housing_allowance، transportation_allowance، mobile_allowance، food_allowance، shift_allowance، hardship_allowance."],
    ["٨. البدلات المخصصة: أي عمود إضافي ينتهي اسمه بـ '_allowance' (مثل remote_work_allowance) يُستورد كبدل مخصص لذلك الموظف. اسم العمود يصبح اسم البدل، والقيمة هي المبلغ السنوي."],
    ["٩. الحقول المخصصة: أي عمود غير معروف آخر يُستورد كحقل مخصص للموظف باستخدام اسم العمود كاسم الحقل. يمكنك أيضًا تعريف الحقول المخصصة مسبقًا من «الإعدادات → حقول الموظف»."],
    ["١٠. صيغة التاريخ: YYYY-MM-DD. الأرقام بدون فواصل (مثل: 95000)."],
    ["١١. اترك أي عمود فارغًا إن لم تتوفر قيمته."],
    ["١٢. النطاق المدعوم من ١٥ درجة (G01 إلى G15). إن كانت درجاتكم أكثر من ١٥ يمكن دمج أصغر درجتين معًا في G01."],
    [""],
    ["راجع ورقة «Reference Values» للقيم المقبولة."],
  ];
  const wsAr = XLSX.utils.aoa_to_sheet(arLines);
  wsAr["!cols"] = [{ wch: 120 }];
  XLSX.utils.book_append_sheet(wb, wsAr, "التعليمات (AR)");

  // ---- Sheet 6: Reference Values ----
  const refRows: Record<string, unknown>[] = [];
  const maxLen = Math.max(APP_GRADE_CODES.length, APP_RATINGS.length);
  for (let i = 0; i < maxLen; i++) {
    refRows.push({
      app_grade: APP_GRADE_CODES[i] ?? "",
      app_rating: APP_RATINGS[i] ?? "",
      employment_type_examples: ["Full-time", "Part-time", "Contract", "Intern", "Consultant"][i] ?? "",
      employment_status_examples: ["active", "on_leave", "terminated"][i] ?? "",
      currency_examples: ["USD", "EUR", "SAR", "AED", "EGP"][i] ?? "",
    });
  }
  const wsRef = XLSX.utils.json_to_sheet(refRows, {
    header: ["app_grade", "app_rating", "employment_type_examples", "employment_status_examples", "currency_examples"],
  });
  wsRef["!cols"] = [{ wch: 12 }, { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsRef, "Reference Values");

  XLSX.writeFile(wb, filename);
}
