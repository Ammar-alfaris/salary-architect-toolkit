import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Clock, Lock, Send, ShieldCheck, Unlock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/lib/rbac";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchApprovalSettings,
  isLocked,
  submitApproval,
  type ApprovalEntity,
  type ApprovalSettings,
} from "@/lib/governance";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";

interface Props {
  entityType: ApprovalEntity;
  entityId: string;
  entityLabel?: string;
  onLockChange?: (locked: boolean) => void;
}

export function ApprovalBar({ entityType, entityId, entityLabel, onLockChange }: Props) {
  const { t } = useI18n();
  const { organizationId } = useAuth();
  const perms = usePermissions();
  const [settings, setSettings] = useState<ApprovalSettings | null>(null);
  const [pending, setPending] = useState<any | null>(null);
  const [locked, setLocked] = useState(false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = async () => {
    if (!organizationId) return;
    const [s, lock, p] = await Promise.all([
      fetchApprovalSettings(organizationId),
      isLocked({ orgId: organizationId, entityType, entityId }),
      supabase
        .from("approval_requests")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    setSettings(s);
    setLocked(lock.locked);
    setPending(p.data ?? null);
    onLockChange?.(lock.locked);
  };

  useEffect(() => {
    if (organizationId && entityId) refresh();
  }, [organizationId, entityId]);

  const submit = async () => {
    if (!organizationId) return;
    setSubmitting(true);
    try {
      await submitApproval({
        organizationId,
        entityType,
        entityId,
        entityLabel,
        reason,
      });
      await logAudit({
        organizationId,
        action: "update",
        entityType: entityType as any,
        entityId,
        entityLabel,
        metadata: { event: "approval_submitted", reason },
      });
      toast.success(t("approval_submitted"));
      setOpen(false);
      setReason("");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const unlock = async () => {
    if (!organizationId) return;
    // Mark latest approved request as cancelled to release the lock
    const { data: latest } = await supabase
      .from("approval_requests")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("status", "approved")
      .order("reviewed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest?.id) {
      await supabase.from("approval_requests").update({ status: "cancelled" }).eq("id", latest.id);
      await logAudit({
        organizationId,
        action: "update",
        entityType: entityType as any,
        entityId,
        entityLabel,
        metadata: { event: "approval_unlocked" },
      });
    }
    toast.success(t("approval_unlocked"));
    refresh();
  };

  if (!entityId) return null;

  return (
    <div className="border rounded-lg bg-card p-3 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-sm">
        <ShieldCheck className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground">{t("approvals")}:</span>
        {locked ? (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ring-1 ring-success/30 bg-success/10 text-success">
            <Lock className="w-3 h-3" /> {t("approval_locked_label")}
          </span>
        ) : pending ? (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ring-1 ring-warning/30 bg-warning/10 text-warning-foreground">
            <Clock className="w-3 h-3" /> {t("approval_pending_label")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ring-1 ring-border bg-muted text-muted-foreground">
            <CheckCircle2 className="w-3 h-3" /> {t("status_pending")}
          </span>
        )}
      </div>

      <div className="flex-1" />

      {!locked && !pending && perms.canEdit && (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Send className="w-4 h-4 me-1" /> {t("submit_for_approval")}
        </Button>
      )}
      {locked && settings?.allow_admin_unlock && perms.canAdmin && (
        <Button size="sm" variant="outline" onClick={unlock}>
          <Unlock className="w-4 h-4 me-1" /> {t("approval_unlock")}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("submit_approval_title")}</DialogTitle>
            <DialogDescription>{t("submit_approval_helper")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">{t("approval_reason")}</label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button onClick={submit} disabled={submitting}>{t("submit_for_approval")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
