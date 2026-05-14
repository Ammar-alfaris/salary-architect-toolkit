// Approval-chain helpers: chains, steps, multi-step request lifecycle, diffing.
import { supabase } from "@/integrations/supabase/client";
import type { ApprovalEntity } from "@/lib/governance";

export type ApprovalRequireFlags = Partial<Record<ApprovalEntity | "allowance_change", boolean>>;

export interface OrgApprovalPolicy {
  lock_on_approval: boolean;
  allow_admin_unlock: boolean;
  require_two_step: boolean;
  require_approval_for: ApprovalRequireFlags;
  default_chain_id: string | null;
  notify_via_email: boolean;
}

export const DEFAULT_POLICY: OrgApprovalPolicy = {
  lock_on_approval: true,
  allow_admin_unlock: true,
  require_two_step: false,
  require_approval_for: {
    merit_cycle: false,
    bonus_cycle: false,
    allowance_change: false,
    salary_structure: false,
    salary_change: false,
  },
  default_chain_id: null,
  notify_via_email: true,
};

export async function fetchPolicy(orgId: string): Promise<OrgApprovalPolicy> {
  const { data } = await supabase.from("organizations").select("approval_settings").eq("id", orgId).maybeSingle();
  const raw = (data as any)?.approval_settings ?? {};
  return {
    ...DEFAULT_POLICY,
    ...raw,
    require_approval_for: { ...DEFAULT_POLICY.require_approval_for, ...(raw.require_approval_for ?? {}) },
  };
}

export async function savePolicy(orgId: string, policy: OrgApprovalPolicy) {
  const { error } = await supabase.from("organizations").update({ approval_settings: policy as never }).eq("id", orgId);
  if (error) throw error;
}

// Chains
export interface ApprovalChain {
  id: string;
  organization_id: string;
  name: string;
  applies_to: string[];
  is_default: boolean;
}
export interface ApprovalChainStep {
  id?: string;
  chain_id?: string;
  step_order: number;
  name?: string | null;
  approver_user_id?: string | null;
  approver_email?: string | null;
  approver_label?: string | null;
  approver_role?: string | null;
}

export async function listChains(orgId: string) {
  const { data } = await supabase.from("approval_chains").select("*").eq("organization_id", orgId).order("created_at");
  return (data ?? []) as ApprovalChain[];
}

export async function listSteps(chainId: string) {
  const { data } = await supabase.from("approval_chain_steps").select("*").eq("chain_id", chainId).order("step_order");
  return (data ?? []) as ApprovalChainStep[];
}

function hasRecipient(step: ApprovalChainStep) {
  return Boolean(step.approver_user_id || step.approver_email?.trim());
}

function isSelfApprover(step: ApprovalChainStep, userId: string, email?: string | null) {
  return Boolean(
    (step.approver_user_id && step.approver_user_id === userId) ||
    (step.approver_email && email && step.approver_email.toLowerCase() === email.toLowerCase()),
  );
}

export async function listValidChainsForEntity(orgId: string, entityType: ApprovalEntity) {
  const chains = await listChains(orgId);
  const applicable = chains.filter((chain) => (chain.applies_to ?? []).includes(entityType));
  const detailed = await Promise.all(
    applicable.map(async (chain) => ({
      ...chain,
      steps: await listSteps(chain.id),
    })),
  );

  return detailed.filter((chain) => chain.steps.length > 0 && chain.steps.every(hasRecipient));
}

export async function upsertChain(input: {
  id?: string;
  organization_id: string;
  name: string;
  applies_to: string[];
  is_default: boolean;
  steps: ApprovalChainStep[];
}) {
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;

  let chainId = input.id;
  if (chainId) {
    await supabase.from("approval_chains").update({
      name: input.name, applies_to: input.applies_to, is_default: input.is_default,
    }).eq("id", chainId);
    await supabase.from("approval_chain_steps").delete().eq("chain_id", chainId);
  } else {
    const { data, error } = await supabase.from("approval_chains").insert({
      organization_id: input.organization_id, name: input.name,
      applies_to: input.applies_to, is_default: input.is_default, created_by: userId,
    }).select().single();
    if (error) throw error;
    chainId = data.id;
  }
  if (input.steps.length) {
    const rows = input.steps.map((s, i) => ({
      chain_id: chainId,
      step_order: i + 1,
      name: s.name ?? null,
      approver_user_id: s.approver_user_id ?? null,
      approver_email: s.approver_email ?? null,
      approver_label: s.approver_label ?? null,
      approver_role: s.approver_role ?? null,
    }));
    const { error } = await supabase.from("approval_chain_steps").insert(rows);
    if (error) throw error;
  }
  return chainId!;
}

export async function deleteChain(id: string) {
  await supabase.from("approval_chains").delete().eq("id", id);
}

// Request lifecycle
export interface CreateRequestInput {
  organizationId: string;
  entityType: ApprovalEntity;
  entityId: string;
  entityLabel?: string;
  reason?: string;
  proposedPayload: Record<string, unknown>;
  chainId?: string;
}

