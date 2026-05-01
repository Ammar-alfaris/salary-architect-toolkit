// Decision-support rules engine.
// Turns raw compensation values into short, professional explanations.
// Each generator returns InsightItem[] suitable for <InsightCard />.

import { compaRatio, rangePenetration, COMPA_BANDS, compaRatioBand } from "@/lib/comp";

export type InsightTone = "info" | "ok" | "warn" | "risk";

export interface InsightItem {
  tone: InsightTone;
  /** i18n key for short badge, e.g. "review_recommended" */
  badgeKey?: string;
  /** i18n key for the headline */
  titleKey: string;
  /** i18n key for the body */
  bodyKey: string;
  /** vars passed to t() interpolation for both title and body */
  vars?: Record<string, string | number>;
}

// ---------- Employee-level insights ----------

export function employeeInsights(opts: {
  base: number;
  midpoint?: number;
  min?: number;
  max?: number;
  peerMedian?: number;
  allowanceTotal?: number;
  bonus?: number;
}): InsightItem[] {
  const items: InsightItem[] = [];
  const { base, midpoint, min, max, peerMedian, allowanceTotal, bonus } = opts;

  if (midpoint && min != null && max != null) {
    const compa = compaRatio(base, midpoint);
    const penet = rangePenetration(base, min, max);

    if (base > max) {
      const overPct = ((base - max) / max) * 100;
      items.push({
        tone: "risk",
        badgeKey: "badge_outside_guideline",
        titleKey: "ins_emp_above_max_title",
        bodyKey: "ins_emp_above_max_body",
        vars: { pct: overPct.toFixed(1) },
      });
    } else if (base < min) {
      const underPct = ((min - base) / min) * 100;
      items.push({
        tone: "warn",
        badgeKey: "badge_attention_needed",
        titleKey: "ins_emp_below_min_title",
        bodyKey: "ins_emp_below_min_body",
        vars: { pct: underPct.toFixed(1) },
      });
    } else if (penet >= 0.85) {
      items.push({
        tone: "warn",
        badgeKey: "badge_review_recommended",
        titleKey: "ins_emp_high_in_range_title",
        bodyKey: "ins_emp_high_in_range_body",
        vars: { pct: (penet * 100).toFixed(0) },
      });
    } else if (penet <= 0.2) {
      items.push({
        tone: "info",
        titleKey: "ins_emp_low_in_range_title",
        bodyKey: "ins_emp_low_in_range_body",
        vars: { pct: (penet * 100).toFixed(0) },
      });
    } else {
      items.push({
        tone: "ok",
        badgeKey: "badge_within_policy",
        titleKey: "ins_emp_in_range_title",
        bodyKey: "ins_emp_in_range_body",
        vars: { compa: compa.toFixed(2) },
      });
    }
  }

  if (peerMedian && peerMedian > 0) {
    const variance = ((base - peerMedian) / peerMedian) * 100;
    if (variance >= 15) {
      items.push({
        tone: "warn",
        titleKey: "ins_emp_above_peer_title",
        bodyKey: "ins_emp_above_peer_body",
        vars: { pct: variance.toFixed(1) },
      });
    } else if (variance <= -15) {
      items.push({
        tone: "warn",
        titleKey: "ins_emp_below_peer_title",
        bodyKey: "ins_emp_below_peer_body",
        vars: { pct: Math.abs(variance).toFixed(1) },
      });
    }
  }

  if (allowanceTotal != null && bonus != null) {
    const tcc = base + bonus + allowanceTotal;
    if (tcc > 0 && allowanceTotal / tcc > 0.35) {
      items.push({
        tone: "info",
        titleKey: "ins_emp_allow_heavy_title",
        bodyKey: "ins_emp_allow_heavy_body",
        vars: { pct: ((allowanceTotal / tcc) * 100).toFixed(0) },
      });
    }
  }

  return items;
}

// ---------- Group / distribution insights ----------

