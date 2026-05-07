import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Mail } from "lucide-react";
import { toast } from "sonner";
import type { EmailTemplate } from "@/lib/email-templates";

export const Route = createFileRoute("/admin/emails/")({ component: EmailsAdmin });

function EmailsAdmin() {
  const nav = useNavigate();
  const [rows, setRows] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ key: "", display_name: "", description: "", category: "broadcast" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("email_templates").select("*").order("category").order("display_name");
    if (error) toast.error(error.message);
    setRows((data as any) || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!/^[a-z0-9_]+$/.test(form.key)) { toast.error("Key must be lowercase letters, numbers, underscore"); return; }
    const { error } = await supabase.from("email_templates").insert({
      key: form.key, display_name: form.display_name, description: form.description,
      category: form.category, is_system: false,
    });
    if (error) return toast.error(error.message);
    toast.success("Template created");
    setOpen(false); setForm({ key: "", display_name: "", description: "", category: "broadcast" });
    load();
  };

  const grouped = rows.reduce<Record<string, EmailTemplate[]>>((acc, r) => {
    (acc[r.category] = acc[r.category] || []).push(r); return acc;
  }, {});

  return (
    <div>
      <AdminPageHeader title="Email templates" subtitle="Customize subject and body in Arabic and English (RTL supported, brand logo centered)."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/admin/messages"><Mail className="w-4 h-4 me-1"/>Messages</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/admin/emails/send"><Mail className="w-4 h-4 me-1"/>Send email</Link></Button>
            <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 me-1"/>New template</Button>
          </div>
        } />
      <div className="p-4 md:p-6 space-y-6">
        {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!loading && rows.length === 0 && <div className="text-sm text-muted-foreground">No templates yet.</div>}
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{cat}</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((t) => (
                <Card key={t.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => nav({ to: "/admin/emails/$key", params: { key: t.key } })}>
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-start justify-between">
                      <div className="font-medium text-sm">{t.display_name}</div>
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground"/>
                    </div>
                    <div className="text-xs font-mono text-muted-foreground">{t.key}</div>
                    {t.description && <div className="text-xs text-muted-foreground line-clamp-2">{t.description}</div>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New email template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Key (lowercase, underscore)</Label>
              <Input value={form.key} onChange={(e) => setForm({...form, key: e.target.value.toLowerCase()})} placeholder="welcome_offer" /></div>
            <div className="space-y-1.5"><Label>Display name</Label>
              <Input value={form.display_name} onChange={(e) => setForm({...form, display_name: e.target.value})}/></div>
            <div className="space-y-1.5"><Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={2}/></div>
            <div className="space-y-1.5"><Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm({...form, category: e.target.value})}/></div>
          </div>
          <DialogFooter><Button onClick={create}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
