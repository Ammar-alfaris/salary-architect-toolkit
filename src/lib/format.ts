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

/**
 * Locale-aware date formatter that ALWAYS returns a stable, unambiguous
 * day-first string and is safe to drop into RTL containers.
 *
 * Bare `new Date(...).toLocaleDateString()` was producing broken strings
 * like `232026/7/` when the browser locale was Arabic and the surrounding
 * UI was English — the day got bidi-glued onto the year. We pin the
 * formatter to `en-GB` (English UI) or `ar` with Gregorian calendar (Arabic
 * UI) and Latin digits so dates render the same on every device.
 *
 * Wrap the return value in `<span dir="ltr">` (or `<bdi>`) when rendered
 * inside an RTL container to keep the slashes from getting reordered.
 */
export function fmtDate(value: Date | string | number | null | undefined, locale: string = "en"): string {
  if (value == null) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "—";
  const tag = locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB";
  try {
    return new Intl.DateTimeFormat(tag, { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function fmtDateTime(value: Date | string | number | null | undefined, locale: string = "en"): string {
  if (value == null) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "—";
  const tag = locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB";
  try {
    return new Intl.DateTimeFormat(tag, {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 16).replace("T", " ");
  }
}
