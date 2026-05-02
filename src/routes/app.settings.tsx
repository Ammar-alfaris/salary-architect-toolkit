import { createFileRoute } from "@tanstack/react-router";
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
import { usePermissions } from "@/lib/rbac";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

function SettingsPage() {
  const { organizationId, refreshOrg } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const { theme, toggle } = useTheme();
  const perms = usePermissions();
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
        <Tabs defaultValue="org" className="max-w-3xl">
          <TabsList className="justify-start">
            <TabsTrigger value="org">{t("organization")}</TabsTrigger>
            <TabsTrigger value="defaults">{t("defaults")}</TabsTrigger>
            <TabsTrigger value="approvals">{t("approvals")}</TabsTrigger>
            <TabsTrigger value="locale">{t("localization")}</TabsTrigger>
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
        </Tabs>
      </div>
    </div>
  );
}
