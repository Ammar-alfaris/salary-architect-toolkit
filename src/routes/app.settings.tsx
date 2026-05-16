import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_APPROVAL_SETTINGS, type ApprovalSettings } from "@/lib/governance";
import { ApprovalChainEditor } from "@/components/approval-chain-editor";
import { usePermissions } from "@/lib/rbac";
import { toast } from "sonner";

type SettingsTab = "org" | "defaults" | "approvals" | "locale" | "fields";
const VALID_TABS: SettingsTab[] = ["org", "defaults", "approvals", "locale", "fields"];

export const Route = createFileRoute("/app/settings")({
  validateSearch: (search: Record<string, unknown>): { tab?: SettingsTab } => {
    const t = search.tab;
    return { tab: typeof t === "string" && (VALID_TABS as string[]).includes(t) ? (t as SettingsTab) : undefined };
  },
  component: SettingsPage,
});

function SettingsPage() {
  const { organizationId, refreshOrg } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const { theme, toggle } = useTheme();
  const perms = usePermissions();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const tab: SettingsTab = search.tab ?? "org";
  const [org, setOrg] = useState<any>(null);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [approval, setApproval] = useState<ApprovalSettings>(DEFAULT_APPROVAL_SETTINGS);

  useEffect(() => {
    if (!organizationId) return;
    supabase.from("organizations").select("*").eq("id", organizationId).maybeSingle().then(({ data }) => {
      if (data) {
        setOrg(data);
        setName(data.name);
        setCurrency(data.default_currency);
        const raw = (data as any).approval_settings;
        if (raw) setApproval({ ...DEFAULT_APPROVAL_SETTINGS, ...raw });
      }
    });
  }, [organizationId]);

  const save = async () => {
    if (!organizationId) return;
    const { error } = await supabase.from("organizations").update({ name, default_currency: currency }).eq("id", organizationId);
    if (error) return toast.error(error.message);
    await refreshOrg();
    toast.success(t("settings_saved"));
  };

  const saveApproval = async (next: ApprovalSettings) => {
    setApproval(next);
    if (!organizationId) return;
    const { error } = await supabase
      .from("organizations")
      .update({ approval_settings: next as never })
      .eq("id", organizationId);
    if (error) toast.error(error.message);
    else toast.success(t("settings_saved"));
  };

  return (
    <div>
      <PageHeader title={t("settings")} subtitle={t("settings_subtitle")} />
      <div className="p-4 md:p-6" dir={locale === "ar" ? "rtl" : "ltr"}>
        <Tabs value={tab} onValueChange={(v) => navigate({ search: { tab: v as SettingsTab }, replace: true })} className="max-w-3xl">
          <TabsList className="justify-start">
            <TabsTrigger value="org">{t("organization")}</TabsTrigger>
            <TabsTrigger value="defaults">{t("defaults")}</TabsTrigger>
            <TabsTrigger value="approvals">{t("approvals")}</TabsTrigger>
            <TabsTrigger value="locale">{t("localization")}</TabsTrigger>
            <TabsTrigger value="fields">{t("employee_fields_tab")}</TabsTrigger>
          </TabsList>

          <TabsContent value="org" className="mt-4">
            <div className="border rounded-lg bg-card p-5 space-y-4">
              <div className="space-y-1.5"><Label>{t("company_name")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-1.5">
                <Label>{t("default_currency")}</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>{["USD", "EUR", "GBP", "AED", "SAR", "EGP", "JOD", "KWD"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={save}>{t("save")}</Button>
            </div>
          </TabsContent>

          <TabsContent value="defaults" className="mt-4">
            <div className="border rounded-lg bg-card p-5 space-y-3 text-sm">
              <p className="text-muted-foreground">{t("defaults_helper")}</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>{t("def_progression")}</li>
                <li>{t("def_spread")}</li>
                <li>{t("def_rounding")}</li>
                <li>{t("def_merit")}</li>
                <li>{t("def_housing")}</li>
              </ul>
              <p className="text-xs text-muted-foreground pt-2">{t("defaults_can_override")}</p>
            </div>
          </TabsContent>

          <TabsContent value="approvals" className="mt-4">
            <div className="border rounded-lg bg-card p-5 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Label>{t("approval_lock_on_approval")}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("approval_lock_on_approval_help")}</p>
                </div>
                <Switch
                  checked={approval.lock_on_approval}
                  disabled={!perms.canAdmin}
                  onCheckedChange={(v) => saveApproval({ ...approval, lock_on_approval: v })}
                />
              </div>
              <div className="flex items-start justify-between gap-4 border-t pt-4">
                <div className="min-w-0">
                  <Label>{t("approval_allow_unlock")}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("approval_allow_unlock_help")}</p>
                </div>
                <Switch
                  checked={approval.allow_admin_unlock}
                  disabled={!perms.canAdmin}
                  onCheckedChange={(v) => saveApproval({ ...approval, allow_admin_unlock: v })}
                />
              </div>
              <div className="flex items-start justify-between gap-4 border-t pt-4">
                <div className="min-w-0">
                  <Label>{t("approval_two_step")}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("approval_two_step_help")}</p>
                </div>
                <Switch
                  checked={approval.require_two_step}
                  disabled={!perms.canAdmin}
                  onCheckedChange={(v) => saveApproval({ ...approval, require_two_step: v })}
                />
              </div>
              {!perms.canAdmin && (
                <p className="text-xs text-muted-foreground pt-2">Admin role required to change these settings.</p>
              )}
            </div>
            {perms.canAdmin && (
              <div className="border rounded-lg bg-card p-5 mt-4">
                <ApprovalChainEditor />
              </div>
            )}
          </TabsContent>

          <TabsContent value="locale" className="mt-4">
            <div className="border rounded-lg bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div><Label>{t("language")}</Label><p className="text-xs text-muted-foreground mt-0.5">{t("language_helper")}</p></div>
                <div className="flex gap-2">
                  <Button size="sm" variant={locale === "en" ? "default" : "outline"} onClick={() => setLocale("en")}>English</Button>
                  <Button size="sm" variant={locale === "ar" ? "default" : "outline"} onClick={() => setLocale("ar")}>العربية</Button>
                </div>
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <div><Label>{t("appearance")}</Label><p className="text-xs text-muted-foreground mt-0.5">{t("light_dark_mode")}</p></div>
                <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{theme === "dark" ? t("dark") : t("light")}</span><Switch checked={theme === "dark"} onCheckedChange={toggle} /></div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="fields" className="mt-4">
            <CustomFieldsAdmin organizationId={organizationId} canAdmin={perms.canAdmin} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CustomFieldsAdmin({ organizationId, canAdmin }: { organizationId: string | null; canAdmin: boolean }) {
  const { t } = useI18n();
  const [defs, setDefs] = useState<any[]>([]);
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [ftype, setFtype] = useState("text");

  const load = async () => {
    if (!organizationId) return;
    const { data } = await supabase.from("org_custom_field_defs").select("*").eq("organization_id", organizationId).order("created_at");
    setDefs(data ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [organizationId]);

  const add = async () => {
    if (!organizationId || !label.trim() || !key.trim()) return;
    const k = key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const { error } = await supabase.from("org_custom_field_defs").insert({ organization_id: organizationId, label: label.trim(), key: k, field_type: ftype });
    if (error) return toast.error(error.message);
    setLabel(""); setKey(""); setFtype("text");
    await load();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("org_custom_field_defs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await load();
  };

  return (
    <div className="border rounded-lg bg-card p-5 space-y-4">
      <h3 className="font-semibold text-sm">{t("custom_employee_fields")}</h3>
      {defs.length === 0 ? <p className="text-xs text-muted-foreground">{t("no_custom_fields_yet")}</p> : (
        <div className="space-y-1">
          {defs.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
              <div><span className="font-medium">{d.label}</span> <span className="text-xs text-muted-foreground ms-2">{d.key} • {d.field_type}</span></div>
              {canAdmin && <Button size="sm" variant="ghost" onClick={() => remove(d.id)}>{t("remove")}</Button>}
            </div>
          ))}
        </div>
      )}
      {canAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-3 border-t">
          <div><Label className="text-xs">{t("custom_field_label")}</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} /></div>
          <div><Label className="text-xs">{t("custom_field_key")}</Label><Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="national_id" /></div>
          <div><Label className="text-xs">{t("custom_field_type")}</Label>
            <Select value={ftype} onValueChange={setFtype}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">{t("field_type_text")}</SelectItem>
                <SelectItem value="number">{t("field_type_number")}</SelectItem>
                <SelectItem value="date">{t("field_type_date")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end"><Button onClick={add} disabled={!label || !key}>{t("add_field")}</Button></div>
        </div>
      )}
    </div>
  );
}
