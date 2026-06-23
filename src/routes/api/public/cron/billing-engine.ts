/**
 * Daily billing engine (cron).
 *
 * Runs once per day to:
 *   1. Charge active subscriptions whose renewal_at has passed.
 *   2. Retry past_due subscriptions whose dunning_next_retry_at has come.
 *   3. Suspend subscriptions that have been past_due > 14 days.
 *
 * Idempotent: each subscription processed at most once per run. Auth uses
 * the publishable anon key in the `apikey` header (same pattern as
 * lifecycle-notices).
 */
import { createFileRoute } from "@tanstack/react-router";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/cron/billing-engine")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});

async function handle(request: Request) {
  const apiKey = request.headers.get("apikey") ?? request.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { processSubscriptionRenewal } = await import("@/lib/dunning.server");

  const nowIso = new Date().toISOString();
  const stats = { dueRenewals: 0, retries: 0, succeeded: 0, failed: 0, suspended: 0 };
  const seen = new Set<string>();

  // 1) Active subs with renewal_at <= now → first charge attempt.
  const { data: due } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("status", "active")
    .eq("auto_renew", true)
    .eq("cancel_at_period_end", false)
    .neq("dunning_status", "suspended")
    .lte("renewal_at", nowIso)
    .limit(200);

  for (const row of (due ?? []) as { id: string }[]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    stats.dueRenewals++;
    const r = await processSubscriptionRenewal(row.id);
    if (r.ok) stats.succeeded++;
    else if (r.status === "suspended") stats.suspended++;
    else stats.failed++;
  }

  // 2) past_due subs whose retry window is up.
  const { data: retries } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("dunning_status", "past_due")
    .lte("dunning_next_retry_at", nowIso)
    .limit(200);

  for (const row of (retries ?? []) as { id: string }[]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    stats.retries++;
    const r = await processSubscriptionRenewal(row.id);
    if (r.ok) stats.succeeded++;
    else if (r.status === "suspended") stats.suspended++;
    else stats.failed++;
  }

  // 3) past_due subs older than 14 days that somehow have no next retry → force suspend pass.
  const cutoff = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const { data: stale } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("dunning_status", "past_due")
    .lte("dunning_started_at", cutoff)
    .limit(100);

  for (const row of (stale ?? []) as { id: string }[]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    const r = await processSubscriptionRenewal(row.id);
    if (r.status === "suspended") stats.suspended++;
  }

  return json({ ok: true, ...stats, ranAt: nowIso });
}
