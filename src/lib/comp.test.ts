import { describe, it, expect } from "vitest";
import {
  compaRatio,
  compaRatioBand,
  rangePenetration,
  rangePosition,
  calculateBonus,
  calculateAllowances,
  generateGrades,
  lookupMerit,
  defaultMeritMatrix,
  scaleMatrixToBudget,
  roundTo,
} from "./comp";

describe("compaRatio", () => {
  it("returns base/midpoint", () => {
    expect(compaRatio(9000, 10000)).toBe(0.9);
  });
  it("guards zero midpoint", () => {
    expect(compaRatio(5000, 0)).toBe(0);
  });
});

describe("compaRatioBand", () => {
  it.each([
    [0.7, "<80%"],
    [0.85, "80-90%"],
    [0.95, "90-100%"],
    [1.05, "100-110%"],
    [1.2, ">110%"],
  ])("band(%s) = %s", (c, b) => expect(compaRatioBand(c)).toBe(b));
});

describe("rangePenetration & position", () => {
  it("midpoint at 0.5 penetration", () => {
    expect(rangePenetration(8000, 6000, 10000)).toBe(0.5);
  });
  it("position below/in/above", () => {
    expect(rangePosition(5000, 6000, 10000)).toBe("below");
    expect(rangePosition(8000, 6000, 10000)).toBe("in");
    expect(rangePosition(11000, 6000, 10000)).toBe("above");
  });
});

describe("calculateBonus", () => {
  it("compounds multipliers", () => {
    const v = calculateBonus({
      baseSalary: 100000,
      targetBonusPercent: 10,
      performanceMultiplier: 1.2,
      businessMultiplier: 1,
      individualModifier: 1,
      prorationFactor: 1,
    });
    expect(v).toBe(12000);
  });
});

describe("calculateAllowances", () => {
  it("sums all components", () => {
    const r = calculateAllowances({
      baseSalary: 10000,
      housingPercent: 25,
      transportPercent: 10,
      mobileAmount: 200,
      educationAmount: 0,
      shiftPercent: 0,
      hardshipPercent: 0,
      customAmount: 100,
    });
    expect(r.housing).toBe(2500);
    expect(r.transport).toBe(1000);
    expect(r.total).toBe(3800);
  });
});

describe("generateGrades", () => {
  it("creates N grades progressing upward", () => {
    const g = generateGrades({
      gradeCount: 3,
      startingMidpoint: 5000,
      progressionPercent: 10,
      spreadPercent: 40,
      rounding: 1,
    });
    expect(g).toHaveLength(3);
    expect(g[0].midpoint).toBe(5000);
    expect(g[1].midpoint).toBe(5500);
    expect(g[2].midpoint).toBe(6050);
    expect(g[0].minimum).toBeLessThan(g[0].midpoint);
    expect(g[0].maximum).toBeGreaterThan(g[0].midpoint);
  });
});

describe("merit matrix", () => {
  it("default has all band x rating combos", () => {
    expect(defaultMeritMatrix()).toHaveLength(20);
  });
  it("lookup returns rule pct", () => {
    const m = defaultMeritMatrix();
    expect(lookupMerit(m, "Meets", 0.95)).toBe(3);
  });
  it("scaling preserves shape", () => {
    const m = defaultMeritMatrix();
    const scaled = scaleMatrixToBudget(m, 6, 4);
    expect(scaled).toHaveLength(20);
    expect(scaled[0].recommended_increase_percent).toBeGreaterThanOrEqual(0);
  });
});

describe("roundTo", () => {
  it("rounds to nearest step", () => {
    expect(roundTo(1234, 100)).toBe(1200);
    expect(roundTo(1250, 100)).toBe(1300);
    expect(roundTo(7, 0)).toBe(7);
  });
});
