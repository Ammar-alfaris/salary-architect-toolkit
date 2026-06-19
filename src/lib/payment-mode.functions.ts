import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type PaymentMode = "test" | "live";

/**
 * Reads the current Paylink environment mode from admin_settings.
 * Public — used by the test-mode banner on every page. Backed by the
 * SECURITY DEFINER public.get_payment_mode() RPC so it doesn't require a
 * session and never leaks any admin fields.
 */
export const getPaymentMode = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ mode: PaymentMode }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("get_payment_mode");
    if (error) {
      console.error(JSON.stringify({ scope: "paymentMode", step: "rpc.failed", message: error.message }));
      return { mode: "test" };
    }
    const mode = (data as unknown as string) === "live" ? "live" : "test";
    return { mode };
  },
);

const SetSchema = z.object({ mode: z.enum(["test", "live"]) });

/** Super-admin-only: switch the platform between Paylink test and live. */
export const setPaymentMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => SetSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isSuper } = await supabase.rpc("has_platform_role", {
      _uid: userId,
      _role: "super_admin",
    });
    if (!isSuper) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("admin_settings")
      .select("id")
      .limit(1)
      .maybeSingle();
    if (!row?.id) throw new Error("admin_settings row missing");

    const { error } = await supabaseAdmin
      .from("admin_settings")
      .update({ payment_mode: data.mode } as never)
      .eq("id", row.id);
    if (error) throw new Error(error.message);

    console.log(JSON.stringify({ scope: "paymentMode", step: "updated", mode: data.mode, by: userId }));
    return { ok: true as const, mode: data.mode };
  });
