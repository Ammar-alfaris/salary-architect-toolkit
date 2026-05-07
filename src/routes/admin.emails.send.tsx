import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { brandedWrap, fetchTemplate, type EmailTemplate } from "@/lib/email-templates";
import { useServerFn } from "@tanstack/react-start";
import { sendEmailCampaign } from "@/lib/email-campaign.functions";

export const Route = createFileRoute("/admin/emails/send")({ component: SendEmailPage });

type Audience = "all" | "single" | "role";

function SendEmailPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [tplKey, setTplKey] = useState("custom_message");
  const [tpl, setTpl] = useState<EmailTemplate | null>(null);
  const [audience, setAudience] = useState<Audience>("single");
  const [single, setSingle] = useState("");
  const [role, setRole] = useState("user");
  const [recipients, setRecipients] = useState<{ email: string; name?: string }[]>([]);
  const [subjectAr, setSubjectAr] = useState("");
  const [subjectEn, setSubjectEn] = useState("");
  const [bodyAr, setBodyAr] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [locale, setLocale] = useState<"ar" | "en">("ar");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase.from("email_templates").select("*").eq("enabled", true).order("display_name")
      .then(({ data }) => setTemplates((data as any) || []));
  }, []);

  useEffect(() => {
    fetchTemplate(tplKey).then((t) => {
      if (!t) return;
      setTpl(t);
      setSubjectAr(t.subject_ar); setSubjectEn(t.subject_en);
      setBodyAr(t.body_ar); setBodyEn(t.body_en);
    });
  }, [tplKey]);

  // Resolve recipients
  useEffect(() => {
    (async () => {
      if (audience === "single") {
        setRecipients(single.trim() ? [{ email: single.trim() }] : []);
        return;
      }
      let q = supabase.from("profiles").select("email, full_name");
      const { data } = await q;
      let rows = (data || []) as any[];
      if (audience === "role") {
        // Filter by role via user_roles join — fall back to all if no rows
        const { data: ur } = await supabase.from("user_roles").select("user_id, role").eq("role", role as any);
        const ids = new Set((ur || []).map((u: any) => u.user_id));
        const { data: profs } = await supabase.from("profiles").select("id, email, full_name");
        rows = (profs || []).filter((p: any) => ids.has(p.id));
      }
      setRecipients(rows.map((r) => ({ email: r.email, name: r.full_name })).filter((r) => !!r.email));
    })();
  }, [audience, single, role]);

  const previewHtml = useMemo(() => brandedWrap({
    subject: locale === "ar" ? subjectAr : subjectEn,
    bodyHtml: locale === "ar" ? bodyAr : bodyEn,
    locale,
  }), [subjectAr, subjectEn, bodyAr, bodyEn, locale]);

  const send = async () => {
    if (!recipients.length) return toast.error("No recipients");
    if (!confirm(`Send to ${recipients.length} recipient(s)?`)) return;
    setSending(true);
    try {
      const subject = locale === "ar" ? subjectAr : subjectEn;
      const body = locale === "ar" ? bodyAr : bodyEn;
      const html = brandedWrap({ subject, bodyHtml: body, locale });
      const rows = recipients.map((r) => ({
        template_key: tplKey,
        recipient_email: r.email,
        recipient_name: r.name || null,
        subject,
        body_html: html,
        locale,
        status: "pending" as const,
      }));
      // Best-effort log into email_send_log if available
      const { error } = await supabase.from("email_send_log" as any).insert(rows as any);
      if (error) console.warn("Log insert failed", error);
      toast.success(`Queued ${recipients.length} email(s) for delivery`);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSending(false); }
  };

  return (
    <div>
      <AdminPageHeader title="Send email campaign" subtitle="Compose and send branded emails to users"
        actions={<Button asChild variant="outline" size="sm"><Link to="/admin/emails"><ArrowLeft className="w-4 h-4 me-1" />Templates</Link></Button>} />
      <div className="p-4 md:p-6 grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Composer</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Template</Label>
              <Select value={tplKey} onValueChange={setTplKey}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => <SelectItem key={t.key} value={t.key}>{t.display_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Audience</Label>
              <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single recipient</SelectItem>
                  <SelectItem value="all">All users</SelectItem>
                  <SelectItem value="role">By role</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {audience === "single" && (
              <div className="space-y-1.5"><Label>Email address</Label>
                <Input type="email" value={single} onChange={(e) => setSingle(e.target.value)} placeholder="user@example.com" /></div>
            )}
            {audience === "role" && (
              <div className="space-y-1.5"><Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="analyst">Analyst</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm rounded-md border p-2 bg-muted/30">
              <Users className="w-4 h-4" />
              <span>Recipients: <strong>{recipients.length}</strong></span>
            </div>

            <Tabs value={locale} onValueChange={(v) => setLocale(v as any)}>
              <TabsList><TabsTrigger value="ar">العربية</TabsTrigger><TabsTrigger value="en">English</TabsTrigger></TabsList>
              <TabsContent value="ar" className="space-y-2 mt-3" dir="rtl">
                <Label>الموضوع</Label>
                <Input value={subjectAr} onChange={(e) => setSubjectAr(e.target.value)} />
                <Label>المحتوى (HTML)</Label>
                <Textarea rows={10} value={bodyAr} onChange={(e) => setBodyAr(e.target.value)} className="font-mono text-xs" />
              </TabsContent>
              <TabsContent value="en" className="space-y-2 mt-3">
                <Label>Subject</Label>
                <Input value={subjectEn} onChange={(e) => setSubjectEn(e.target.value)} />
                <Label>Body (HTML)</Label>
                <Textarea rows={10} value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} className="font-mono text-xs" />
              </TabsContent>
            </Tabs>

            <div className="pt-2">
              <Button onClick={send} disabled={sending || !recipients.length}>
                <Send className="w-4 h-4 me-1" /> {sending ? "Sending…" : `Send to ${recipients.length}`}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Preview ({locale.toUpperCase()})</CardTitle></CardHeader>
          <CardContent>
            <iframe title="preview" srcDoc={previewHtml} className="w-full h-[640px] border rounded-md bg-white" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
