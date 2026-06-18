import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Env = "sandbox" | "live";

/**
 * Start (or update) a free trial for the current user's organization,
 * scoped to the chosen plan + billing cycle. Uses supabaseAdmin to bypass
 * RLS on `subscriptions` (members can only SELECT), after verifying that
 * the caller is actually a member of the org.
 *
 * Idempotent: if an active paid subscription exists it is left alone; if a
 * trial row already exists, plan/cycle/amount are updated in place.
 */
export const startTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { planSlug: string; cycle: "monthly" | "annual"; environment?: Env }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const env: Env = data.environment ?? "sandbox";

    // 1) Find caller's organization (first one — onboarding scaffold creates one)
    //    Retry briefly because handle_new_user trigger may still be running
    //    right after sign-up.
    let orgId: string | null = null;
    for (let i = 0; i < 6; i++) {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      orgId = roleRow?.organization_id ?? null;
      if (orgId) break;
      await new Promise((r) => setTimeout(r, 350));
    }
    if (!orgId) throw new Error("No organization found for user");

    // 2) Look up the plan
    const { data: plan } = await supabase
      .from("plans")
      .select("id, monthly_price, annual_price, currency, trial_days")
      .eq("slug", data.planSlug)
      .eq("status", "active")
      .maybeSingle();
    if (!plan) throw new Error("Plan not found");

    // 3) Look for an existing subscription (any env)
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id, status, trial_end_at, environment")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = new Date();
    const trialDays = plan.trial_days || 14;
    const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
    const amount = data.cycle === "annual" ? plan.annual_price : plan.monthly_price;

    // 4) Privileged write — RLS on subscriptions blocks the user
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (existing && existing.status === "active") {
      return { ok: true, status: "active", subscriptionId: existing.id };
    }

    if (existing) {
      const { error } = await supabaseAdmin
        .from("subscriptions")
        .update({
          plan_id: plan.id,
          billing_cycle: data.cycle,
          status: "trial",
          trial_start_at: existing.trial_end_at ? undefined : now.toISOString(),
          trial_end_at: existing.trial_end_at ?? trialEnd.toISOString(),
          amount,
          payment_status: "pending",
          environment: env,
        } as never)
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { ok: true, status: "trial", subscriptionId: existing.id };
    }

    const { data: created, error: insErr } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        organization_id: orgId,
        user_id: userId,
        plan_id: plan.id,
        billing_cycle: data.cycle,
        status: "trial",
        trial_start_at: now.toISOString(),
        trial_end_at: trialEnd.toISOString(),
        amount,
        payment_status: "pending",
        auto_renew: true,
        environment: env,
      } as never)
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);

    return { ok: true, status: "trial", subscriptionId: (created as any).id };
  });

/** Get the effective lifecycle status of the current user's org. */
export const getOrgLifecycleStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("organization_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    const orgId = roleRow?.organization_id;
    if (!orgId) return { status: "none" as const, trialEndAt: null, planName: null };

    const { data: status } = await supabase.rpc("org_lifecycle_status", { _org: orgId });

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("trial_end_at, plan:plans(name, slug, trial_days)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      status: (status as string) || "none",
      trialEndAt: sub?.trial_end_at ?? null,
      planName: (sub as any)?.plan?.name ?? null,
    };
  });
