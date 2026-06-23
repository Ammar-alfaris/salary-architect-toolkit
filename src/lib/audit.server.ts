/**
 * Server-side audit log helper.
 *
 * Use this from server functions, cron jobs, and webhooks where the call
 * is not driven by a signed-in browser session. Bypasses RLS via
 * supabaseAdmin so system-generated events (dunning, payments, security)
 * can be recorded without an actor_id.
 *
 * For client-side, user-driven events keep using src/lib/audit.ts.
 */

export type AuditCategory = "billing" | "security" | "data" | "system";

export interface ServerAuditPayload {
  organizationId: string;
  action: string; // free-form, e.g. "payment.succeeded"
  entityType: string; // free-form, e.g. "subscription"
  entityId?: string | null;
  entityLabel?: string | null;
  actorId?: string | null;
  actorEmail?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Best-effort server-side audit. Never throws — auditing must not block
 * the calling operation.
 */
export async function logAuditServer(p: ServerAuditPayload): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("audit_logs").insert({
      organization_id: p.organizationId,
      actor_id: p.actorId ?? null,
      actor_email: p.actorEmail ?? null,
      action: p.action,
      entity_type: p.entityType,
      entity_id: p.entityId ?? null,
      entity_label: p.entityLabel ?? null,
      before_data: (p.before ?? null) as never,
      after_data: (p.after ?? null) as never,
      metadata: {
        ...(p.metadata ?? {}),
        category: inferCategory(p.action),
      } as never,
      ip_address: p.ipAddress ?? null,
      user_agent: p.userAgent ?? null,
    } as never);
  } catch (err) {
    console.warn(JSON.stringify({
      scope: "audit.server", step: "insert.failed",
      action: p.action, message: (err as Error).message,
    }));
  }
}

function inferCategory(action: string): AuditCategory {
  if (action.startsWith("payment.") || action.startsWith("subscription.") || action.startsWith("dunning.") || action.startsWith("invoice.")) {
    return "billing";
  }
  if (action.startsWith("auth.") || action.startsWith("role.") || action.startsWith("invitation.") || action.startsWith("mfa.")) {
    return "security";
  }
  if (action.startsWith("system.") || action.startsWith("cron.")) return "system";
  return "data";
}

/** Extract client IP + UA from a Request (best-effort, behind CF/proxies). */
export function extractClientContext(request: Request): { ipAddress: string | null; userAgent: string | null } {
  const h = request.headers;
  const ip =
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null;
  return { ipAddress: ip, userAgent: h.get("user-agent") };
}
