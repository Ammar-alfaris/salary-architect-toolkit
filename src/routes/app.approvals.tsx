import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import type { ApprovalEntity } from "@/lib/governance";
import { recordDecision, markApplied, getCurrentApprover } from "@/lib/approvals";
import { ApprovalDiff } from "@/components/approval-diff";
import { usePermissions } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { CheckCircle2, XCircle, Clock, FileBarChart, Layers, Gift, TrendingUp, Info, ShieldCheck, Undo2, Pencil, Eye } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/approvals")({ component: ApprovalsPage });

const ENTITY_ICON: Record<ApprovalEntity, typeof Layers> = {
  merit_cycle: TrendingUp,
  bonus_cycle: Gift,
  salary_structure: Layers,
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
  const [editsText, setEditsText] = useState("");
  const [diffReq, setDiffReq] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

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
    setEditsText(JSON.stringify(req.final_payload ?? req.proposed_payload ?? {}, null, 2));
  };

  const submit = async () => {
    if (!active) return;
    try {
      let finalPayload: any | undefined;
      if (active.action === "edited") {
        try { finalPayload = JSON.parse(editsText); }
        catch { toast.error("Invalid JSON"); return; }
      }
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
      }
      await markApplied(req.id);
      await logAudit({ organizationId: organizationId!, action: "update", entityType: req.entity_type, entityId: req.entity_id, entityLabel: req.entity_label, metadata: { applied: true } });
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
          <TabsList>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {active?.action === "approved" && t("confirm_approval")}
              {active?.action === "rejected" && t("confirm_rejection")}
              {active?.action === "edited" && t("edit_and_approve")}
              {active?.action === "sent_back" && t("send_back")}
            </DialogTitle>
            <DialogDescription>{active?.req?.entity_label}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {active?.action === "edited" && (
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Final payload (JSON)</label>
                <Textarea value={editsText} onChange={(e) => setEditsText(e.target.value)} rows={10} className="font-mono text-xs" />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">{t("decision_note")}</label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={t("decision_note_placeholder")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>{t("cancel")}</Button>
            <Button onClick={submit}>{t("confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!diffReq} onOpenChange={(o) => !o && setDiffReq(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("view_diff")}</DialogTitle>
            <DialogDescription>{diffReq?.entity_label}</DialogDescription>
          </DialogHeader>
          {diffReq && (
            <ApprovalDiff
              before={(diffReq.proposed_payload ?? {}) as Record<string, unknown>}
              after={(diffReq.final_payload ?? diffReq.proposed_payload ?? {}) as Record<string, unknown>}
            />
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
  useEffect(() => { if (req.status === "pending") getCurrentApprover(req.id).then(setApprover); }, [req.id, req.status]);

  const Icon = ENTITY_ICON[req.entity_type as ApprovalEntity] ?? FileBarChart;
  const tone = req.status === "approved" ? "ring-success/30 bg-success/5"
    : req.status === "rejected" ? "ring-destructive/30 bg-destructive/5"
    : "ring-warning/30 bg-warning/5";

  return (
    <div className={`border rounded-lg p-4 ring-1 ${tone}`}>
      <div className="flex items-start gap-3 flex-wrap">
        <div className="w-9 h-9 rounded-md bg-card border flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium text-sm">{req.entity_label || t(`entity_${req.entity_type}`)}</h4>
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full ring-1 ring-border bg-muted">{t(`entity_${req.entity_type}`)}</span>
            <StatusBadge status={req.status} />
            {req.status === "pending" && req.chain_id && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full ring-1 ring-border bg-card">{t("current_step")}: {req.current_step}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t("requested_by")}: {req.requested_by_email ?? "—"} · {fmt(req.created_at)}</p>
          {approver && req.status === "pending" && (
            <p className="text-xs text-muted-foreground mt-0.5">{t("approver")}: {approver.approver_label || approver.approver_email || "—"}</p>
          )}
          {req.reason && <p className="text-sm mt-2 text-foreground/80">"{req.reason}"</p>}
          {req.applied_at && (
            <p className="text-xs text-success mt-1">✓ Applied {fmt(req.applied_at)}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button size="sm" variant="ghost" onClick={onViewDiff}><Eye className="w-4 h-4 me-1" />{t("view_diff")}</Button>
          {req.status === "pending" && canDecide && (
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
