// Pay equity analysis — gap detection by job_family + grade.
// Defines a peer cohort (same job_family AND grade), computes median, flags variance.

export interface EquityEmployee {
  id: string;
  full_name: string | null;
  department: string | null;
  job_title: string | null;
  job_family: string | null;
  grade_id: string | null;
  base_salary: number;
}

export type EquityFlagType =
  | "outlier_high"
  | "outlier_low"
  | "compression"
  | "inversion"
  | "small_cohort";

export interface EquityRow {
  employee: EquityEmployee;
  cohortKey: string; // e.g. "Engineering|G05"
  cohortSize: number;
  peerMedian: number;
  variancePct: number; // (base - median)/median * 100
  flag: EquityFlagType | null;
}

export interface CohortSummary {
  key: string;
  jobFamily: string;
  gradeCode: string;
  size: number;
  median: number;
  min: number;
  max: number;
  spreadPct: number; // (max-min)/median*100
  outlierCount: number;
}

const median = (vals: number[]): number => {
  if (!vals.length) return 0;
  const s = [...vals].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function analyzeEquity(opts: {
  employees: EquityEmployee[];
  grades: { id: string; grade_code: string; sequence: number; midpoint: number }[];
  /** % variance from peer median that flags an outlier. Default 15. */
  outlierThreshold?: number;
}): { rows: EquityRow[]; cohorts: CohortSummary[] } {
  const threshold = opts.outlierThreshold ?? 15;
  const gradeMap = new Map(opts.grades.map((g) => [g.id, g]));

  // Build cohorts only when both job_family and grade exist
  const cohortBuckets = new Map<string, EquityEmployee[]>();
  for (const e of opts.employees) {
    if (!e.job_family || !e.grade_id) continue;
    const g = gradeMap.get(e.grade_id);
    if (!g) continue;
    const key = `${e.job_family}|${g.grade_code}`;
    if (!cohortBuckets.has(key)) cohortBuckets.set(key, []);
    cohortBuckets.get(key)!.push(e);
  }

  const cohortStats = new Map<string, { median: number; size: number; min: number; max: number }>();
  cohortBuckets.forEach((emps, key) => {
    const vals = emps.map((x) => Number(x.base_salary)).filter((v) => v > 0);
    cohortStats.set(key, {
      median: median(vals),
      size: vals.length,
      min: Math.min(...vals),
      max: Math.max(...vals),
    });
  });

  const rows: EquityRow[] = [];
  for (const e of opts.employees) {
    if (!e.job_family || !e.grade_id) continue;
    const g = gradeMap.get(e.grade_id);
    if (!g) continue;
    const key = `${e.job_family}|${g.grade_code}`;
    const stats = cohortStats.get(key)!;
    if (stats.size < 2) {
      rows.push({
        employee: e,
        cohortKey: key,
        cohortSize: stats.size,
        peerMedian: stats.median,
        variancePct: 0,
        flag: "small_cohort",
      });
      continue;
    }
    const variance = stats.median ? ((Number(e.base_salary) - stats.median) / stats.median) * 100 : 0;
    let flag: EquityFlagType | null = null;
    if (variance >= threshold) flag = "outlier_high";
    else if (variance <= -threshold) flag = "outlier_low";
    rows.push({
      employee: e,
      cohortKey: key,
      cohortSize: stats.size,
      peerMedian: stats.median,
      variancePct: variance,
      flag,
    });
  }

  // Compression / inversion: compare adjacent grades within same family
  const familyGradeMedians = new Map<string, Map<number, { gradeCode: string; gradeId: string; median: number }>>();
  cohortBuckets.forEach((emps, key) => {
    const [family, gradeCode] = key.split("|");
    const grade = opts.grades.find((g) => g.grade_code === gradeCode);
    if (!grade) return;
    if (!familyGradeMedians.has(family)) familyGradeMedians.set(family, new Map());
    const stats = cohortStats.get(key)!;
    familyGradeMedians.get(family)!.set(grade.sequence, {
      gradeCode,
      gradeId: grade.id,
      median: stats.median,
    });
  });

  // Tag inversion (lower grade median > higher grade median by >2%)
  familyGradeMedians.forEach((seqMap) => {
    const sequences = Array.from(seqMap.keys()).sort((a, b) => a - b);
    for (let i = 0; i < sequences.length - 1; i++) {
      const lower = seqMap.get(sequences[i])!;
      const higher = seqMap.get(sequences[i + 1])!;
      if (lower.median > higher.median * 1.02) {
        // mark all employees in higher grade cohort
        const higherKey = `${[...familyGradeMedians.entries()].find(([, m]) => m === seqMap)![0]}|${higher.gradeCode}`;
        rows
          .filter((r) => r.cohortKey === higherKey && r.flag == null)
          .forEach((r) => (r.flag = "inversion"));
      } else if (higher.median > 0 && (higher.median - lower.median) / higher.median < 0.05) {
        const higherKey = `${[...familyGradeMedians.entries()].find(([, m]) => m === seqMap)![0]}|${higher.gradeCode}`;
        rows
          .filter((r) => r.cohortKey === higherKey && r.flag == null)
          .forEach((r) => (r.flag = "compression"));
      }
    }
  });

  const cohorts: CohortSummary[] = Array.from(cohortBuckets.entries()).map(([key, emps]) => {
    const [family, gradeCode] = key.split("|");
    const stats = cohortStats.get(key)!;
    const outliers = rows.filter((r) => r.cohortKey === key && (r.flag === "outlier_high" || r.flag === "outlier_low")).length;
    return {
      key,
      jobFamily: family,
      gradeCode,
      size: stats.size,
      median: stats.median,
      min: stats.min,
      max: stats.max,
      spreadPct: stats.median ? ((stats.max - stats.min) / stats.median) * 100 : 0,
      outlierCount: outliers,
    };
  }).sort((a, b) => b.outlierCount - a.outlierCount || b.size - a.size);

  return { rows, cohorts };
}
