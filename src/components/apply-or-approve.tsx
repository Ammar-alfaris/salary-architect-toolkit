import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, CheckCircle2, Info, Settings as SettingsIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/lib/rbac";
import { createRequest, fetchPolicy, listChains, listSteps, type ApprovalChain } from "@/lib/approvals";
import type { ApprovalEntity } from "@/lib/governance";
import { toast } from "sonner";

interface Props {
  entityType: ApprovalEntity;
  entityKey: ApprovalEntity | "allowance_change";
  entityId?: string | null;
  entityLabel?: string;
  proposedPayload: Record<string, unknown>;
  onApply: () => Promise<void> | void;
  applying?: boolean;
  applyLabel?: string;
}

export function ApplyOrApprove({ entityType, entityKey, entityId, entityLabel, proposedPayload, onApply, applying, applyLabel }: Props) {
  const { t } = useI18n();
  const { organizationId } = useAuth();
  const perms = usePermissions();
  const [requireApproval, setRequireApproval] = useState(false);
  const [chains, setChains] = useState<ApprovalChain[]>([]);
  const [open, setOpen] = useState(false);
  const [chainId, setChainId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!organizationId) return;
    fetchPolicy(organizationId).then((p) => setRequireApproval(!!p.require_approval_for[entityKey]));
    listChains(organizationId).then((cs) => {
      const applicable = cs.filter((c) => (c.applies_to ?? []).includes(entityType));
      setChains(applicable);
      const def = applicable.find((c) => c.is_default) ?? applicable[0];
      if (def) setChainId(def.id);
    });
  }, [organizationId, entityKey, entityType]);

  const canApplyDirect = perms.canAdmin || !requireApproval;

  const submitRequest = async () => {
    if (!organizationId || !entityId) return;
    setSubmitting(true);
    try {
      await createRequest({
        organizationId,
        entityType,
        entityId,
        entityLabel,
        reason,
        proposedPayload,
        chainId: chainId || undefined,
      });
      toast.success(t("approval_submitted"));
      setOpen(false);
      setReason("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {requireApproval && !canApplyDirect && (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5" /> {t("approval_required_for_action")}
        </span>
      )}
      {canApplyDirect && (
        <Button size="sm" onClick={() => onApply()} disabled={!!applying}>
          <CheckCircle2 className="w-4 h-4 me-1" /> {applyLabel ?? t("apply_now")}
        </Button>
      )}
      {requireApproval && chains.length === 0 ? (
        <Button asChild size="sm" variant="outline">
          <Link to="/app/settings"><SettingsIcon className="w-4 h-4 me-1" /> {t("setup_approval_chain")}</Link>
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)} disabled={!entityId}>
          <Send className="w-4 h-4 me-1" /> {t("request_approval")}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("request_approval")}</DialogTitle>
            <DialogDescription>{t("request_approval_helper")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("approval_chain")}</Label>
              {chains.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("no_chains_configured")}</p>
              ) : (
                <Select value={chainId} onValueChange={setChainId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {chains.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.is_default ? " ★" : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("approval_reason")}</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button onClick={submitRequest} disabled={submitting || (chains.length > 0 && !chainId)}>
              {t("send_request")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
