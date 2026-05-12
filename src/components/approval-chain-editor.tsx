import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ArrowUp, ArrowDown, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { listChains, listSteps, upsertChain, deleteChain, type ApprovalChain, type ApprovalChainStep } from "@/lib/approvals";
import { toast } from "sonner";

const ENTITY_TYPES = ["merit_cycle", "bonus_cycle", "salary_structure"];

interface Member { user_id: string; email: string | null; full_name: string | null }

export function ApprovalChainEditor() {
  const { t } = useI18n();
  const { organizationId } = useAuth();
  const [chains, setChains] = useState<ApprovalChain[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [name, setName] = useState("");
  const [appliesTo, setAppliesTo] = useState<string[]>([]);
  const [isDefault, setIsDefault] = useState(false);
  const [steps, setSteps] = useState<ApprovalChainStep[]>([]);

  const load = async () => {
    if (!organizationId) return;
    setChains(await listChains(organizationId));
    
    // Fetch all org members from user_roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("organization_id", organizationId);
    
    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length) {
      // Fetch profiles for these users
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", ids);
      
      // Build a map of profile data
      const profileMap = new Map<string, { email: string | null; full_name: string | null }>();
      (profs ?? []).forEach((p: any) => {
        profileMap.set(p.id, { email: p.email, full_name: p.full_name });
      });
      
      // Also fetch accepted invitations to get emails for users whose profiles might not have email
      const { data: acceptedInvites } = await supabase
        .from("pending_invitations")
        .select("email")
        .eq("organization_id", organizationId)
        .not("accepted_at", "is", null);
      
      const acceptedEmails = new Set((acceptedInvites ?? []).map(i => i.email?.toLowerCase()));
      
      // Build final member list ensuring all role holders are included
      const memberList: Member[] = [];
      for (const role of (roles ?? [])) {
        const profile = profileMap.get(role.user_id);
        let email = profile?.email ?? null;
        let fullName = profile?.full_name ?? null;
        
        // If profile has no email, check if their email matches an accepted invitation
        if (!email && profile?.full_name) {
          // Try to find email in accepted invitations (user might have profile with name but not email)
        }
        
        // Only add if we have something to display
        if (email || fullName) {
          memberList.push({
            user_id: role.user_id,
            email,
            full_name: fullName,
          });
        } else {
          // Last resort: include with user_id as identifier
          memberList.push({
            user_id: role.user_id,
            email: null,
            full_name: null,
          });
        }
      }
      
      // Filter out members with no identifiable info (but keep at least user_id)
      setMembers(memberList.filter(m => m.email || m.full_name || m.user_id));
    } else {
      setMembers([]);
    }
  };
  useEffect(() => { load(); }, [organizationId]);

  const startNew = () => {
    setEditingId("new"); setName(""); setAppliesTo([]); setIsDefault(false);
    setSteps([{ step_order: 1, name: "", approver_user_id: null, approver_email: null, approver_label: null, approver_role: null }]);
  };
  const startEdit = async (c: ApprovalChain) => {
    setEditingId(c.id); setName(c.name); setAppliesTo(c.applies_to ?? []); setIsDefault(c.is_default);
    setSteps(await listSteps(c.id));
  };
  const cancel = () => setEditingId(null);

  const updateStep = (i: number, patch: Partial<ApprovalChainStep>) =>
    setSteps((s) => s.map((st, idx) => (idx === i ? { ...st, ...patch } : st)));
  const addStep = () => setSteps((s) => [...s, { step_order: s.length + 1, name: "" }]);
  const removeStep = (i: number) => setSteps((s) => s.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    setSteps((s) => {
      const j = i + dir; if (j < 0 || j >= s.length) return s;
      const copy = [...s]; [copy[i], copy[j]] = [copy[j], copy[i]]; return copy;
    });
  };

  const save = async () => {
    if (!organizationId) return;
    if (!name.trim()) return toast.error(t("name_required"));
    if (!steps.length) return toast.error(t("at_least_one_step"));
    try {
      await upsertChain({
        id: editingId === "new" ? undefined : editingId!,
        organization_id: organizationId, name, applies_to: appliesTo, is_default: isDefault, steps,
      });
      toast.success(t("settings_saved"));
      setEditingId(null);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const del = async (id: string) => {
    if (!confirm(t("confirm_delete"))) return;
    await deleteChain(id); load();
  };

  if (editingId) {
    return (
      <div className="border rounded-lg bg-card p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>{t("chain_name")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>{t("applies_to")}</Label>
            <div className="flex flex-wrap gap-3 pt-1.5">
              {ENTITY_TYPES.map((et) => (
                <label key={et} className="flex items-center gap-1.5 text-sm">
                  <Checkbox checked={appliesTo.includes(et)} onCheckedChange={(v) => setAppliesTo((a) => v ? [...a, et] : a.filter((x) => x !== et))} />
                  {t(et)}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2"><Switch checked={isDefault} onCheckedChange={setIsDefault} /><Label>{t("default_chain")}</Label></div>

        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">{t("steps")}</Label>
          {steps.map((s, i) => (
            <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono w-6">{i + 1}.</span>
                <Input placeholder={t("step_label_placeholder")} value={s.name ?? ""} onChange={(e) => updateStep(i, { name: e.target.value })} className="flex-1" />
                <Button size="icon" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => move(i, 1)} disabled={i === steps.length - 1}><ArrowDown className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => removeStep(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">{t("internal_user")}</Label>
                  <Select value={s.approver_user_id ?? "none"} onValueChange={(v) => updateStep(i, { approver_user_id: v === "none" ? null : v, approver_email: null })}>
                    <SelectTrigger><SelectValue placeholder={t("none")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("none")}</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          {m.full_name || m.email || `${t("user")} ${m.user_id.slice(0, 8)}...`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("manual_email")}</Label>
                  <Input value={s.approver_email ?? ""} onChange={(e) => updateStep(i, { approver_email: e.target.value || null, approver_user_id: null })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("approver_label")}</Label>
                  <Input value={s.approver_label ?? ""} onChange={(e) => updateStep(i, { approver_label: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("approver_role")}</Label>
                  <Input value={s.approver_role ?? ""} onChange={(e) => updateStep(i, { approver_role: e.target.value })} />
                </div>
              </div>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={addStep}><Plus className="w-4 h-4 me-1" /> {t("add_step")}</Button>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="ghost" onClick={cancel}>{t("cancel")}</Button>
          <Button onClick={save}><Save className="w-4 h-4 me-1" /> {t("save")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase text-muted-foreground">{t("approval_chains")}</Label>
        <Button size="sm" onClick={startNew}><Plus className="w-4 h-4 me-1" /> {t("new_chain")}</Button>
      </div>
      {chains.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("no_chains_yet")}</p>
      ) : (
        <ul className="space-y-2">
          {chains.map((c) => (
            <li key={c.id} className="border rounded-md p-3 flex items-center justify-between bg-card">
              <div>
                <div className="font-medium text-sm">{c.name} {c.is_default && <span className="text-xs text-accent ms-1">★</span>}</div>
                <div className="text-xs text-muted-foreground">{(c.applies_to ?? []).map((e) => t(e)).join(" · ") || "—"}</div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => startEdit(c)}>{t("edit")}</Button>
                <Button size="icon" variant="ghost" onClick={() => del(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
