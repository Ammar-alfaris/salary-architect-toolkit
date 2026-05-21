import { z } from "zod";

const today = () => new Date().toISOString().slice(0, 10);

const optStr = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal("")).transform((v) => v ?? "");

const optDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "invalid_date")
  .optional()
  .or(z.literal(""))
  .transform((v) => v ?? "");

export const employeeFormSchema = z
  .object({
    employee_code: optStr(64),
    first_name: z.string().trim().min(1, "first_name_required").max(100),
    last_name: z.string().trim().min(1, "last_name_required").max(100),
    email: z
      .string()
      .trim()
      .email("invalid_email")
      .max(255)
      .optional()
      .or(z.literal(""))
      .transform((v) => v ?? ""),
    phone_number: z
      .string()
      .trim()
      .max(32)
      .regex(/^[+\d\s\-()]*$/, "invalid_phone")
      .optional()
      .or(z.literal(""))
      .transform((v) => v ?? ""),
    date_of_birth: optDate,
    nationality: optStr(80),
    gender: optStr(20),
    department: optStr(120),
    job_title: optStr(120),
    job_family: optStr(120),
    location: optStr(120),
    cost_center: optStr(80),
    business_unit: optStr(120),
    employment_type: optStr(40),
    employment_status: z.enum(["active", "on_leave", "terminated"]).default("active"),
    hire_date: optDate,
    contract_start_date: optDate,
    contract_end_date: optDate,
    manager_name: optStr(200),
    base_salary: z
      .number({ invalid_type_error: "invalid_salary" })
      .min(0, "salary_non_negative")
      .max(100_000_000, "salary_too_large"),
    target_bonus_percent: z
      .number({ invalid_type_error: "invalid_bonus" })
      .min(0, "bonus_non_negative")
      .max(200, "bonus_too_large"),
    grade_id: optStr(64),
    performance_rating: optStr(40),
  })
  .superRefine((v, ctx) => {
    const t = today();
    if (v.date_of_birth && v.date_of_birth > t) {
      ctx.addIssue({ code: "custom", path: ["date_of_birth"], message: "dob_in_future" });
    }
    if (v.hire_date && v.hire_date > t) {
      ctx.addIssue({ code: "custom", path: ["hire_date"], message: "hire_in_future" });
    }
    if (
      v.contract_start_date &&
      v.contract_end_date &&
      v.contract_end_date < v.contract_start_date
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["contract_end_date"],
        message: "contract_end_before_start",
      });
    }
  });

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export function validateEmployeeForm(input: unknown):
  | { ok: true; data: EmployeeFormValues }
  | { ok: false; message: string } {
  const parsed = employeeFormSchema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  const first = parsed.error.issues[0];
  const field = first.path.join(".") || "form";
  return { ok: false, message: `${field}: ${first.message}` };
}
