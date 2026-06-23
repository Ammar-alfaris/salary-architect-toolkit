/**
 * Daily lifecycle notification job.
 *
 * Triggered by pg_cron via pg_net. Authenticates with the project's
 * publishable anon key in the `apikey` header (per Lovable's scheduled-jobs
 * pattern — no custom shared-secret).
 *
 * Sends:
 *   - subscription_renewal_reminder, 7 days before renewal_at
 *   - trial_ending, 3 days before trial_end_at
 *
 * Idempotent: each helper uses a deterministic message_id so re-runs
 * collapse to one send per recipient per cycle.
 */
import { createFileRoute } from "@tanstack/react-router";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/cron/lifecycle-notices")({
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
  const {
    resolveOrgPrimaryEmail,
    sendRenewalReminderEmail,
    sendTrialEndingEmail,
  } = await import("@/lib/notify.server");

  const now = Date.now();
  const in8d = new Date(now + 8 * 86_400_000).toISOString();
  const in6d = new Date(now + 6 * 86_400_000).toISOString();
  const in4d = new Date(now + 4 * 86_400_000).toISOString();
  const in2d = new Date(now + 2 * 86_400_000).toISOString();

  let renewals = 0;
  let trials = 0;

  // ── Renewal reminders (T-7) ──
  const { data: subsForRenewal } = await supabaseAdmin
    .from("subscriptions")
    .select("id, organization_id, renewal_at, amount, plan_id, last_renewal_notice_at, plan:plans(name)")
    .eq("status", "active")
    .eq("auto_renew", true)
    .eq("cancel_at_period_end", false)
    .gte("renewal_at", in6d)
    .lte("renewal_at", in8d);

  for (const sub of (subsForRenewal ?? []) as any[]) {
    if (!sub.organization_id) continue;
    // Skip if we already notified within the past 14 days for this cycle.
    if (sub.last_renewal_notice_at) {
      const since = Date.now() - Date.parse(sub.last_renewal_notice_at);
      if (since < 14 * 86_400_000) continue;
    }
    const recipient = await resolveOrgPrimaryEmail(sub.organization_id);
    if (!recipient.email) continue;
    const { data: pm } = await supabaseAdmin
      .from("payment_methods")
      .select("last4")
      .eq("organization_id", sub.organization_id)
      .eq("is_default", true)
      .maybeSingle();
    try {
      await sendRenewalReminderEmail({
        to: recipient.email,
        name: recipient.name,
        locale: recipient.locale,
        renewalAt: sub.renewal_at as string,
        amount: Number(sub.amount ?? 0),
        currency: "SAR",
        cardLast4: ((pm as any)?.last4 as string | null) ?? null,
        planName: (sub.plan?.name as string | undefined) ?? null,
        subscriptionId: sub.id,
      });
      await supabaseAdmin
        .from("subscriptions")
        .update({ last_renewal_notice_at: new Date().toISOString() } as never)
        .eq("id", sub.id);
      renewals++;
    } catch (e) {
      console.error(JSON.stringify({
        scope: "cron.lifecycle", step: "renewal.failed",
        subscriptionId: sub.id, message: (e as Error).message,
      }));
    }
  }

  // ── Trial ending (T-3) ──
  const { data: subsForTrial } = await supabaseAdmin
    .from("subscriptions")
    .select("id, organization_id, trial_end_at, last_trial_email_stage")
    .in("status", ["trial", "trial_ending"])
    .gte("trial_end_at", in2d)
    .lte("trial_end_at", in4d);

  for (const sub of (subsForTrial ?? []) as any[]) {
    if (!sub.organization_id || !sub.trial_end_at) continue;
    if (sub.last_trial_email_stage === "ending") continue;
    const recipient = await resolveOrgPrimaryEmail(sub.organization_id);
    if (!recipient.email) continue;
    try {
      await sendTrialEndingEmail({
        to: recipient.email,
        name: recipient.name,
        locale: recipient.locale,
        trialEndAt: sub.trial_end_at as string,
        subscriptionId: sub.id,
      });
      await supabaseAdmin
        .from("subscriptions")
        .update({
          last_trial_email_at: new Date().toISOString(),
          last_trial_email_stage: "ending",
        } as never)
        .eq("id", sub.id);
      trials++;
    } catch (e) {
      console.error(JSON.stringify({
        scope: "cron.lifecycle", step: "trial.failed",
        subscriptionId: sub.id, message: (e as Error).message,
      }));
    }
  }

  return json({ ok: true, renewals, trials });
}
