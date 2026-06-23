import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Get the current subscription for an organization. Returns the most
 * recent row regardless of environment so trials created in either mode
 * still show up correctly while the super admin tests Paylink.
 */
export const getCurrentSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { organizationId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*, plan:plans(*)")
      .eq("organization_id", data.organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { subscription: sub };
  });

const CancelSchema = z.object({ subscriptionId: z.string().uuid() });

/**
 * Cancel a subscription at the end of the current paid period. Keeps
 * access intact until renewal_at; no immediate revocation.
 */
export const cancelSubscriptionAtPeriodEnd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => CancelSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id, organization_id, end_at, renewal_at")
      .eq("id", data.subscriptionId)
      .maybeSingle();
    if (!sub) throw new Error("Subscription not found");

    const { data: member } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("user_id", userId)
      .eq("organization_id", sub.organization_id)
      .maybeSingle();
    if (!member) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update({ cancel_at_period_end: true, auto_renew: false } as never)
      .eq("id", sub.id);
    if (error) throw new Error(error.message);

    // Audit the cancellation.
    try {
      const { logAuditServer } = await import("@/lib/audit.server");
      await logAuditServer({
        organizationId: sub.organization_id as string,
        actorId: userId,
        action: "subscription.cancelled",
        entityType: "subscription",
        entityId: sub.id as string,
        metadata: { end_at: sub.end_at, renewal_at: sub.renewal_at },
      });
    } catch {}

    // Fire the cancellation notification. Never fail the cancel itself
    // if the email queue is momentarily unavailable.
    try {
      const { resolveOrgPrimaryEmail, sendSubscriptionCancelledEmail } =
        await import("@/lib/notify.server");
      const recipient = await resolveOrgPrimaryEmail(
        sub.organization_id as string,
      );
      if (recipient.email) {
        await sendSubscriptionCancelledEmail({
          to: recipient.email,
          name: recipient.name,
          locale: recipient.locale,
          endAt: (sub.end_at ?? sub.renewal_at) as string | null,
          subscriptionId: sub.id as string,
        });
      }
    } catch (e) {
      console.error(JSON.stringify({
        scope: "billing.cancel", step: "email.failed",
        subscriptionId: sub.id, message: (e as Error).message,
      }));
    }
    return { ok: true as const };
  });

const RetrySchema = z.object({ subscriptionId: z.string().uuid() });

/**
 * Manually trigger a dunning retry for a past_due subscription. Used by
 * the "Retry now" button in the billing UI. Verifies the caller is a
 * member of the subscription's organization before kicking off the
 * charge attempt.
 */
export const retryFailedPaymentNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => RetrySchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id, organization_id, dunning_status")
      .eq("id", data.subscriptionId)
      .maybeSingle();
    if (!sub) throw new Error("Subscription not found");

    const { data: member } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("user_id", userId)
      .eq("organization_id", sub.organization_id)
      .maybeSingle();
    if (!member || (member as any).role !== "admin") {
      throw new Error("Only org admins can retry payments");
    }

    const { processSubscriptionRenewal } = await import("@/lib/dunning.server");
    const r = await processSubscriptionRenewal(sub.id as string);
    return {
      ok: r.ok,
      status: r.status,
      message: r.message ?? null,
    };
  });

