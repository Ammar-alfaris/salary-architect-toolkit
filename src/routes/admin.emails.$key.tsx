import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { EmailTemplate } from "@/lib/email-templates";
import { brandedWrap, interpolate } from "@/lib/email-templates";

export const Route = createFileRoute("/admin/emails/$key")({ component: EmailEditor });

const COMMON_VARS = ["userName","userEmail","planName","ticketNumber","subject","status","verifyUrl","appName","amount","currency","startDate","endDate","priority","category","message"];

function EmailEditor() {
  const { key } = Route.useParams();
  const nav = useNavigate();
  const [t, setT] = useState<EmailTemplate | null>(null);
  const [vars, setVars] = useState<string[]>([]);
  const [previewLocale, setPreviewLocale] = useState<"ar" | "en">("ar");

  const load = async () => {
    const { data } = await supabase.from("email_templates").select("*").eq("key", key).maybeSingle();
    if (!data) return;
    setT(data as any);
    setVars(((data as any).variables ?? []) as string[]);
  };
  useEffect(() => { load(); }, [key]);

  const save = async () => {
    if (!t) return;
    const { error } = await supabase.from("email_templates").update({
      display_name: t.display_name, description: t.description, category: t.category,
      subject_ar: t.subject_ar, subject_en: t.subject_en, body_ar: t.body_ar, body_en: t.body_en,
      enabled: t.enabled, variables: vars as any,
    }).eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  };

  const remove = async () => {
    if (!t || t.is_system) return;
    if (!confirm("Delete this template?")) return;
    await supabase.from("email_templates").delete().eq("id", t.id);
    nav({ to: "/admin/emails" });
  };

  const insertVar = (field: "subject_ar"|"subject_en"|"body_ar"|"body_en", v: string) => {
    if (!t) return;
    setT({ ...t, [field]: (t[field] || "") + `{{${v}}}` });
  };

  if (!t) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const sampleVars: Record<string,string> = Object.fromEntries(vars.map(v => [v, `[${v}]`]));
  const previewSubj = interpolate(previewLocale === "ar" ? t.subject_ar : t.subject_en, sampleVars);
  const previewBody = interpolate(previewLocale === "ar" ? t.body_ar : t.body_en, sampleVars);
  const html = brandedWrap({ subject: previewSubj, bodyHtml: previewBody, locale: previewLocale });

  return (
    <div>
      <AdminPageHeader title={t.display_name} subtitle={`Key: ${t.key} · ${t.is_system ? "System template" : "Custom"}`}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/admin/emails"><ArrowLeft className="w-4 h-4 me-1"/>Back</Link></Button>
            {!t.is_system && <Button variant="outline" size="sm" onClick={remove}><Trash2 className="w-4 h-4 me-1"/>Delete</Button>}
            <Button size="sm" onClick={save}><Save className="w-4 h-4 me-1"/>Save</Button>
          </div>
        } />
      <div className="p-4 md:p-6 grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Content</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Display name</Label>
                <Input value={t.display_name} onChange={(e) => setT({...t, display_name: e.target.value})}/></div>
              <div className="space-y-1.5"><Label>Category</Label>
                <Input value={t.category} onChange={(e) => setT({...t, category: e.target.value})}/></div>
            </div>
            <div className="space-y-1.5"><Label>Description</Label>
              <Input value={t.description ?? ""} onChange={(e) => setT({...t, description: e.target.value})}/></div>

            <div className="flex items-center gap-2 text-xs">
              <Switch checked={t.enabled} onCheckedChange={(v) => setT({...t, enabled: v})}/>
              <span>Enabled</span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Variables (click to insert into subject/body)</Label>
              <div className="flex flex-wrap gap-1">
                {Array.from(new Set([...COMMON_VARS, ...vars])).map(v => (
                  <button key={v} type="button" className="text-[11px] font-mono px-2 py-0.5 rounded border hover:bg-muted"
                    onClick={() => insertVar("body_ar", v)} title="Insert into Body (AR). Use buttons in fields below for others.">
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>

            <Tabs defaultValue="ar">
              <TabsList><TabsTrigger value="ar">العربية</TabsTrigger><TabsTrigger value="en">English</TabsTrigger></TabsList>
              <TabsContent value="ar" className="space-y-2 mt-3" dir="rtl">
                <Label>الموضوع</Label>
                <Input value={t.subject_ar} onChange={(e) => setT({...t, subject_ar: e.target.value})} />
                <Label>المحتوى (HTML)</Label>
                <Textarea rows={12} value={t.body_ar} onChange={(e) => setT({...t, body_ar: e.target.value})} className="font-mono text-xs" />
              </TabsContent>
              <TabsContent value="en" className="space-y-2 mt-3">
                <Label>Subject</Label>
                <Input value={t.subject_en} onChange={(e) => setT({...t, subject_en: e.target.value})} />
                <Label>Body (HTML)</Label>
                <Textarea rows={12} value={t.body_en} onChange={(e) => setT({...t, body_en: e.target.value})} className="font-mono text-xs" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              Preview
              <div className="flex gap-1">
                <Button size="sm" variant={previewLocale==="ar"?"default":"outline"} onClick={() => setPreviewLocale("ar")}>AR</Button>
                <Button size="sm" variant={previewLocale==="en"?"default":"outline"} onClick={() => setPreviewLocale("en")}>EN</Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-2">Subject: <span className="font-medium text-foreground">{previewSubj}</span></div>
            <iframe title="preview" srcDoc={html} className="w-full h-[560px] border rounded-md bg-white"/>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
