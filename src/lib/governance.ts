// Governance helpers: approval requests, version snapshots, lock evaluation.
import { supabase } from "@/integrations/supabase/client";

export type ApprovalEntity = "merit_cycle" | "bonus_cycle" | "salary_structure" | "salary_change";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface ApprovalSettings {
  lock_on_approval: boolean;
  allow_admin_unlock: boolean;
  require_two_step: boolean;
}

export const DEFAULT_APPROVAL_SETTINGS: ApprovalSettings = {
  lock_on_approval: true,
  allow_admin_unlock: true,
  require_two_step: false,
};

export async function fetchApprovalSettings(orgId: string): Promise<ApprovalSettings> {
  const { data } = await supabase.from("organizations").select("approval_settings").eq("id", orgId).maybeSingle();
  const raw = (data as any)?.approval_settings;
  return { ...DEFAULT_APPROVAL_SETTINGS, ...(raw ?? {}) };
}

export interface SubmitApprovalInput {
  organizationId: string;
  entityType: ApprovalEntity;
  entityId: string;
  entityLabel?: string | null;
  reason?: string;
  payload?: Record<string, unknown>;
}

export async function submitApproval(input: SubmitApprovalInput) {
  const { data: u } = await supabase.auth.getUser();
  const user = u.user;
  if (!user) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from("approval_requests")
    .insert({
      organization_id: input.organizationId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      entity_label: input.entityLabel ?? null,
      requested_by: user.id,
      requested_by_email: user.email ?? null,
      reason: input.reason ?? null,
      payload: (input.payload ?? {}) as never,
      status: "pending",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function decideApproval(opts: {
  requestId: string;
  decision: "approved" | "rejected";
  note?: string;
}) {
  const { data: u } = await supabase.auth.getUser();
  const user = u.user;
  if (!user) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from("approval_requests")
    .update({
      status: opts.decision,
      decision_note: opts.note ?? null,
      reviewed_by: user.id,
      reviewed_by_email: user.email ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", opts.requestId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function isLocked(opts: {
  orgId: string;
  entityType: ApprovalEntity;
  entityId: string;
}): Promise<{ locked: boolean; lastApproval?: any }> {
  const settings = await fetchApprovalSettings(opts.orgId);
  if (!settings.lock_on_approval) return { locked: false };

  const { data } = await supabase
    .from("approval_requests")
    .select("*")
    .eq("organization_id", opts.orgId)
    .eq("entity_type", opts.entityType)
    .eq("entity_id", opts.entityId)
    .eq("status", "approved")
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { locked: !!data, lastApproval: data ?? undefined };
}

export async function snapshotVersion(opts: {
  orgId: string;
  entityType: ApprovalEntity;
  entityId: string;
  label?: string;
  snapshot: Record<string, unknown>;
  changeSummary?: string;
}) {
  const { data: u } = await supabase.auth.getUser();
  const user = u.user;
  if (!user) return null;

  const { data: latest } = await supabase
    .from("version_history")
    .select("version_number")
    .eq("entity_type", opts.entityType)
    .eq("entity_id", opts.entityId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const next = ((latest as any)?.version_number ?? 0) + 1;

  const { data, error } = await supabase
    .from("version_history")
    .insert({
      organization_id: opts.orgId,
      entity_type: opts.entityType,
      entity_id: opts.entityId,
      version_number: next,
      label: opts.label ?? `v${next}`,
      snapshot: opts.snapshot as never,
      change_summary: opts.changeSummary ?? null,
      created_by: user.id,
      created_by_email: user.email ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
