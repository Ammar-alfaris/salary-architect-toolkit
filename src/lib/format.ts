export function fmtCurrency(value: number | null | undefined, currency = "USD", locale = "en") {
  if (value == null || isNaN(value)) return "—";
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
