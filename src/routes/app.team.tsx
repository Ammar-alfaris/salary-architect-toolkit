import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions, type AppRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { UserPlus, Trash2, Mail, ShieldCheck, ShieldAlert, Check, X, Send } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { sendTeamInvitation } from "@/lib/invitations.functions";

export const Route = createFileRoute("/app/team")({ component: TeamPage });

const ROLES: AppRole[] = ["admin", "manager", "analyst", "viewer"];

const PERMS: Array<{ key: string; admin: boolean; manager: boolean; analyst: boolean; viewer: boolean }> = [
  { key: "perm_view", admin: true, manager: true, analyst: true, viewer: true },
  { key: "perm_view_salary", admin: true, manager: true, analyst: true, viewer: false },
  { key: "perm_edit", admin: true, manager: false, analyst: true, viewer: false },
  { key: "perm_approve", admin: true, manager: true, analyst: false, viewer: false },
  { key: "perm_delete", admin: true, manager: false, analyst: false, viewer: false },
  { key: "perm_admin", admin: true, manager: false, analyst: false, viewer: false },
];

function TeamPage() {
  const { organizationId, user } = useAuth();
  const { t, locale } = useI18n();
  const perms = usePermissions();
  const inviteFn = useServerFn(sendTeamInvitation);
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("analyst");
  const [inviting, setInviting] = useState(false);

  const load = async () => {
    if (!organizationId) return;
    setLoading(true);
    const [{ data: roleRows }, { data: inviteRows }] = await Promise.all([
      supabase.from("user_roles").select("id,user_id,role,created_at").eq("organization_id", organizationId),
      supabase.from("pending_invitations").select("*").eq("organization_id", organizationId).is("accepted_at", null).order("created_at", { ascending: false }),
    ]);
    const userIds = (roleRows ?? []).map((r) => r.user_id);
    let profiles: any[] = [];
    if (userIds.length) {
      const { data } = await supabase.from("profiles").select("id,full_name,email").in("id", userIds);
      profiles = data ?? [];
    }
    const byId = new Map(profiles.map((p) => [p.id, p]));
    setMembers((roleRows ?? []).map((r) => ({ ...r, profile: byId.get(r.user_id) })));
    setInvites(inviteRows ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [organizationId]);

  const handleInvite = async () => {
    if (!organizationId || !user) return;
    if (!inviteEmail.trim()) return toast.error(t("invite_email"));
    const { error } = await supabase.from("pending_invitations").insert({
      organization_id: organizationId,
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      invited_by: user.id,
      invited_by_email: user.email ?? null,
    });
    if (error) return toast.error(error.message);
    toast.success(t("invite_sent"));
    await logAudit({
      organizationId, action: "create", entityType: "invitation",
      entityLabel: `${inviteEmail} as ${inviteRole}`,
    });
    setOpen(false);
    setInviteEmail("");
    setInviteRole("analyst");
    load();
  };

  const handleRoleChange = async (rowId: string, newRole: AppRole, label: string) => {
    if (!organizationId) return;
    const { error } = await supabase.from("user_roles").update({ role: newRole }).eq("id", rowId);
    if (error) return toast.error(error.message);
    toast.success(t("role_change_saved"));
    await logAudit({ organizationId, action: "update", entityType: "user_role", entityLabel: `${label} → ${newRole}` });
    load();
  };

  const handleRemoveMember = async (rowId: string, userId: string, label: string) => {
    if (!organizationId) return;
    if (userId === user?.id) return toast.error(t("cant_remove_self"));
    const { error } = await supabase.from("user_roles").delete().eq("id", rowId);
    if (error) return toast.error(error.message);
    toast.success(t("remove_member"));
    await logAudit({ organizationId, action: "delete", entityType: "user_role", entityLabel: label });
    load();
  };

  const handleCancelInvite = async (id: string, email: string) => {
    if (!organizationId) return;
    const { error } = await supabase.from("pending_invitations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await logAudit({ organizationId, action: "delete", entityType: "invitation", entityLabel: email });
    load();
  };

  const fmt = (iso: string) => new Date(iso).toLocaleDateString(locale === "ar" ? "ar" : "en");

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => (a.profile?.email ?? "").localeCompare(b.profile?.email ?? "")),
    [members],
  );

  return (
    <div>
      <PageHeader
        title={t("team")}
        subtitle={t("team_subtitle")}
        actions={
          perms.canAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="w-4 h-4 me-1" /> {t("invite_member")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t("invite_member_title")}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>{t("invite_email")}</Label>
                    <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@company.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("invite_role")}</Label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>{t(`role_${r}`)} — <span className="text-xs text-muted-foreground">{t(`role_${r}_desc`)}</span></SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpen(false)}>{t("cancel")}</Button>
                  <Button onClick={handleInvite}>{t("invite_member")}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <div className="p-4 md:p-6 space-y-6">
        {!perms.canAdmin && !perms.loading && (
          <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 p-3 text-xs">
            <ShieldAlert className="w-4 h-4 text-warning mt-0.5" />
            <span>{t("your_role_is", { role: t(`role_${perms.role ?? "viewer"}`) })}</span>
          </div>
        )}

        {/* Permissions matrix */}
        <section className="border rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h2 className="font-medium text-sm">{t("permissions_matrix")}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-start px-4 py-2.5">{t("permissions_matrix")}</th>
                  {ROLES.map((r) => <th key={r} className="px-4 py-2.5 text-center">{t(`role_${r}`)}</th>)}
                </tr>
              </thead>
              <tbody>
                {PERMS.map((p) => (
                  <tr key={p.key} className="border-t">
                    <td className="px-4 py-2.5 font-medium">{t(p.key)}</td>
                    {ROLES.map((r) => (
                      <td key={r} className="px-4 py-2.5 text-center">
                        {p[r] ? <Check className="w-4 h-4 inline text-success" /> : <X className="w-4 h-4 inline text-muted-foreground/40" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t bg-muted/20 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {ROLES.map((r) => (
              <div key={r}><span className="font-medium">{t(`role_${r}`)}:</span> <span className="text-muted-foreground">{t(`role_${r}_desc`)}</span></div>
            ))}
          </div>
        </section>

        {/* Current members */}
        <section className="border rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h2 className="font-medium text-sm">{t("current_members")} ({members.length})</h2>
          </div>
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">{t("loading")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-start px-4 py-2.5">{t("name")}</th>
                    <th className="text-start px-4 py-2.5">{t("email") || "Email"}</th>
                    <th className="text-start px-4 py-2.5">{t("invite_role")}</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMembers.map((m) => {
                    const isSelf = m.user_id === user?.id;
                    const label = m.profile?.email ?? m.user_id;
                    return (
                      <tr key={m.id} className="border-t hover:bg-muted/20">
                        <td className="px-4 py-2.5">
                          {m.profile?.full_name ?? "—"}
                          {isSelf && <span className="ms-2 text-[10px] uppercase tracking-wide rounded-full bg-primary/10 text-primary px-1.5 py-0.5">you</span>}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{m.profile?.email ?? "—"}</td>
                        <td className="px-4 py-2.5">
                          {perms.canAdmin && !isSelf ? (
                            <Select value={m.role} onValueChange={(v) => handleRoleChange(m.id, v as AppRole, label)}>
                              <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {ROLES.map((r) => <SelectItem key={r} value={r}>{t(`role_${r}`)}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">{t(`role_${m.role}`)}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-end">
                          {perms.canAdmin && !isSelf && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" aria-label={t("remove_member")}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t("remove_member")}</AlertDialogTitle>
                                  <AlertDialogDescription>{label}</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRemoveMember(m.id, m.user_id, label)}>{t("confirm")}</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Pending invitations */}
        <section className="border rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            <h2 className="font-medium text-sm">{t("pending_invitations")} ({invites.length})</h2>
          </div>
          {invites.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">{t("no_pending")}</div>
          ) : (
            <div className="divide-y">
              {invites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <div className="font-medium">{inv.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {t(`role_${inv.role}`)} · {t("requested_by")}: {inv.invited_by_email ?? "—"} · {fmt(inv.created_at)}
                    </div>
                  </div>
                  {perms.canAdmin && (
                    <Button size="sm" variant="ghost" onClick={() => handleCancelInvite(inv.id, inv.email)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
