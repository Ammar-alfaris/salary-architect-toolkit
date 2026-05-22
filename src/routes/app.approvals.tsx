import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import type { ApprovalEntity } from "@/lib/governance";
import { recordDecision, markApplied, getCurrentApprover, isCurrentUserApprover } from "@/lib/approvals";
import { ApprovalDiff } from "@/components/approval-diff";
import { ApprovalSummary } from "@/components/approval-summary";
import { usePermissions } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { useServerFn } from "@tanstack/react-start";
import { applySalaryChange, applyMeritCycle, applyBonusCycle } from "@/lib/comp-apply.functions";
import { getServerFnAuthHeaders, assertServerFnResult } from "@/lib/server-fn-auth";
import { CheckCircle2, XCircle, Clock, FileBarChart, Layers, Gift, TrendingUp, Info, ShieldCheck, Undo2, Pencil, Eye, DollarSign } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/approvals")({ component: ApprovalsPage });

const ENTITY_ICON: Record<ApprovalEntity, typeof Layers> = {
  merit_cycle: TrendingUp,
  bonus_cycle: Gift,
  salary_structure: Layers,
  salary_change: DollarSign,
};

type DecisionAction = "approved" | "rejected" | "edited" | "sent_back";

function ApprovalsPage() {
  const { organizationId, user } = useAuth();
  const { t, locale } = useI18n();
  const perms = usePermissions();
  const [requests, setRequests] = useState<any[]>([]);
  const [tab, setTab] = useState("pending");
  const [active, setActive] = useState<{ req: any; action: DecisionAction } | null>(null);
  const [note, setNote] = useState("");
  const [editsObj, setEditsObj] = useState<Record<string, any>>({});
  const [diffReq, setDiffReq] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const applySalaryFn = useServerFn(applySalaryChange);
  const applyMeritFn = useServerFn(applyMeritCycle);
  const applyBonusFn = useServerFn(applyBonusCycle);

  const load = async () => {
    if (!organizationId) return;
    setLoading(true);
    const { data } = await supabase
      .from("approval_requests").select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    setRequests(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [organizationId]);

  const filtered = useMemo(() => requests.filter((r) => (tab === "all" ? true : r.status === tab)), [requests, tab]);

  const openAction = (req: any, action: DecisionAction) => {
    setActive({ req, action });
    setNote("");
    const base = req.final_payload ?? req.proposed_payload ?? {};
    setEditsObj(JSON.parse(JSON.stringify(base)));
  };

  const submit = async () => {
    if (!active) return;
    try {
      const finalPayload = active.action === "edited" ? editsObj : undefined;
      await recordDecision({
        requestId: active.req.id,
        decision: active.action,
        note,
        edits: finalPayload,
        finalPayload,
      });
      await logAudit({
        organizationId: organizationId!,
        action: "update",
        entityType: active.req.entity_type,
        entityId: active.req.entity_id,
        entityLabel: active.req.entity_label,
        metadata: { approval_decision: active.action, note },
      });
      toast.success(t(active.action === "approved" || active.action === "edited" ? "approval_approved" : active.action === "rejected" ? "approval_rejected" : "approval_submitted"));
      setActive(null);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const applyApproved = async (req: any) => {
    if (!confirm(t("apply_changes") + "?")) return;
    const payload = req.final_payload ?? req.proposed_payload ?? {};
    try {
      if (req.entity_type === "merit_cycle") {
        const recs = (payload as any).recommendations ?? [];
        if (recs.length) {
          await supabase.from("merit_results").insert(recs.map((r: any) => ({
            merit_cycle_id: req.entity_id, employee_id: r.id,
            current_salary: r.base, recommended_increase_percent: r.pct,
            increase_amount: r.increase, new_salary: r.newSalary,
          })) as never);
          await Promise.all(recs.map((r: any) => supabase.from("employees").update({ base_salary: r.newSalary }).eq("id", r.id)));
        }
        // Finalize the merit cycle so it becomes a locked, approved record
        await supabase.from("merit_cycles").update({
          status: "closed",
          approved_at: new Date().toISOString(),
          approved_by: user?.id ?? null,
          approved_by_email: user?.email ?? null,
          final_payload: payload as never,
          finalized_at: new Date().toISOString(),
        }).eq("id", req.entity_id);
      } else if (req.entity_type === "bonus_cycle") {
        const results = (payload as any).results ?? [];
        if (results.length) {
          await supabase.from("bonus_results").insert(results.map((r: any) => ({
            bonus_cycle_id: req.entity_id, employee_id: r.id,
            base_salary: r.base, target_bonus_percent: r.target,
            performance_multiplier: (payload as any).bulkPerf ?? 1,
            business_multiplier: (payload as any).bulkBiz ?? 1,
            individual_modifier: 1, calculated_bonus: r.bonus, proration_factor: 1,
          })) as never);
        }
        // Finalize the bonus cycle so it becomes a locked, approved record
        await supabase.from("bonus_cycles").update({
          status: "closed",
          approved_at: new Date().toISOString(),
          approved_by: user?.id ?? null,
          approved_by_email: user?.email ?? null,
          final_payload: payload as never,
          finalized_at: new Date().toISOString(),
        }).eq("id", req.entity_id);
      } else if (req.entity_type === "salary_change") {
        const newSalary = Number((payload as any).new_salary);
        if (!isFinite(newSalary) || newSalary <= 0) {
          throw new Error("Invalid proposed salary");
        }
        const { error } = await supabase
          .from("employees")
          .update({ base_salary: newSalary })
          .eq("id", req.entity_id);
        if (error) throw error;
      }
      await markApplied(req.id);
      await logAudit({ organizationId: organizationId!, action: "update", entityType: req.entity_type, entityId: req.entity_id, entityLabel: req.entity_label, metadata: { applied: true, finalized: true } });
      toast.success(t("apply_merit_done"));
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const fmt = (iso: string) => new Date(iso).toLocaleString(locale === "ar" ? "ar" : "en");

  const counts = useMemo(() => ({
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
    all: requests.length,
  }), [requests]);

  return (
    <div>
      <PageHeader title={t("approvals")} subtitle={t("approvals_subtitle")} />
      <div className="p-4 md:p-6 space-y-4">
        <div className="rounded-lg border bg-primary/5 ring-1 ring-primary/20 p-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1 text-sm">
            <h3 className="font-medium">{t("what_is_approvals")}</h3>
            <p className="text-muted-foreground text-xs leading-relaxed">{t("what_is_approvals_body")}</p>
            {perms.role && (
              <div className="pt-1 inline-flex items-center gap-1.5 text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span className="text-foreground/80">{t("your_role_is", { role: t(`role_${perms.role}`) })}</span>
              </div>
            )}
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="tabs-scroll max-w-full">
            <TabsTrigger value="pending">{t("status_pending")} ({counts.pending})</TabsTrigger>
            <TabsTrigger value="approved">{t("status_approved")} ({counts.approved})</TabsTrigger>
            <TabsTrigger value="rejected">{t("status_rejected")} ({counts.rejected})</TabsTrigger>
            <TabsTrigger value="all">{t("all")} ({counts.all})</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            {loading ? (
              <div className="text-sm text-muted-foreground py-10 text-center">{t("loading")}</div>
            ) : filtered.length === 0 ? (
              <div className="border rounded-lg bg-card p-10 text-center text-sm text-muted-foreground">
                <FileBarChart className="w-8 h-8 mx-auto mb-2 opacity-40" />
                {t("approvals_empty")}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((r) => (
                  <RequestCard key={r.id} req={r} fmt={fmt}
                    isRequester={user?.id === r.requested_by}
                    canDecide={perms.has("manager") || perms.canAdmin}
                    onAction={(a) => openAction(r, a)}
                    onApply={() => applyApproved(r)}
                    onViewDiff={() => setDiffReq(r)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {active?.action === "approved" && t("confirm_approval")}
              {active?.action === "rejected" && t("confirm_rejection")}
              {active?.action === "edited" && t("edit_and_approve")}
              {active?.action === "sent_back" && t("send_back")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Show summary for approve/reject/send_back actions */}
            {active && active.action !== "edited" && (
              <ApprovalSummary
                entityType={active.req.entity_type}
                entityLabel={active.req.entity_label}
                payload={active.req.final_payload ?? active.req.proposed_payload ?? {}}
                requestedBy={active.req.requested_by_email}
                reason={active.req.reason}
              />
            )}
            
            {/* Show editable table for edit action */}
            {active?.action === "edited" && (
              <PayloadEditor entityType={active.req.entity_type} value={editsObj} onChange={setEditsObj} />
            )}
            
            {/* Decision note */}
            <div className="space-y-1.5 pt-2 border-t">
              <Label className="text-sm font-medium">{t("decision_note")}</Label>
              <Textarea 
                value={note} 
                onChange={(e) => setNote(e.target.value)} 
                rows={3} 
                placeholder={t("decision_note_placeholder")} 
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setActive(null)}>{t("cancel")}</Button>
            <Button 
              onClick={submit}
              variant={active?.action === "rejected" ? "destructive" : "default"}
            >
              {active?.action === "approved" && (t("approve") || "Approve")}
              {active?.action === "rejected" && (t("reject") || "Reject")}
              {active?.action === "edited" && (t("save_and_approve") || "Save & Approve")}
              {active?.action === "sent_back" && (t("send_back") || "Send Back")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!diffReq} onOpenChange={(o) => !o && setDiffReq(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("view_changes") || "View Changes"}</DialogTitle>
          </DialogHeader>
          {diffReq && (
            <div className="space-y-4">
              <ApprovalSummary
                entityType={diffReq.entity_type}
                entityLabel={diffReq.entity_label}
                payload={diffReq.final_payload ?? diffReq.proposed_payload ?? {}}
                requestedBy={diffReq.requested_by_email}
                reason={diffReq.reason}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequestCard({ req, fmt, isRequester, canDecide, onAction, onApply, onViewDiff }: {
  req: any; fmt: (s: string) => string; isRequester: boolean; canDecide: boolean;
  onAction: (a: DecisionAction) => void; onApply: () => void; onViewDiff: () => void;
}) {
  const { t } = useI18n();
  const [approver, setApprover] = useState<any>(null);
  const [isAssignedApprover, setIsAssignedApprover] = useState(false);
  useEffect(() => {
    if (req.status !== "pending") return;
    getCurrentApprover(req.id).then(setApprover);
    isCurrentUserApprover(req.id).then(setIsAssignedApprover);
  }, [req.id, req.status]);

  const Icon = ENTITY_ICON[req.entity_type as ApprovalEntity] ?? FileBarChart;
  const tone = req.status === "approved" ? "ring-success/30 bg-success/5"
    : req.status === "rejected" ? "ring-destructive/30 bg-destructive/5"
    : "ring-warning/30 bg-warning/5";

  return (
    <div className={`border rounded-lg p-4 ring-1 overflow-x-hidden ${tone}`}>
      <div className="flex items-start gap-3 flex-wrap">
        <div className="w-9 h-9 rounded-md bg-card border flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium text-sm break-words">{req.entity_label || t(`entity_${req.entity_type}`)}</h4>
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full ring-1 ring-border bg-muted">{t(`entity_${req.entity_type}`)}</span>
            <StatusBadge status={req.status} />
            {req.status === "pending" && req.chain_id && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full ring-1 ring-border bg-card">{t("current_step")}: {req.current_step}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 break-all">{t("requested_by")}: {req.requested_by_email ?? "—"} · {fmt(req.created_at)}</p>
          {approver && req.status === "pending" && (
            <p className="text-xs text-muted-foreground mt-0.5">{t("approver")}: {approver.approver_label || approver.approver_email || "—"}</p>
          )}
          {req.reason && <p className="text-sm mt-2 text-foreground/80 break-words">"{req.reason}"</p>}
          {req.applied_at && (
            <p className="text-xs text-success mt-1">✓ Applied {fmt(req.applied_at)}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button size="sm" variant="ghost" onClick={onViewDiff}><Eye className="w-4 h-4 me-1" />{t("view_diff")}</Button>
          {req.status === "pending" && canDecide && isAssignedApprover && (
            <>
              <Button size="sm" variant="outline" onClick={() => onAction("sent_back")}><Undo2 className="w-4 h-4 me-1" />{t("send_back")}</Button>
              <Button size="sm" variant="outline" onClick={() => onAction("edited")}><Pencil className="w-4 h-4 me-1" />{t("edit_and_approve")}</Button>
              <Button size="sm" variant="outline" onClick={() => onAction("rejected")}><XCircle className="w-4 h-4 me-1" />{t("reject")}</Button>
              <Button size="sm" onClick={() => onAction("approved")}><CheckCircle2 className="w-4 h-4 me-1" />{t("approve")}</Button>
            </>
          )}
          {req.status === "approved" && !req.applied_at && (isRequester || canDecide) && (
            <Button size="sm" onClick={onApply}><CheckCircle2 className="w-4 h-4 me-1" />{t("apply_changes")}</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const map: Record<string, { cls: string; Icon: typeof Clock }> = {
    pending: { cls: "ring-warning/30 text-warning-foreground bg-warning/10", Icon: Clock },
    approved: { cls: "ring-success/30 text-success bg-success/10", Icon: CheckCircle2 },
    rejected: { cls: "ring-destructive/30 text-destructive bg-destructive/10", Icon: XCircle },
    cancelled: { cls: "ring-border text-muted-foreground bg-muted", Icon: XCircle },
  };
  const m = map[status] ?? map.pending;
  return (
    <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full ring-1 inline-flex items-center gap-1 ${m.cls}`}>
      <m.Icon className="w-3 h-3" /> {t(`status_${status}`)}
    </span>
  );
}

function num(v: any) {
  const n = typeof v === "number" ? v : parseFloat(v);
  return isFinite(n) ? n : 0;
}

function PayloadEditor({ entityType, value, onChange }: {
  entityType: ApprovalEntity;
  value: Record<string, any>;
  onChange: (v: Record<string, any>) => void;
}) {
  const { t } = useI18n();

  if (entityType === "merit_cycle") {
    const recs: any[] = Array.isArray(value.recommendations) ? value.recommendations : [];
    const updateRec = (i: number, patch: any) => {
      const next = recs.map((r, idx) => {
        if (idx !== i) return r;
        const merged = { ...r, ...patch };
        if (patch.pct !== undefined) {
          const pct = num(patch.pct);
          const base = num(merged.base);
          merged.pct = pct;
          merged.increase = +(base * pct / 100).toFixed(2);
          merged.newSalary = +(base + merged.increase).toFixed(2);
        }
        return merged;
      });
      onChange({ ...value, recommendations: next });
    };
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{t("edit_payload_help")}</p>

        {/* Mobile cards */}
        <div className="grid gap-2 sm:hidden">
          {recs.length === 0 && (
            <div className="border rounded-md p-4 text-center text-muted-foreground text-sm">—</div>
          )}
          {recs.map((r, i) => (
            <div key={r.id ?? i} className="border rounded-md p-3 bg-card space-y-2">
              <div className="font-medium text-sm break-words">{r.name ?? r.id}</div>
              <div className="text-xs text-muted-foreground">
                {t("current_base") || "Base"}: <span className="text-foreground tabular-nums">{num(r.base).toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px]">{t("increase_percent") || "%"}</Label>
                  <Input type="number" step="0.1" value={r.pct ?? 0} onChange={(e) => updateRec(i, { pct: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">{t("new_salary")}</Label>
                  <div className="h-9 flex items-center px-2 rounded-md bg-muted/40 text-sm font-semibold tabular-nums">
                    {num(r.newSalary).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="text-xs text-success tabular-nums">+{num(r.increase).toLocaleString()}</div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="p-2">{t("employee")}</th>
                <th className="p-2">{t("current_base") || "Base"}</th>
                <th className="p-2">{t("increase_percent") || "%"}</th>
                <th className="p-2">{t("increase_amount")}</th>
                <th className="p-2">{t("new_salary")}</th>
              </tr>
            </thead>
            <tbody>
              {recs.map((r, i) => (
                <tr key={r.id ?? i} className="border-t">
                  <td className="p-2 break-all">{r.name ?? r.id}</td>
                  <td className="p-2">{num(r.base).toLocaleString()}</td>
                  <td className="p-2 w-24">
                    <Input type="number" step="0.1" value={r.pct ?? 0} onChange={(e) => updateRec(i, { pct: e.target.value })} className="h-8" />
                  </td>
                  <td className="p-2">{num(r.increase).toLocaleString()}</td>
                  <td className="p-2 font-medium">{num(r.newSalary).toLocaleString()}</td>
                </tr>
              ))}
              {recs.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">—</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (entityType === "bonus_cycle") {
    const results: any[] = Array.isArray(value.results) ? value.results : [];
    const updateRow = (i: number, patch: any) => {
      const next = results.map((r, idx) => idx === i ? { ...r, ...patch } : r);
      onChange({ ...value, results: next });
    };
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">{t("edit_payload_help")}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Performance ×</Label>
            <Input type="number" step="0.05" value={value.bulkPerf ?? 1} onChange={(e) => onChange({ ...value, bulkPerf: num(e.target.value) })} className="h-8" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Business ×</Label>
            <Input type="number" step="0.05" value={value.bulkBiz ?? 1} onChange={(e) => onChange({ ...value, bulkBiz: num(e.target.value) })} className="h-8" />
          </div>
        </div>

        {/* Mobile cards */}
        <div className="grid gap-2 sm:hidden">
          {results.length === 0 && (
            <div className="border rounded-md p-4 text-center text-muted-foreground text-sm">—</div>
          )}
          {results.map((r, i) => (
            <div key={r.id ?? i} className="border rounded-md p-3 bg-card space-y-2">
              <div className="font-medium text-sm break-words">{r.name ?? r.id}</div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>Base: <span className="text-foreground tabular-nums">{num(r.base).toLocaleString()}</span></div>
                <div>Target %: <span className="text-foreground tabular-nums">{num(r.target)}</span></div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">{t("calculated_bonus") || "Bonus"}</Label>
                <Input type="number" step="1" value={r.bonus ?? 0} onChange={(e) => updateRow(i, { bonus: num(e.target.value) })} className="h-9" />
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="p-2">{t("employee")}</th>
                <th className="p-2">Base</th>
                <th className="p-2">Target %</th>
                <th className="p-2">{t("calculated_bonus") || "Bonus"}</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={r.id ?? i} className="border-t">
                  <td className="p-2 break-all">{r.name ?? r.id}</td>
                  <td className="p-2">{num(r.base).toLocaleString()}</td>
                  <td className="p-2">{num(r.target)}</td>
                  <td className="p-2 w-32">
                    <Input type="number" step="1" value={r.bonus ?? 0} onChange={(e) => updateRow(i, { bonus: num(e.target.value) })} className="h-8" />
                  </td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">—</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Fallback: scalar key/value editor
  const entries = Object.entries(value ?? {});
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{t("edit_payload_help")}</p>
      {entries.length === 0 && <p className="text-xs text-muted-foreground">—</p>}
      {entries.map(([k, v]) => {
        const isScalar = v === null || ["string", "number", "boolean"].includes(typeof v);
        return (
          <div key={k} className="grid grid-cols-3 gap-2 items-center">
            <Label className="text-xs col-span-1 break-all">{k}</Label>
            {isScalar ? (
              <Input
                className="h-8 col-span-2"
                value={v == null ? "" : String(v)}
                onChange={(e) => onChange({ ...value, [k]: typeof v === "number" ? num(e.target.value) : e.target.value })}
              />
            ) : (
              <code className="text-[11px] col-span-2 block bg-muted/40 rounded px-2 py-1 break-all">{JSON.stringify(v)}</code>
            )}
          </div>
        );
      })}
    </div>
  );
}
