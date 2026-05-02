import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { decideApproval, type ApprovalEntity } from "@/lib/governance";
import { usePermissions } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { CheckCircle2, XCircle, Clock, FileBarChart, Layers, Gift, TrendingUp, Info, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/approvals")({ component: ApprovalsPage });

const ENTITY_ICON: Record<ApprovalEntity, typeof Layers> = {
  merit_cycle: TrendingUp,
  bonus_cycle: Gift,
  salary_structure: Layers,
};

function ApprovalsPage() {
  const { organizationId } = useAuth();
  const { t, locale } = useI18n();
  const perms = usePermissions();
  const [requests, setRequests] = useState<any[]>([]);
  const [tab, setTab] = useState("pending");
  const [decision, setDecision] = useState<{ id: string; type: "approved" | "rejected" } | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!organizationId) return;
    setLoading(true);
    const { data } = await supabase
      .from("approval_requests")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    setRequests(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [organizationId]);

  const filtered = useMemo(
    () => requests.filter((r) => (tab === "all" ? true : r.status === tab)),
    [requests, tab],
  );

  const submitDecision = async () => {
    if (!decision || !organizationId) return;
    try {
      await decideApproval({ requestId: decision.id, decision: decision.type, note });
      const req = requests.find((r) => r.id === decision.id);
      await logAudit({
        organizationId,
        action: "update",
        entityType: req?.entity_type as any,
        entityId: req?.entity_id,
        entityLabel: req?.entity_label,
        metadata: { approval_decision: decision.type, note },
      });
      toast.success(t(decision.type === "approved" ? "approval_approved" : "approval_rejected"));
      setDecision(null);
      setNote("");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
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
                {filtered.map((r) => {
                  const Icon = ENTITY_ICON[r.entity_type as ApprovalEntity] ?? FileBarChart;
                  const tone =
                    r.status === "approved" ? "ring-success/30 bg-success/5"
                    : r.status === "rejected" ? "ring-destructive/30 bg-destructive/5"
                    : "ring-warning/30 bg-warning/5";
                  return (
                    <div key={r.id} className={`border rounded-lg p-4 ring-1 ${tone}`}>
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-md bg-card border flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-medium text-sm">{r.entity_label || t(`entity_${r.entity_type}`)}</h4>
                            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full ring-1 ring-border bg-muted">
                              {t(`entity_${r.entity_type}`)}
                            </span>
                            <StatusBadge status={r.status} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("requested_by")}: {r.requested_by_email ?? "—"} · {fmt(r.created_at)}
                          </p>
                          {r.reason && (
                            <p className="text-sm mt-2 text-foreground/80">"{r.reason}"</p>
                          )}
                          {r.status !== "pending" && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              {t("reviewed_by")}: {r.reviewed_by_email ?? "—"}
                              {r.reviewed_at && ` · ${fmt(r.reviewed_at)}`}
                              {r.decision_note && <p className="mt-1 text-foreground/70">"{r.decision_note}"</p>}
                            </div>
                          )}
                        </div>
                        {r.status === "pending" && (perms.has("manager") || perms.canAdmin) && (
                          <div className="flex gap-2 shrink-0">
                            <Button size="sm" variant="outline" onClick={() => { setDecision({ id: r.id, type: "rejected" }); setNote(""); }}>
                              <XCircle className="w-4 h-4 me-1" /> {t("reject")}
                            </Button>
                            <Button size="sm" onClick={() => { setDecision({ id: r.id, type: "approved" }); setNote(""); }}>
                              <CheckCircle2 className="w-4 h-4 me-1" /> {t("approve")}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!decision} onOpenChange={(o) => !o && setDecision(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision?.type === "approved" ? t("confirm_approval") : t("confirm_rejection")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">{t("decision_note")}</label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={t("decision_note_placeholder")} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecision(null)}>{t("cancel")}</Button>
            <Button onClick={submitDecision}>{t("confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
