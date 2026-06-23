import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

// Country (ISO-2) → preferred currency. Defaults to USD for any country not listed.
const COUNTRY_CURRENCY: Record<string, string> = {
  SA: "SAR", US: "USD", GB: "GBP",
  AE: "AED", KW: "KWD", QA: "QAR", BH: "BHD", OM: "OMR",
  EG: "EGP", JO: "JOD", LB: "USD", IQ: "USD", YE: "USD",
  TR: "TRY", IN: "INR", PK: "PKR",
  CA: "USD", AU: "USD", NZ: "USD", JP: "JPY", CN: "USD", HK: "USD", SG: "USD", MY: "USD",
  // Eurozone
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", BE: "EUR", AT: "EUR", IE: "EUR",
  PT: "EUR", FI: "EUR", GR: "EUR", LU: "EUR", SK: "EUR", SI: "EUR", EE: "EUR", LV: "EUR",
  LT: "EUR", CY: "EUR", MT: "EUR", HR: "EUR",
};

export type VisitorPricing = {
  country: string;
  currency: string;
  /** Multiplier: price_in_quote = price_in_SAR * rate. */
  rate: number;
  /** ISO timestamp of when the FX rate was last fetched (null if unavailable). */
  fetched_at: string | null;
};

export const getVisitorCurrency = createServerFn({ method: "GET" }).handler(async (): Promise<VisitorPricing> => {
  // 1. Detect country from edge headers.
  const country = (
    getRequestHeader("cf-ipcountry") ||
    getRequestHeader("x-vercel-ip-country") ||
    getRequestHeader("x-country-code") ||
    ""
  ).toUpperCase().slice(0, 2);

  const currency = COUNTRY_CURRENCY[country] || "USD";

  // SAR is the base — no lookup needed.
  if (currency === "SAR") {
    return { country: country || "SA", currency: "SAR", rate: 1, fetched_at: new Date().toISOString() };
  }

  // 2. Read cached FX rate from public table via publishable key (RLS allows anon SELECT).
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data } = await supabase
      .from("fx_rates")
      .select("rate, fetched_at")
      .eq("base_currency", "SAR")
      .eq("quote_currency", currency)
      .maybeSingle();
    if (data?.rate) {
      return { country, currency, rate: Number(data.rate), fetched_at: data.fetched_at as string };
    }
  } catch {
    // fall through to SAR fallback
  }

  // 3. Fallback: no FX cached yet → show SAR.
  return { country: country || "SA", currency: "SAR", rate: 1, fetched_at: null };
});