export async function createRequest(input: CreateRequestInput) {
  const { data: u } = await supabase.auth.getUser();
  const user = u.user;
  if (!user) throw new Error("Not signed in");

  const validChains = await listValidChainsForEntity(input.organizationId, input.entityType);
  const resolvedChain = input.chainId
    ? validChains.find((chain) => chain.id === input.chainId)
    : validChains.find((chain) => chain.is_default) ?? validChains[0];

  if (!resolvedChain) {
    throw new Error("No valid approval chain is configured for this request yet. Please set one up first.");
  }

  if (resolvedChain.steps.some((step) => isSelfApprover(step, user.id, user.email))) {
    throw new Error("You can't request approval on a chain where you're listed as an approver. Please choose a different chain or remove yourself from it.");
  }

  const { data, error } = await supabase.from("approval_requests").insert({
    organization_id: input.organizationId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    entity_label: input.entityLabel ?? null,
    requested_by: user.id,
    requested_by_email: user.email ?? null,
    reason: input.reason ?? null,
    payload: (input.proposedPayload ?? {}) as never,
    proposed_payload: (input.proposedPayload ?? {}) as never,
    chain_id: resolvedChain.id,
    current_step: 1,
    status: "pending",
  }).select().single();
  if (error) throw error;
  return data;
}

export async function recordDecision(opts: {
  requestId: string;
  decision: "approved" | "rejected" | "edited" | "sent_back";
  note?: string;
  edits?: Record<string, unknown>;
  finalPayload?: Record<string, unknown>;
}) {
  const { data: u } = await supabase.auth.getUser();
  const user = u.user;
  if (!user) throw new Error("Not signed in");

  const { data: req } = await supabase.from("approval_requests").select("*").eq("id", opts.requestId).maybeSingle();
  if (!req) throw new Error("Request not found");

  await supabase.from("approval_step_decisions").insert({
    request_id: opts.requestId,
    step_order: req.current_step ?? 1,
    decided_by: user.id,
    decided_by_email: user.email,
    decision: opts.decision,
    note: opts.note ?? null,
    edits: (opts.edits ?? {}) as never,
  });

  const updates: any = { reviewed_by: user.id, reviewed_by_email: user.email, reviewed_at: new Date().toISOString() };
  if (opts.note) updates.decision_note = opts.note;
  if (opts.finalPayload) updates.final_payload = opts.finalPayload as never;

  if (opts.decision === "rejected") {
    updates.status = "rejected";
  } else if (opts.decision === "sent_back") {
    updates.status = "pending";
    updates.current_step = 0; // returned to requester
  } else {
    // approved or edited → advance
    const nextStep = (req.current_step ?? 1) + 1;
    let totalSteps = 0;
    if (req.chain_id) {
      const { count } = await supabase
        .from("approval_chain_steps").select("id", { count: "exact", head: true })
        .eq("chain_id", req.chain_id);
      totalSteps = count ?? 0;
    }
    if (totalSteps && nextStep <= totalSteps) {
      updates.current_step = nextStep;
      updates.status = "pending";
    } else {
      updates.status = "approved";
    }
  }
  const { error } = await supabase.from("approval_requests").update(updates).eq("id", opts.requestId);
  if (error) throw error;
}

export async function markApplied(requestId: string) {
  const { data: u } = await supabase.auth.getUser();
  await supabase.from("approval_requests").update({
    applied_at: new Date().toISOString(),
    applied_by: u.user?.id ?? null,
  }).eq("id", requestId);
}

// Diff helpers — flatten objects shallowly and compare numeric/scalar fields.
export interface DiffRow { key: string; before: unknown; after: unknown; changed: boolean }
export function diffPayloads(before: Record<string, unknown>, after: Record<string, unknown>): DiffRow[] {
  const keys = Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]));
  return keys.map((k) => {
    const b = (before as any)?.[k];
    const a = (after as any)?.[k];
    const changed = JSON.stringify(b) !== JSON.stringify(a);
    return { key: k, before: b, after: a, changed };
  });
}

// Resolve who the current approver is (label + email/id) for display
export async function getCurrentApprover(requestId: string) {
  const { data: req } = await supabase.from("approval_requests").select("chain_id,current_step").eq("id", requestId).maybeSingle();
  if (!req?.chain_id || !req.current_step) return null;
  const { data: step } = await supabase
    .from("approval_chain_steps").select("*")
    .eq("chain_id", req.chain_id).eq("step_order", req.current_step).maybeSingle();
  return step ?? null;
}

// Determine if current user is the approver for this request
export async function isCurrentUserApprover(requestId: string): Promise<boolean> {
  const { data: u } = await supabase.auth.getUser();
  const me = u.user;
  if (!me) return false;
  const step = await getCurrentApprover(requestId);
  if (!step) return false;

  // Match by user ID
  if ((step as any).approver_user_id === me.id) return true;

  // Match by email
  if ((step as any).approver_email && (step as any).approver_email.toLowerCase() === (me.email ?? "").toLowerCase()) return true;

  // Match by role — any user holding that role in the org can approve
  if ((step as any).approver_role) {
    const { data: req } = await supabase
      .from("approval_requests")
      .select("organization_id")
      .eq("id", requestId)
      .maybeSingle();
    if (req?.organization_id) {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", me.id)
        .eq("organization_id", req.organization_id)
        .eq("role", (step as any).approver_role)
        .maybeSingle();
      if (roleRow) return true;
    }
  }

  return false;
}
