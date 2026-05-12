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

async function getOrCreateUnsubscribeToken(supabase: ReturnType<typeof makeAdminClient>, email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const { data: existing, error: existingError } = await supabase
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing?.token) return existing.token;

  const token = crypto.randomUUID();
  const { error: insertError } = await supabase.from("email_unsubscribe_tokens").insert({
    email: normalizedEmail,
    token,
  });

  if (!insertError) return token;

  const { data: retryExisting, error: retryError } = await supabase
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (retryError) throw new Error(retryError.message);
  if (retryExisting?.token) return retryExisting.token;

  throw new Error(insertError.message);
}

function buildInvitationEmail(args: {
  inviteUrl: string;
  inviterName: string;
  inviterEmail: string;
  role: "admin" | "manager" | "analyst" | "viewer";
}) {
  const roleLabel = args.role.charAt(0).toUpperCase() + args.role.slice(1);
  const subject = `You've been invited to join Total Reward as ${roleLabel}`;
  const html = `<!doctype html>
<html lang="en" dir="ltr">
  <body style="margin:0;padding:24px;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Tahoma,Arial,sans-serif;color:#0f172a;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
      <div style="background:#0f172a;padding:24px 28px;color:#ffffff;font-size:22px;font-weight:700;">Total Reward</div>
      <div style="padding:28px;line-height:1.75;font-size:15px;">
        <h1 style="margin:0 0 12px;font-size:24px;color:#0f172a;">Team invitation</h1>
        <p style="margin:0 0 12px;"><strong>${args.inviterName}</strong> (${args.inviterEmail}) invited you to join Total Reward as <strong>${roleLabel}</strong>.</p>
        <p style="margin:0 0 20px;">Open the link below, then sign in with your existing account or create a new account using this email address.</p>
        <a href="${args.inviteUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:10px;font-weight:600;">Open invitation</a>
        <p style="margin:20px 0 8px;color:#475569;">If the button does not work, use this link:</p>
        <p style="margin:0;word-break:break-all;"><a href="${args.inviteUrl}" style="color:#0369a1;">${args.inviteUrl}</a></p>
      </div>
    </div>
  </body>
</html>`;
  const text = `${args.inviterName} (${args.inviterEmail}) invited you to join Total Reward as ${roleLabel}. Open this link to sign in or create your account: ${args.inviteUrl}`;

  return { subject, html, text };
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

    const { data: existingProfile, error: existingProfileErr } = await admin
      .from("profiles")
      .select("id, email, full_name")
      .ilike("email", email)
      .maybeSingle();
    if (existingProfileErr) throw new Error(existingProfileErr.message);

    if (existingProfile?.id) {
      const { data: existingMembership, error: existingMembershipErr } = await admin
        .from("user_roles")
        .select("id, role")
        .eq("organization_id", data.organizationId)
        .eq("user_id", existingProfile.id)
        .maybeSingle();
      if (existingMembershipErr) throw new Error(existingMembershipErr.message);
      if (existingMembership) {
        throw new Error(
          `ALREADY_MEMBER:${existingMembership.role}`,
        );
      }
    }

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

    // Build redirect URL — restrict origin to a known allowlist to prevent
    // open-redirect / phishing via attacker-supplied redirectOrigin.
    const ALLOWED_ORIGINS = new Set<string>([
      "https://totalreward.app",
      "https://www.totalreward.app",
      "https://salary-architect-toolkit.lovable.app",
    ]);
    let origin = "https://totalreward.app";
    if (data.redirectOrigin) {
      try {
        const candidate = new URL(data.redirectOrigin).origin;
        if (
          ALLOWED_ORIGINS.has(candidate) ||
          /^https:\/\/[a-z0-9-]+\.lovable\.app$/i.test(candidate) ||
          /^http:\/\/localhost(:\d+)?$/i.test(candidate)
        ) {
          origin = candidate;
        }
      } catch {
        // ignore – fall back to default
      }
    }
    const inviteUrl = `${origin}/auth?invited=1&email=${encodeURIComponent(email)}`;
    const unsubscribeToken = await getOrCreateUnsubscribeToken(admin, email);
    const inviterEmail = inviterProfile?.email ?? "noreply@totalreward.app";
    const inviterName = inviterProfile?.full_name || inviterEmail;
    const messageId = `team-invite-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const emailContent = buildInvitationEmail({
      inviteUrl,
      inviterName,
      inviterEmail,
      role: data.role,
    });

    const { error: enqueueError } = await admin.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        to: email,
        from: "Total Reward <noreply@totalreward.app>",
        sender_domain: "notify.totalreward.app",
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        message_id: messageId,
        label: "team_invitation",
        purpose: "transactional",
        idempotency_key: messageId,
        unsubscribe_token: unsubscribeToken,
        queued_at: new Date().toISOString(),
        metadata: {
          invite_url: inviteUrl,
          invited_role: data.role,
          organization_id: data.organizationId,
          inviter_email: inviterEmail,
        },
      },
    });
    if (enqueueError) throw new Error(enqueueError.message);

    const { error: logError } = await admin.from("email_send_log").insert({
      message_id: messageId,
      template_name: "team_invitation",
      recipient_email: email,
      status: "pending",
      metadata: {
        organization_id: data.organizationId,
        role: data.role,
      },
    });
    if (logError) throw new Error(logError.message);

    return {
      ok: true,
      alreadyRegistered: Boolean(existingProfile?.id),
      invitationId: messageId,
      recipientEmail: email,
    };
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
