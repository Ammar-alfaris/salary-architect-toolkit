import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({ component: SettingsPage });

function SettingsPage() {
  const [s, setS] = useState<any>(null);

  useEffect(() => {
    supabase.from("admin_settings").select("*").limit(1).maybeSingle().then(({ data }) => setS(data));
  }, []);

  if (!s) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const u = (k: string, v: any) => setS({ ...s, [k]: v });

  const save = async () => {
    const { id, ...rest } = s;
    await supabase.from("admin_settings").update(rest).eq("id", id);
    toast.success("Saved");
  };

  return (
    <div>
      <AdminPageHeader title="Admin settings" subtitle="Platform-wide configuration"
        actions={<Button size="sm" onClick={save}><Save className="w-4 h-4 me-1" />Save</Button>} />
      <div className="p-4 md:p-6">
        <Tabs defaultValue="general">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="general">General</TabsTrigger>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
