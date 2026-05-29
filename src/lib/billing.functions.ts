import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPaddleClient, type PaddleEnv } from "@/lib/paddle.server";

// Get current subscription for the user's organization (current env).
export const getCurrentSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { organizationId: string; environment: PaddleEnv }) => data)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row } = await supabase
      .from("subscriptions")
      .select("*, plan:plans(*)")
      .eq("organization_id", data.organizationId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { subscription: row };
  });

// Get a Paddle customer portal URL for managing/canceling subscription.
export const getCustomerPortalUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { subscriptionId: string; environment: PaddleEnv }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("paddle_subscription_id, paddle_customer_id, organization_id")
      .eq("id", data.subscriptionId)
      .eq("environment", data.environment)
      .maybeSingle();
    if (!sub?.paddle_customer_id || !sub?.paddle_subscription_id) {
      throw new Error("No active Paddle subscription");
    }
    // Authorization: user must be a member of the org
    const { data: member } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("user_id", userId)
      .eq("organization_id", sub.organization_id)
      .maybeSingle();
    if (!member) throw new Error("Forbidden");

    const paddle = getPaddleClient(data.environment);
    const portal = await paddle.customerPortalSessions.create(
      sub.paddle_customer_id as string,
      [sub.paddle_subscription_id as string]
    );
    return { url: portal.urls.general.overview as string };
  });
