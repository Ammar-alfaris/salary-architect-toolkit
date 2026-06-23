/**
 * Dunning engine (server-only).
 *
 * Handles automatic recovery of failed subscription renewal charges over
 * a 14-day window with escalating notifications. Called by:
 *   - /api/public/cron/billing-engine (daily)
 *   - retryFailedPaymentNow() server fn (manual button in billing UI)
 *
 * Flow:
 *   day 0  → renewal charge fails           → status='past_due', attempts=1, email "payment_failed"
 *   day 1  → retry #2 if past_due           → email "dunning_retry" stage 1
 *   day 3  → retry #3 if still past_due     → email "dunning_retry" stage 2
 *   day 7  → retry #4 (final)               → email "dunning_retry" stage 3 (last warning)
 *   day 14 → suspend access                  → status='suspended', email "subscription_suspended"
 *   any success → mark recovered             → email "payment_recovered"
 *
 * If no card_token is on file we skip retries (cannot charge silently)
 * and ask the customer to update their card.
 */

import type { PaylinkMode } from "@/lib/paylink.server";

const RETRY_DAYS = [1, 3, 7] as const; // gap from dunning_started_at
const SUSPEND_AFTER_DAYS = 14;

type DunningStage = 1 | 2 | 3;

export type DunningAttemptResult = {
  ok: boolean;
  status: "charged" | "past_due" | "suspended" | "no_token" | "no_method";
  message?: string;
};

/**
 * Attempt to charge a subscription's stored card token for a given amount.
 * Returns true on confirmed success. Any error (no token, declined, network)
 * returns false with a descriptive message.
 */
