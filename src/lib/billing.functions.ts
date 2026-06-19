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
      .select("id, organization_id")
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
    return { ok: true as const };
  });
