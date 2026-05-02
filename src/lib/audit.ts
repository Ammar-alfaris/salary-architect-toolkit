import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "archive"
  | "bulk_update"
  | "bulk_delete"
  | "export"
  | "run_cycle";

export type AuditEntity =
  | "employee"
  | "salary_structure"
  | "salary_grade"
  | "bonus_cycle"
  | "merit_cycle"
  | "allowance_policy"
  | "organization"
  | "user_role"
  | "invitation";

export interface AuditPayload {
  organizationId: string;
  action: AuditAction;
  entityType: AuditEntity;
  entityId?: string | null;
  entityLabel?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

/**
 * Best-effort audit log. Never throws — failure to log must not block the user action.
 */
export async function logAudit(p: AuditPayload): Promise<void> {
  try {
    const { data: u } = await supabase.auth.getUser();
    const user = u.user;
    if (!user) return;
    await supabase.from("audit_logs").insert({
      organization_id: p.organizationId,
      actor_id: user.id,
      actor_email: user.email ?? null,
      action: p.action,
      entity_type: p.entityType,
      entity_id: p.entityId ?? null,
      entity_label: p.entityLabel ?? null,
      before_data: (p.before ?? null) as never,
      after_data: (p.after ?? null) as never,
      metadata: (p.metadata ?? {}) as never,
    });
  } catch (err) {
    // Silent — auditing must be non-blocking
    console.warn("[audit] failed", err);
  }
}
