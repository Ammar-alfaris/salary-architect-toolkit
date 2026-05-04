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
  // Find sheets by fuzzy name match
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

export const EMPLOYEE_TEMPLATE_HEADERS = [
  "employee_code",
  "first_name",
  "last_name",
  "email",
  "department",
  "job_title",
  "job_family",
  "location",
  "company_grade",
  "mapped_grade",
  "grade_code",
  "base_salary",
  "target_bonus_percent",
  "company_rating",
  "mapped_rating",
  "performance_rating",
  "hire_date",
  "manager_name",
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
      department: "Engineering", job_title: "Senior Engineer", job_family: "Software", location: "Dubai",
      company_grade: "S3", mapped_grade: "G05", grade_code: "",
      base_salary: 95000, target_bonus_percent: 15,
      company_rating: "5 - Outstanding", mapped_rating: "Outstanding", performance_rating: "",
      hire_date: "2022-03-15", manager_name: "Ahmed Hassan",
    },
    {
      employee_code: "EMP-1002",
      first_name: "Omar", last_name: "Ali", email: "omar.ali@company.com",
      department: "Sales", job_title: "Account Executive", job_family: "Sales", location: "Riyadh",
      company_grade: "Band-B", mapped_grade: "G03", grade_code: "",
      base_salary: 62000, target_bonus_percent: 25,
      company_rating: "Meets", mapped_rating: "Meets", performance_rating: "",
      hire_date: "2023-08-01", manager_name: "Karim Adel",
    },
  ];
  const wsEmp = XLSX.utils.json_to_sheet(sample, { header: [...EMPLOYEE_TEMPLATE_HEADERS] });
  wsEmp["!cols"] = EMPLOYEE_TEMPLATE_HEADERS.map(() => ({ wch: 18 }));
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
  const enLines: (string | string[])[] = [
    ["TotalReward — Employee Import Template"],
    [""],
    ["1. Sheet 'Employees' — one row per employee. Required: employee_code, first_name, last_name, base_salary."],
    ["2. Use 'company_grade' for the code your company uses (e.g. S1, Band-A, L3, M1)."],
    ["3. Translate it to one of our standard grades in 'mapped_grade' (G01..G15) — or leave blank and fill the 'Grade Mapping' sheet, we'll translate automatically."],
    ["4. 'company_rating' is your company's label; 'mapped_rating' must be one of: Outstanding, Exceeds, Meets, Below, Unsatisfactory."],
    ["5. Use the 'Grade Mapping' sheet to define every internal grade once — the importer reuses it for all rows."],
    ["6. Use the 'Performance Mapping' sheet the same way for ratings."],
    ["7. Date format: YYYY-MM-DD. Numbers: no thousand separators (e.g. 95000)."],
    ["8. Leave a column empty if you don't have the value — only employee_code, first_name, last_name, base_salary are required."],
    ["9. After upload we'll show: how many were imported, and any unmapped grades/ratings to fix."],
    ["10. The grade range supported by the app is G01 to G15. If your company uses more than 15 grades, group the lowest two together into G01."],
    [""],
    ["See the 'Reference Values' sheet for the complete list of accepted values."],
  ];
  const wsEn = XLSX.utils.aoa_to_sheet(enLines);
  wsEn["!cols"] = [{ wch: 110 }];
  XLSX.utils.book_append_sheet(wb, wsEn, "Instructions (EN)");

  // ---- Sheet 5: Instructions (AR) ----
  const arLines: (string | string[])[] = [
    ["TotalReward — قالب رفع الموظفين"],
    [""],
    ["١. ورقة «Employees» — صف لكل موظف. الحقول الإلزامية: employee_code، first_name، last_name، base_salary."],
    ["٢. استخدم عمود «company_grade» لكتابة درجة الموظف كما هي في شركتك (مثل S1، Band-A، L3، M1)."],
    ["٣. اكتب ما تقابلها لدينا في عمود «mapped_grade» باستخدام درجاتنا القياسية (G01..G15)، أو اتركه فارغًا وعبّئ ورقة «Grade Mapping» وسنحوّله تلقائيًا."],
    ["٤. عمود «company_rating» يحمل مسمى التقييم لديكم، وعمود «mapped_rating» يجب أن يكون أحد القيم: Outstanding / Exceeds / Meets / Below / Unsatisfactory."],
    ["٥. استخدم ورقة «Grade Mapping» لتعريف كل درجة داخلية مرة واحدة، وسيقوم النظام بإسقاطها على جميع الصفوف."],
    ["٦. استخدم ورقة «Performance Mapping» بنفس الطريقة لمعادلة مسميات التقييم."],
    ["٧. صيغة التاريخ: YYYY-MM-DD. الأرقام بدون فاصل آلاف (مثال: 95000)."],
    ["٨. اترك أي عمود فارغًا إن لم تتوفر قيمته. الإلزامي فقط: employee_code، first_name، last_name، base_salary."],
    ["٩. بعد الرفع سيظهر لك ملخّص بعدد الموظفين المُدرجين، وأي درجات أو تقييمات لم تُطابَق لتصحيحها."],
    ["١٠. النطاق المدعوم من ١٥ درجة (G01 إلى G15). إن كان عدد درجات شركتكم أكثر من ١٥ يمكن دمج أصغر درجتين معًا في G01."],
    [""],
    ["راجع ورقة «Reference Values» للاطلاع على جميع القيم المقبولة."],
  ];
  const wsAr = XLSX.utils.aoa_to_sheet(arLines);
  wsAr["!cols"] = [{ wch: 110 }];
  XLSX.utils.book_append_sheet(wb, wsAr, "التعليمات (AR)");

  // ---- Sheet 6: Reference Values ----
  const refRows: Record<string, unknown>[] = [];
  const maxLen = Math.max(APP_GRADE_CODES.length, APP_RATINGS.length);
  for (let i = 0; i < maxLen; i++) {
    refRows.push({
      app_grade: APP_GRADE_CODES[i] ?? "",
      app_rating: APP_RATINGS[i] ?? "",
      currency_examples: ["USD", "EUR", "SAR", "AED", "EGP"][i] ?? "",
    });
  }
  const wsRef = XLSX.utils.json_to_sheet(refRows, { header: ["app_grade", "app_rating", "currency_examples"] });
  wsRef["!cols"] = [{ wch: 12 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsRef, "Reference Values");

  XLSX.writeFile(wb, filename);
}
