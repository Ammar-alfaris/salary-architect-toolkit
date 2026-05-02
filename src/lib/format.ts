// Currency symbol overrides per locale (cosmetic only — Intl handles the rest).
const SYMBOL_OVERRIDES: Record<string, { ar?: string; en?: string }> = {
  SAR: { ar: "ر.س", en: "SAR" },
};

export function fmtCurrency(value: number | null | undefined, currency = "USD", locale = "en") {
  if (value == null || isNaN(value)) return "—";
  const override = SYMBOL_OVERRIDES[currency]?.[locale === "ar" ? "ar" : "en"];
  if (override) {
    const num = new Intl.NumberFormat(locale === "ar" ? "ar" : "en-US", {
      maximumFractionDigits: 0,
    }).format(value);
    return locale === "ar" ? `${num} ${override}` : `${override} ${num}`;
  }
  try {
    return new Intl.NumberFormat(locale === "ar" ? "ar" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

export function fmtNumber(value: number | null | undefined, locale = "en") {
  if (value == null || isNaN(value)) return "—";
  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en-US", { maximumFractionDigits: 1 }).format(value);
}

export function fmtPercent(value: number | null | undefined, locale = "en", digits = 1) {
  if (value == null || isNaN(value)) return "—";
  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en-US", {
    style: "percent",
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value / 100);
}
