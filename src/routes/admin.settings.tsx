import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, AlertTriangle, FlaskConical, Rocket } from "lucide-react";
import { toast } from "sonner";
import { setPaymentMode, getPaymentMode } from "@/lib/payment-mode.functions";

export const Route = createFileRoute("/admin/settings")({ component: SettingsPage });

function SettingsPage() {
  const [s, setS] = useState<any>(null);
  const [mode, setMode] = useState<"test" | "live">("test");
  const [savingMode, setSavingMode] = useState(false);
  const setModeFn = useServerFn(setPaymentMode);
  const getModeFn = useServerFn(getPaymentMode);

  useEffect(() => {
    supabase.from("admin_settings").select("*").limit(1).maybeSingle().then(({ data }) => setS(data));
    getModeFn().then((r) => setMode(r.mode));
  }, []);

  if (!s) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const u = (k: string, v: any) => setS({ ...s, [k]: v });

  const save = async () => {
    const { id, payment_mode: _pm, ...rest } = s;
    await supabase.from("admin_settings").update(rest).eq("id", id);
    toast.success("Saved");
  };

  const savePaymentMode = async (next: "test" | "live") => {
    if (next === "live") {
      const ok = confirm(
        "Switch to LIVE payments?\n\nReal money will be charged on all new Paylink invoices. Make sure your live API credentials (PAYLINK_LIVE_BASE_URL / PAYLINK_LIVE_API_ID / PAYLINK_LIVE_SECRET_KEY) are configured before continuing.",
      );
      if (!ok) return;
    }
    setSavingMode(true);
    try {
      await setModeFn({ data: { mode: next } });
      setMode(next);
      toast.success(next === "live" ? "Live payments enabled" : "Switched back to test mode");
    } catch (e: any) {
      toast.error(e?.message || "Couldn't update payment mode");
    } finally {
      setSavingMode(false);
    }
  };

  return (
    <div>
      <AdminPageHeader title="Admin settings" subtitle="Platform-wide configuration"
        actions={<Button size="sm" onClick={save}><Save className="w-4 h-4 me-1" />Save</Button>} />
      <div className="p-4 md:p-6">
        <Tabs defaultValue="general">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
            <TabsTrigger value="blog">Blog</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card><CardHeader><CardTitle className="text-sm">General</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-3">
                <Field label="Platform name"><Input value={s.platform_name || ""} onChange={(e) => u("platform_name", e.target.value)} /></Field>
                <Field label="Admin contact email"><Input value={s.admin_contact_email || ""} onChange={(e) => u("admin_contact_email", e.target.value)} /></Field>
                <Field label="Timezone"><Input value={s.timezone} onChange={(e) => u("timezone", e.target.value)} /></Field>
                <Field label="Default locale"><Input value={s.default_locale} onChange={(e) => u("default_locale", e.target.value)} /></Field>
                <Field label="Default currency"><Input value={s.default_currency} onChange={(e) => u("default_currency", e.target.value)} /></Field>
                <Field label="Maintenance mode"><div className="pt-2"><Switch checked={s.maintenance_mode} onCheckedChange={(v) => u("maintenance_mode", v)} /></div></Field>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  Payment environment (Paylink)
                  {mode === "live" ? (
                    <Badge variant="destructive" className="gap-1"><Rocket className="w-3 h-3" /> Live</Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1"><FlaskConical className="w-3 h-3" /> Test</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Switch the platform between Paylink's test sandbox and production. The change takes effect immediately for every new payment — no redeploy required.
                </p>

                {mode === "live" && (
                  <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <strong>Live mode is active.</strong> Customers are charged real money on every successful invoice.
                    </div>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-3">
                  <ModeCard
                    active={mode === "test"}
                    title="Test (sandbox)"
                    description="Use Paylink test credentials. No real money is charged. Banner shown to all users."
                    icon={<FlaskConical className="w-4 h-4" />}
                    onClick={() => savePaymentMode("test")}
                    disabled={savingMode || mode === "test"}
                  />
                  <ModeCard
                    active={mode === "live"}
                    title="Live (production)"
                    description="Use Paylink live credentials. Real charges on every invoice. Banner is hidden."
                    icon={<Rocket className="w-4 h-4" />}
                    onClick={() => savePaymentMode("live")}
                    disabled={savingMode || mode === "live"}
                    danger
                  />
                </div>

                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer select-none">Webhook &amp; environment variables</summary>
                  <div className="mt-2 space-y-2">
                    <div>
                      <strong>Webhook URL</strong> (configure inside the Paylink merchant dashboard so subscription activation works even if the customer closes the browser):
                      <code className="block mt-1 p-2 bg-muted rounded text-[11px] break-all">https://totalreward.app/api/public/paylink/webhook</code>
                    </div>
                    <div>
                      <strong>Required secrets</strong>:
                      <ul className="list-disc ps-5 mt-1 space-y-1">
                        <li><code>PAYLINK_TEST_BASE_URL</code>, <code>PAYLINK_TEST_API_ID</code>, <code>PAYLINK_TEST_SECRET_KEY</code></li>
                        <li><code>PAYLINK_LIVE_BASE_URL</code>, <code>PAYLINK_LIVE_API_ID</code>, <code>PAYLINK_LIVE_SECRET_KEY</code></li>
                      </ul>
                    </div>
                    <div className="rounded border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2">
                      <strong>Sandbox note:</strong> <code>restpilot.paylink.sa</code> is currently unreachable (DNS error). Confirm the correct sandbox host with Paylink support and update <code>PAYLINK_TEST_BASE_URL</code> accordingly. Until then, test with a 1 SAR live charge and refund.
                    </div>
                  </div>
                </details>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support">
            <Card><CardHeader><CardTitle className="text-sm">Support</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-3">
                <Field label="Support email"><Input value={s.support_email || ""} onChange={(e) => u("support_email", e.target.value)} /></Field>
                <Field label="Default sender email"><Input value={s.default_sender_email || ""} onChange={(e) => u("default_sender_email", e.target.value)} /></Field>
                <Field label="Contact form routing"><Input value={s.contact_form_routing || ""} onChange={(e) => u("contact_form_routing", e.target.value)} /></Field>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blog">
            <Card><CardHeader><CardTitle className="text-sm">Blog</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-3">
                <Field label="Permalink pattern"><Input value={s.blog_permalink_pattern} onChange={(e) => u("blog_permalink_pattern", e.target.value)} /></Field>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscription">
            <Card><CardHeader><CardTitle className="text-sm">Subscription defaults</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-3">
                <Field label="Default trial days"><Input type="number" value={s.default_trial_days} onChange={(e) => u("default_trial_days", +e.target.value)} /></Field>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card><CardHeader><CardTitle className="text-sm">Security (placeholder)</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">Authentication and security policy controls coming soon.</CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ModeCard({ active, title, description, icon, onClick, disabled, danger }: {
  active: boolean; title: string; description: string; icon: React.ReactNode;
  onClick: () => void; disabled?: boolean; danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "text-start rounded-lg border p-4 transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
        active ? (danger ? "border-red-500 bg-red-50 dark:bg-red-950/40" : "border-primary bg-primary/5") : "hover:bg-muted/40",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 mb-1 font-medium text-sm">
        {icon}
        {title}
        {active && <Badge variant={danger ? "destructive" : "default"} className="ms-auto">Active</Badge>}
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
