import { describe, it, expect } from "vitest";
import { fmtCurrency, fmtNumber, fmtPercent, fmtDate, fmtDateTime } from "./format";

describe("fmtCurrency", () => {
  it("handles null / NaN", () => {
    expect(fmtCurrency(null)).toBe("—");
    expect(fmtCurrency(undefined)).toBe("—");
    expect(fmtCurrency(NaN)).toBe("—");
  });
  it("uses SAR override in English", () => {
    expect(fmtCurrency(1500, "SAR", "en")).toContain("SAR");
    expect(fmtCurrency(1500, "SAR", "en")).toContain("1,500");
  });
  it("uses ر.س symbol in Arabic", () => {
    expect(fmtCurrency(1500, "SAR", "ar")).toContain("ر.س");
  });
  it("falls back gracefully on unknown currency", () => {
    const out = fmtCurrency(100, "XXX", "en");
    expect(out.length).toBeGreaterThan(0);
    expect(out).not.toBe("—");
  });
});

describe("fmtPercent", () => {
  it("renders English percent", () => {
    expect(fmtPercent(12.5, "en", 1)).toMatch(/12\.5%/);
  });
  it("handles null", () => {
    expect(fmtPercent(null)).toBe("—");
  });
});

describe("fmtNumber", () => {
  it("formats with grouping", () => {
    expect(fmtNumber(1234.5, "en")).toMatch(/1,234/);
  });
});

describe("fmtDate / fmtDateTime", () => {
  const iso = "2026-03-15T10:30:00Z";
  it("returns dash for invalid", () => {
    expect(fmtDate(null)).toBe("—");
    expect(fmtDate("not-a-date")).toBe("—");
  });
  it("wraps with bidi isolate marks so RTL containers stay LTR", () => {
    const out = fmtDate(iso, "ar");
    expect(out.startsWith("\u2066")).toBe(true);
    expect(out.endsWith("\u2069")).toBe(true);
  });
  it("uses 2-digit day & month in English", () => {
    const out = fmtDate(iso, "en");
    expect(out).toMatch(/15\/03\/2026/);
  });
  it("datetime includes hour & minute 24h", () => {
    const out = fmtDateTime(iso, "en");
    expect(out).toMatch(/\d{2}:\d{2}/);
  });
});
