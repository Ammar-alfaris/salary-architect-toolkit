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

function makeAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !serviceKey) throw new Error("Server is not configured — missing Supabase credentials");
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

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

    const admin = makeAdminClient();
    const email = data.email.trim().toLowerCase();

    // Get inviter details for the record
    const { data: inviterProfile } = await admin
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .maybeSingle();

    // Upsert pending invitation (idempotent on org + email)
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

    // Build redirect URL — always point to /auth with invited flag
    const origin = data.redirectOrigin || "https://totalreward.app";
    const redirectTo = `${origin}/auth?invited=1&email=${encodeURIComponent(email)}`;

    // Try inviteUserByEmail (works for new users)
    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        invited_org: data.organizationId,
        invited_role: data.role,
        invited_by_email: inviterProfile?.email ?? null,
      },
    });

    if (inviteErr) {
      const msg = inviteErr.message || "";

      // User already exists → send a magic link so they can still accept
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

// ─────────────────────────────────────────────────────────────────────────────
// Accept a pending invitation for an already-authenticated user.
// Called from the auth page when an existing user signs in via magic link.
// ─────────────────────────────────────────────────────────────────────────────
export const acceptInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ email: z.string().email().optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const admin = makeAdminClient();

    // Resolve the user's email (from auth, not just the payload)
    const { data: { user }, error: userErr } = await admin.auth.admin.getUserById(userId);
    if (userErr || !user) throw new Error("User not found");

    const targetEmail = (data.email || user.email || "").toLowerCase();
    if (!targetEmail) throw new Error("Cannot resolve email");

    // Find all unaccepted invitations for this email
    const { data: invites, error: invErr } = await admin
      .from("pending_invitations")
      .select("*")
      .eq("email", targetEmail)
      .is("accepted_at", null);
    if (invErr) throw new Error(invErr.message);
    if (!invites || invites.length === 0) return { ok: true, processed: 0 };

    for (const inv of invites) {
      // Only add if not already a member
      const { data: existing } = await admin
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("organization_id", inv.organization_id)
        .maybeSingle();

      if (!existing) {
        await admin.from("user_roles").insert({
          user_id: userId,
          organization_id: inv.organization_id,
          role: inv.role,
        });
      }

      // Mark accepted
      await admin
        .from("pending_invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", inv.id);
    }

    return { ok: true, processed: invites.length };
  });
