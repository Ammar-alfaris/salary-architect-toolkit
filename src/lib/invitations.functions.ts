import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InviteSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["admin", "manager", "analyst", "viewer"]),
  redirectOrigin: z.string().url().optional(),
});

export const sendTeamInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InviteSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase: userClient, userId } = context;

    // Caller must be admin of the org
    const { data: roleRow, error: roleErr } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("organization_id", data.organizationId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr) throw new Error(roleErr.message);
    if (!roleRow) throw new Error("Only admins can invite members");

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceKey) throw new Error("Server is not configured");
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const email = data.email.trim().toLowerCase();

    // Get inviter email for record-keeping
    const { data: inviterProfile } = await admin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();

    // Upsert pending invitation (idempotent on (org, email))
    const { error: upErr } = await admin
      .from("pending_invitations")
      .upsert(
        {
          organization_id: data.organizationId,
          email,
          role: data.role,
          invited_by: userId,
          invited_by_email: inviterProfile?.email ?? null,
          accepted_at: null,
        },
        { onConflict: "organization_id,email" },
      );
    if (upErr) throw new Error(upErr.message);

    // Send the invitation email through Supabase Auth (uses our auth-email-hook)
    const origin = data.redirectOrigin || "https://totalreward.app";
    const redirectTo = `${origin}/auth?invited=1&email=${encodeURIComponent(email)}`;

    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        invited_org: data.organizationId,
        invited_role: data.role,
      },
    });

    if (inviteErr) {
      // If user already exists in auth, fall back to magic link so they still get an email
      const msg = inviteErr.message || "";
      if (/already.*registered|already exists|user.*exists/i.test(msg)) {
        const { error: linkErr } = await admin.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: { redirectTo },
        });
        if (linkErr) throw new Error(linkErr.message);
        return { ok: true, alreadyRegistered: true };
      }
      throw new Error(msg);
    }

    return { ok: true };
  });
