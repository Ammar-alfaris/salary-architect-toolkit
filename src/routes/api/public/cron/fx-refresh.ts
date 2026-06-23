import { createFileRoute } from "@tanstack/react-router";

const SYMBOLS = ["USD", "AED", "KWD", "QAR", "BHD", "OMR", "EGP", "JOD", "GBP", "EUR", "TRY", "INR", "PKR", "JPY"];

export const Route = createFileRoute("/api/public/cron/fx-refresh")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401, headers: { "Content-Type": "application/json" },
          });
        }

        // exchangerate.host — free, no API key required.
        const url = `https://api.exchangerate.host/latest?base=SAR&symbols=${SYMBOLS.join(",")}`;
        const res = await fetch(url);
        if (!res.ok) {
          return new Response(JSON.stringify({ ok: false, status: res.status }), {
            status: 502, headers: { "Content-Type": "application/json" },
          });
        }
        const json = (await res.json()) as { rates?: Record<string, number> };
        const rates = json.rates || {};

        const rows = Object.entries(rates)
          .filter(([, r]) => typeof r === "number" && r > 0)
          .map(([quote, rate]) => ({
            base_currency: "SAR",
            quote_currency: quote,
            rate,
            fetched_at: new Date().toISOString(),
          }));

        if (rows.length === 0) {
          return new Response(JSON.stringify({ ok: false, error: "no rates" }), {
            status: 502, headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("fx_rates")
          .upsert(rows, { onConflict: "base_currency,quote_currency" });

        if (error) {
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        }

        return Response.json({ ok: true, count: rows.length });
      },
    },
  },
});
