import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Server-side platform-admin verification.
 * Validates the caller's JWT and confirms they are an active platform_admin.
 * Throws 403 if not — must run before the admin shell renders.
 */
export const verifyPlatformAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("platform_admins")
      .select("role")
      .eq("user_id", context.userId)
      .eq("status", "active")
      .maybeSingle();

    if (error || !data) {
      throw new Response("Forbidden", { status: 403 });
    }
    return { role: data.role as string };
  });
