// Auto-link employees to salary grades + suggest a structure from employee data.
import { supabase } from "@/integrations/supabase/client";

export interface GradeRow {
  id: string;
  salary_structure_id: string;
  midpoint: number | string;
  minimum: number | string;
  maximum: number | string;
  sequence?: number;
}

export interface EmployeeRow {
  id: string;
  base_salary: number | string;
  grade_id?: string | null;
}

export interface AssignResult {
  matched: number;
  outOfRange: number;
  unchanged: number;
}

/** Pick best-fit grade for a salary: in-range first, else nearest midpoint. */
export function pickGrade(salary: number, grades: GradeRow[]): { gradeId: string; inRange: boolean } | null {
  if (!grades.length) return null;
  const inRange = grades.find((g) => salary >= Number(g.minimum) && salary <= Number(g.maximum));
  if (inRange) return { gradeId: inRange.id, inRange: true };
  let best = grades[0];
  let bestDiff = Math.abs(salary - Number(best.midpoint));
  for (const g of grades) {
    const d = Math.abs(salary - Number(g.midpoint));
    if (d < bestDiff) { best = g; bestDiff = d; }
  }
  return { gradeId: best.id, inRange: false };
}

/** Update all employees in an org so each is linked to a grade in the chosen structure. */
export async function autoAssignGrades(
  organizationId: string,
  structureId: string,
  opts: { onlyUnassigned?: boolean } = {},
): Promise<AssignResult> {
  const [{ data: grades }, { data: employees }] = await Promise.all([
    supabase.from("salary_grades").select("id,salary_structure_id,midpoint,minimum,maximum,sequence").eq("salary_structure_id", structureId),
    supabase.from("employees").select("id,base_salary,grade_id").eq("organization_id", organizationId).eq("archived", false),
  ]);
  const gs: GradeRow[] = (grades ?? []) as any;
  const emps: EmployeeRow[] = (employees ?? []) as any;
  if (!gs.length || !emps.length) return { matched: 0, outOfRange: 0, unchanged: 0 };

  let matched = 0, outOfRange = 0, unchanged = 0;
  const updates: { id: string; grade_id: string; salary_structure_id: string }[] = [];
  for (const e of emps) {
    if (opts.onlyUnassigned && e.grade_id) { unchanged++; continue; }
    const pick = pickGrade(Number(e.base_salary) || 0, gs);
    if (!pick) { unchanged++; continue; }
    if (e.grade_id === pick.gradeId) { unchanged++; }
    else updates.push({ id: e.id, grade_id: pick.gradeId, salary_structure_id: structureId });
    if (pick.inRange) matched++; else outOfRange++;
  }
  // Batch updates (one per row — small org sizes; acceptable for now).
  for (const u of updates) {
    await supabase.from("employees").update({ grade_id: u.grade_id, salary_structure_id: u.salary_structure_id }).eq("id", u.id);
  }
  return { matched, outOfRange, unchanged };
}

/** Suggest structure parameters that cover the company's existing salary range. */
export interface SuggestedStructure {
  gradeCount: number;
  startingMidpoint: number;
  progressionPercent: number;
  spreadPercent: number;
  rounding: number;
}
export function suggestStructureFromSalaries(salaries: number[]): SuggestedStructure | null {
  const clean = salaries.filter((s) => Number.isFinite(s) && s > 0).sort((a, b) => a - b);
  if (clean.length < 2) return null;
  const min = clean[Math.floor(clean.length * 0.05)] ?? clean[0];
  const max = clean[Math.floor(clean.length * 0.95)] ?? clean[clean.length - 1];
  const gradeCount = Math.min(12, Math.max(6, Math.round(Math.log2(max / min) * 2.5) || 8));
  const spreadPercent = 40;
  // start the lowest grade ~10% below observed min so its minimum still covers it
  const startingMidpoint = Math.max(1, Math.round((min / (1 - spreadPercent / 200)) / 100) * 100);
  // progression that lets the top grade midpoint reach the max
  const ratio = max / startingMidpoint;
  const progressionPercent = Math.max(6, Math.min(20, Math.round((Math.pow(ratio, 1 / (gradeCount - 1)) - 1) * 1000) / 10));
  return { gradeCount, startingMidpoint, progressionPercent, spreadPercent, rounding: 100 };
}
