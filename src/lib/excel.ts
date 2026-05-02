import * as XLSX from "xlsx";

/**
 * Export an array of plain objects to an .xlsx file.
 * Each object becomes a row; keys become column headers.
 */
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

/**
 * Multi-sheet workbook export.
 */
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

/**
 * Parse the first worksheet of an uploaded .xlsx/.csv file into rows.
 */
export async function parseXLSX(file: File): Promise<Record<string, unknown>[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
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
  "grade_code",
  "base_salary",
  "target_bonus_percent",
  "performance_rating",
  "hire_date",
  "manager_name",
] as const;

export function downloadEmployeeTemplate(filename = "employees_template.xlsx") {
  const sample: Record<string, unknown>[] = [
    {
      employee_code: "EMP-1001",
      first_name: "Sara",
      last_name: "Khan",
      email: "sara.khan@company.com",
      department: "Engineering",
      job_title: "Senior Engineer",
      job_family: "Software",
      location: "Dubai",
      grade_code: "G05",
      base_salary: 95000,
      target_bonus_percent: 15,
      performance_rating: "Exceeds",
      hire_date: "2022-03-15",
      manager_name: "Ahmed Hassan",
    },
  ];
  // Build sheet to enforce column order even with one row.
  const ws = XLSX.utils.json_to_sheet(sample, { header: [...EMPLOYEE_TEMPLATE_HEADERS] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Employees");
  XLSX.writeFile(wb, filename);
}