async function chargeStoredCard(args: {
  mode: PaylinkMode;
  amount: number;
  cardToken: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerMobile: string;
}): Promise<{ ok: boolean; transactionNo?: string; raw?: unknown; error?: string }> {
  const { authenticate } = await import("@/lib/paylink.server");
  try {
    const token = await authenticate(args.mode);
    // Paylink "recurring" endpoint expects a previously-tokenized card.
    // We POST to /api/payRecurring (a thin wrapper exposed by Paylink) with
    // cardToken + amount; success is signalled by orderStatus === "Paid".
    const baseUrl = await getPaylinkBaseUrl(args.mode);
    const res = await fetch(`${baseUrl}/api/payRecurring`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount: args.amount,
        cardToken: args.cardToken,
        orderNumber: args.orderNumber,
        clientName: args.customerName,
        clientMobile: args.customerMobile,
        clientEmail: args.customerEmail,
        currency: "SAR",
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "<unreadable>");
      return { ok: false, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
    }
    const json = (await res.json()) as { orderStatus?: string; transactionNo?: string };
    const status = (json.orderStatus ?? "").toLowerCase();
    if (status === "paid") {
      return { ok: true, transactionNo: json.transactionNo, raw: json };
    }
    return { ok: false, error: `orderStatus=${json.orderStatus ?? "unknown"}`, raw: json };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

async function getPaylinkBaseUrl(mode: PaylinkMode): Promise<string> {
  const url =
    mode === "live"
      ? process.env.PAYLINK_LIVE_BASE_URL
      : process.env.PAYLINK_TEST_BASE_URL ?? process.env.PAYLINK_BASE_URL;
  if (!url) throw new Error(`Paylink ${mode} base URL missing`);
  return url.replace(/\/$/, "");
}

function nextRetryAt(startedAtIso: string, attemptsAlready: number): string | null {
  // attemptsAlready counts failed tries since dunning started (including the
  // initial fail). Next retry index into RETRY_DAYS = attemptsAlready - 1.
  const idx = attemptsAlready - 1;
  if (idx < 0 || idx >= RETRY_DAYS.length) return null;
  const next = new Date(Date.parse(startedAtIso) + RETRY_DAYS[idx] * 86_400_000);
  return next.toISOString();
}

function stageForAttempt(attempt: number): DunningStage {
  if (attempt <= 1) return 1;
  if (attempt === 2) return 2;
  return 3;
}

/**
 * Run one dunning step against a subscription that is either due for
 * its first renewal charge or due for a scheduled retry.
 */
export async function processSubscriptionRenewal(subId: string): Promise<DunningAttemptResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { getCurrentPaylinkMode } = await import("@/lib/paylink.server");
  const { logAuditServer } = await import("@/lib/audit.server");
  const {
    resolveOrgPrimaryEmail,
    sendPaymentFailedEmail,
    sendDunningRetryEmail,
    sendPaymentRecoveredEmail,
    sendSubscriptionSuspendedEmail,
  } = await import("@/lib/notify.server");

  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("id", subId)
    .maybeSingle();
  if (!sub) return { ok: false, status: "no_method", message: "subscription not found" };
  const s = sub as any;
  if (!s.organization_id) return { ok: false, status: "no_method", message: "no organization" };

  // 1. Get the stored card.
  const { data: pm } = await supabaseAdmin
    .from("payment_methods")
    .select("card_token, last4, brand")
    .eq("organization_id", s.organization_id)
    .eq("is_default", true)
    .maybeSingle();
  const cardToken = (pm as any)?.card_token as string | null;

  const recipient = await resolveOrgPrimaryEmail(s.organization_id);
  const amount = Number(s.amount ?? 0);
  const startedAt: string = s.dunning_started_at ?? new Date().toISOString();
  const attemptN: number = (s.dunning_attempts ?? 0) + 1;

  // No stored card token → can't retry silently. Park in past_due and email.
  if (!cardToken) {
    await supabaseAdmin
      .from("subscriptions")
      .update({
        dunning_status: "past_due",
        dunning_started_at: s.dunning_started_at ?? startedAt,
        dunning_last_attempt_at: new Date().toISOString(),
        dunning_last_error: "no_card_token",
        dunning_next_retry_at: null,
      } as never)
      .eq("id", subId);
    if (recipient.email && s.dunning_status !== "past_due") {
      await sendPaymentFailedEmail({
        to: recipient.email,
        name: recipient.name,
        locale: recipient.locale,
        invoiceNumber: null,
        amount,
        orderId: subId,
      });
    }
    await logAuditServer({
      organizationId: s.organization_id,
      action: "dunning.no_card_token",
      entityType: "subscription",
      entityId: subId,
      metadata: { amount },
    });
    return { ok: false, status: "no_token" };
  }

  // 2. Attempt the charge.
  const mode = await getCurrentPaylinkMode();
  const result = await chargeStoredCard({
    mode,
    amount,
    cardToken,
    orderNumber: `RENEW-${subId}-${attemptN}`,
    customerName: recipient.name ?? "Customer",
    customerEmail: recipient.email,
    customerMobile: "0000000000",
  });

  const now = new Date();
  if (result.ok) {
    // Success → reset dunning, push renewal forward.
    const cycle = (s.billing_cycle as string) === "annual" ? 365 : 30;
    const newRenewal = new Date(now.getTime() + cycle * 86_400_000);
    await supabaseAdmin
      .from("subscriptions")
      .update({
        status: "active",
        payment_status: "paid",
        renewal_at: newRenewal.toISOString(),
        end_at: newRenewal.toISOString(),
        dunning_status: "none",
        dunning_recovered_at: now.toISOString(),
        dunning_next_retry_at: null,
        dunning_last_error: null,
        dunning_attempts: 0,
        last_renewal_notice_at: null,
      } as never)
      .eq("id", subId);

    const wasRecovering = (s.dunning_status as string) === "past_due";
    if (recipient.email) {
      if (wasRecovering) {
        await sendPaymentRecoveredEmail({
          to: recipient.email,
          name: recipient.name,
          locale: recipient.locale,
          amount,
          renewalAt: newRenewal.toISOString(),
          subscriptionId: subId,
        });
      }
    }
    await logAuditServer({
      organizationId: s.organization_id,
      action: wasRecovering ? "dunning.recovered" : "subscription.renewed",
      entityType: "subscription",
      entityId: subId,
      metadata: {
        amount,
        attempts: attemptN,
        next_renewal: newRenewal.toISOString(),
      },
    });
    return { ok: true, status: "charged" };
  }

  // 3. Charge failed. Decide next state.
  const wasAlreadyPastDue = (s.dunning_status as string) === "past_due";
  const ageDays = wasAlreadyPastDue
    ? (Date.now() - Date.parse(startedAt)) / 86_400_000
    : 0;

  // Past the 14-day window → suspend.
  if (wasAlreadyPastDue && ageDays >= SUSPEND_AFTER_DAYS) {
    await supabaseAdmin
      .from("subscriptions")
      .update({
        dunning_status: "suspended",
        status: "restricted",
        dunning_last_attempt_at: now.toISOString(),
        dunning_last_error: result.error ?? "max_attempts",
        dunning_next_retry_at: null,
        dunning_attempts: attemptN,
        restricted_at: now.toISOString(),
      } as never)
      .eq("id", subId);
    if (recipient.email) {
      await sendSubscriptionSuspendedEmail({
        to: recipient.email,
        name: recipient.name,
        locale: recipient.locale,
        amount,
        subscriptionId: subId,
      });
    }
    await logAuditServer({
      organizationId: s.organization_id,
      action: "dunning.suspended",
      entityType: "subscription",
      entityId: subId,
      metadata: { amount, attempts: attemptN, last_error: result.error },
    });
    return { ok: false, status: "suspended", message: result.error };
  }

  // Otherwise → schedule next retry (or first failure).
  const next = nextRetryAt(startedAt, attemptN);
  await supabaseAdmin
    .from("subscriptions")
    .update({
      dunning_status: "past_due",
      dunning_started_at: s.dunning_started_at ?? startedAt,
      dunning_attempts: attemptN,
      dunning_last_attempt_at: now.toISOString(),
      dunning_last_error: result.error ?? "declined",
      dunning_next_retry_at: next,
    } as never)
    .eq("id", subId);

  if (recipient.email) {
    if (!wasAlreadyPastDue) {
      // First failure
      await sendPaymentFailedEmail({
        to: recipient.email,
        name: recipient.name,
        locale: recipient.locale,
        invoiceNumber: null,
        amount,
        orderId: subId,
      });
    } else {
      const stage = stageForAttempt(attemptN);
      await sendDunningRetryEmail({
        to: recipient.email,
        name: recipient.name,
        locale: recipient.locale,
        amount,
        stage,
        nextRetryAt: next,
        subscriptionId: subId,
      });
    }
  }

  await logAuditServer({
    organizationId: s.organization_id,
    action: wasAlreadyPastDue ? "dunning.retry" : "dunning.started",
    entityType: "subscription",
    entityId: subId,
    metadata: {
      amount,
      attempts: attemptN,
      error: result.error,
      next_retry_at: next,
    },
  });

  return { ok: false, status: "past_due", message: result.error };
}