export function distributionInsights(opts: {
  totalEmployees: number;
  bandCounts: Record<string, number>; // keys = COMPA_BANDS values
  avgCompa: number;
}): InsightItem[] {
  const items: InsightItem[] = [];
  const { totalEmployees, bandCounts, avgCompa } = opts;
  if (!totalEmployees) return items;

  const below = (bandCounts["<80%"] ?? 0) / totalEmployees;
  const above = (bandCounts[">110%"] ?? 0) / totalEmployees;

  if (below >= 0.2) {
    items.push({
      tone: "warn",
      badgeKey: "badge_attention_needed",
      titleKey: "ins_dist_many_below_title",
      bodyKey: "ins_dist_many_below_body",
      vars: { pct: (below * 100).toFixed(0) },
    });
  }
  if (above >= 0.2) {
    items.push({
      tone: "risk",
      badgeKey: "badge_budget_risk",
      titleKey: "ins_dist_many_above_title",
      bodyKey: "ins_dist_many_above_body",
      vars: { pct: (above * 100).toFixed(0) },
    });
  }
  if (avgCompa < 0.85) {
    items.push({
      tone: "warn",
      titleKey: "ins_dist_low_avg_title",
      bodyKey: "ins_dist_low_avg_body",
      vars: { compa: avgCompa.toFixed(2) },
    });
  } else if (avgCompa > 1.1) {
    items.push({
      tone: "warn",
      titleKey: "ins_dist_high_avg_title",
      bodyKey: "ins_dist_high_avg_body",
      vars: { compa: avgCompa.toFixed(2) },
    });
  } else {
    items.push({
      tone: "ok",
      badgeKey: "badge_within_policy",
      titleKey: "ins_dist_balanced_title",
      bodyKey: "ins_dist_balanced_body",
      vars: { compa: avgCompa.toFixed(2) },
    });
  }
  return items;
}

export function penetrationInsights(opts: {
  total: number;
  highCount: number; // penet > 0.85
  lowCount: number; // penet < 0.2
  aboveCount: number; // > 1.0
}): InsightItem[] {
  const items: InsightItem[] = [];
  const { total, highCount, lowCount, aboveCount } = opts;
  if (!total) return items;
  if (highCount / total >= 0.25) {
    items.push({
      tone: "warn",
      badgeKey: "badge_review_recommended",
      titleKey: "ins_pen_many_high_title",
      bodyKey: "ins_pen_many_high_body",
      vars: { pct: ((highCount / total) * 100).toFixed(0) },
    });
  }
  if (aboveCount / total >= 0.1) {
    items.push({
      tone: "risk",
      badgeKey: "badge_outside_guideline",
      titleKey: "ins_pen_above_max_title",
      bodyKey: "ins_pen_above_max_body",
      vars: { pct: ((aboveCount / total) * 100).toFixed(0) },
    });
  }
  if (lowCount / total >= 0.3) {
    items.push({
      tone: "info",
      titleKey: "ins_pen_many_low_title",
      bodyKey: "ins_pen_many_low_body",
      vars: { pct: ((lowCount / total) * 100).toFixed(0) },
    });
  }
  if (!items.length) {
    items.push({
      tone: "ok",
      badgeKey: "badge_within_policy",
      titleKey: "ins_pen_healthy_title",
      bodyKey: "ins_pen_healthy_body",
    });
  }
  return items;
}

export function meritBudgetInsights(opts: {
  targetPct: number;
  actualPct: number;
}): InsightItem[] {
  const { targetPct, actualPct } = opts;
  const variance = actualPct - targetPct;
  if (variance > 0.5) {
    return [{
      tone: "risk",
      badgeKey: "badge_budget_risk",
      titleKey: "ins_merit_over_title",
      bodyKey: "ins_merit_over_body",
      vars: { actual: actualPct.toFixed(2), target: targetPct.toFixed(2) },
    }];
  }
  if (variance < -0.5) {
    return [{
      tone: "info",
      titleKey: "ins_merit_under_title",
      bodyKey: "ins_merit_under_body",
      vars: { actual: actualPct.toFixed(2), target: targetPct.toFixed(2) },
    }];
  }
  return [{
    tone: "ok",
    badgeKey: "badge_within_policy",
    titleKey: "ins_merit_on_title",
    bodyKey: "ins_merit_on_body",
    vars: { actual: actualPct.toFixed(2) },
  }];
}

// Helper to bucket compa-ratio counts using shared bands
export function bucketCompaCounts(values: number[]): Record<string, number> {
  const out: Record<string, number> = Object.fromEntries(COMPA_BANDS.map((b) => [b, 0]));
  for (const v of values) out[compaRatioBand(v)]++;
  return out;
}

// Penetration bands
export const PENETRATION_BANDS = ["early", "mid", "high", "above"] as const;
export type PenetrationBand = typeof PENETRATION_BANDS[number];
export function penetrationBand(p: number): PenetrationBand {
  if (p > 1) return "above";
  if (p >= 0.66) return "high";
  if (p >= 0.33) return "mid";
  return "early";
}
