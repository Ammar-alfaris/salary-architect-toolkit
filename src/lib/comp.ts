// Central compensation formulas — single source of truth.

export interface GradeRange {
  sequence: number;
  grade_code: string;
  grade_name: string;
  midpoint: number;
  minimum: number;
  maximum: number;
  spread_percent: number;
  progression_percent: number;
}

export interface StructureInput {
  gradeCount: number;
  startingMidpoint: number;
  progressionPercent: number; // e.g. 12 means +12% per grade
  spreadPercent: number;       // e.g. 40 means min/max ±20% around midpoint
  rounding: number;            // 1, 10, 50, 100, 500
}

export function roundTo(value: number, rounding: number): number {
  if (!rounding || rounding < 1) return Math.round(value);
  return Math.round(value / rounding) * rounding;
}

/** Generate min/mid/max for each grade based on standard comp methodology. */
export function generateGrades(input: StructureInput): GradeRange[] {
  const grades: GradeRange[] = [];
  const half = input.spreadPercent / 200; // spread%/2 as decimal
  let midpoint = input.startingMidpoint;
  for (let i = 0; i < input.gradeCount; i++) {
    if (i > 0) midpoint = midpoint * (1 + input.progressionPercent / 100);
    const min = roundTo(midpoint * (1 - half), input.rounding);
    const max = roundTo(midpoint * (1 + half), input.rounding);
    const mid = roundTo(midpoint, input.rounding);
    grades.push({
      sequence: i + 1,
      grade_code: `G${String(i + 1).padStart(2, "0")}`,
      grade_name: `Grade ${i + 1}`,
      midpoint: mid,
      minimum: min,
      maximum: max,
      spread_percent: input.spreadPercent,
      progression_percent: i === 0 ? 0 : input.progressionPercent,
    });
  }
  return grades;
}

/** Compa-ratio = base salary / midpoint */
export function compaRatio(base: number, midpoint: number): number {
  if (!midpoint) return 0;
  return base / midpoint;
}

/** Range penetration = (base - min) / (max - min) */
export function rangePenetration(base: number, min: number, max: number): number {
  if (max === min) return 0;
  return (base - min) / (max - min);
}

/** Where in range an employee sits */
export function rangePosition(base: number, min: number, max: number): "below" | "in" | "above" {
  if (base < min) return "below";
  if (base > max) return "above";
  return "in";
}

export interface BonusInput {
  baseSalary: number;
  targetBonusPercent: number;
  performanceMultiplier: number;
  businessMultiplier: number;
  individualModifier: number;
  prorationFactor: number;
}

export function calculateBonus(i: BonusInput): number {
  return (
    i.baseSalary *
    (i.targetBonusPercent / 100) *
    i.performanceMultiplier *
    i.businessMultiplier *
    i.individualModifier *
    i.prorationFactor
  );
}

/** Recommended merit % from a matrix lookup. Returns 0 if no rule found. */
export function lookupMerit(
  matrix: { performance_rating: string; compa_ratio_band: string; recommended_increase_percent: number }[],
  performance: string,
  compa: number,
): number {
  const band = compaRatioBand(compa);
  const rule = matrix.find((r) => r.performance_rating === performance && r.compa_ratio_band === band);
  return rule?.recommended_increase_percent ?? 0;
}

export function compaRatioBand(compa: number): string {
  if (compa < 0.8) return "<80%";
  if (compa < 0.9) return "80-90%";
  if (compa < 1.0) return "90-100%";
  if (compa < 1.1) return "100-110%";
  return ">110%";
}

export const COMPA_BANDS = ["<80%", "80-90%", "90-100%", "100-110%", ">110%"];
export const PERFORMANCE_RATINGS = ["Outstanding", "Exceeds", "Meets", "Below"];

/** Default merit matrix used as a starting point. */
export function defaultMeritMatrix(): { performance_rating: string; compa_ratio_band: string; recommended_increase_percent: number }[] {
  const table: Record<string, number[]> = {
    Outstanding: [8, 7, 6, 5, 3],
    Exceeds: [6, 5, 4, 3, 2],
    Meets: [4, 3.5, 3, 2, 1],
    Below: [1.5, 1, 0.5, 0, 0],
  };
  const rules: { performance_rating: string; compa_ratio_band: string; recommended_increase_percent: number }[] = [];
  for (const rating of PERFORMANCE_RATINGS) {
    COMPA_BANDS.forEach((band, idx) => {
      rules.push({ performance_rating: rating, compa_ratio_band: band, recommended_increase_percent: table[rating][idx] });
    });
  }
  return rules;
}

export interface AllowanceInput {
  baseSalary: number;
  housingPercent: number;
  transportPercent: number;
  mobileAmount: number;
  educationAmount: number;
  shiftPercent: number;
  hardshipPercent: number;
  customAmount: number;
}

export function calculateAllowances(i: AllowanceInput) {
  const housing = i.baseSalary * (i.housingPercent / 100);
  const transport = i.baseSalary * (i.transportPercent / 100);
  const shift = i.baseSalary * (i.shiftPercent / 100);
  const hardship = i.baseSalary * (i.hardshipPercent / 100);
  const total = housing + transport + i.mobileAmount + i.educationAmount + shift + hardship + i.customAmount;
  return {
    housing,
    transport,
    mobile: i.mobileAmount,
    education: i.educationAmount,
    shift,
    hardship,
    custom: i.customAmount,
    total,
  };
}

export function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
