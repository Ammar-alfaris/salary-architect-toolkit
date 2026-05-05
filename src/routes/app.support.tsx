import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/admin/status-badge";
import { LifeBuoy, Send } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/support")({ component: SupportPage });

function SupportPage() {
  const { user } = useAuth();
  const { locale } = useI18n();
  const [tickets, setTickets] = useState<any[]>([]);
  const [form, setForm] = useState({ category: "general", subject: "", priority: "medium", description: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("support_tickets").select("*")
      .or(`created_by.eq.${user.id},requester_email.ilike.${user.email}`)
      .order("created_at", { ascending: false });
    setTickets(data || []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const submit = async () => {
    if (!user || !form.subject.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.from("support_tickets").insert({
      requester_name: user.user_metadata?.full_name || user.email,
      requester_email: user.email!,
      created_by: user.id,
      subject: form.subject,
      description: form.description,
      category: form.category,
      priority: form.priority,
      locale,
      status: "new",
    }).select().single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(locale === "ar" ? `تم فتح التذكرة ${data.ticket_number}` : `Ticket ${data.ticket_number} opened`);
    setForm({ category: "general", subject: "", priority: "medium", description: "" });
    // Trigger emails (best-effort, server route)
    try {
      await fetch("/api/public/email/send-template", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateKey: "ticket_received", to: user.email, locale,
          vars: { userName: user.user_metadata?.full_name || user.email, ticketNumber: data.ticket_number, subject: form.subject, status: "new" },
        }),
      });
      await fetch("/api/public/email/send-template", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateKey: "ticket_admin_alert", toAdmin: true, locale: "en",
          vars: { ticketNumber: data.ticket_number, subject: form.subject, userName: user.email, userEmail: user.email, priority: form.priority, category: form.category },
        }),
      });
    } catch {/* non-blocking */}
    load();
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-2">
        <LifeBuoy className="w-5 h-5 text-primary"/>
        <h1 className="text-xl font-semibold">{locale === "ar" ? "الدعم الفني" : "Support"}</h1>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">{locale === "ar" ? "تذكرة دعم جديدة" : "New support ticket"}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>{locale === "ar" ? "النوع" : "Category"}</Label>
              <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">{locale==="ar"?"مشكلة تقنية":"Technical issue"}</SelectItem>
                  <SelectItem value="billing">{locale==="ar"?"الفوترة":"Billing"}</SelectItem>
                  <SelectItem value="bug">{locale==="ar"?"خلل":"Bug"}</SelectItem>
                  <SelectItem value="feature">{locale==="ar"?"اقتراح ميزة":"Feature request"}</SelectItem>
                  <SelectItem value="general">{locale==="ar"?"استفسار عام":"General"}</SelectItem>
                </SelectContent>
              </Select></div>
            <div className="space-y-1.5"><Label>{locale === "ar" ? "الأولوية" : "Priority"}</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({...form, priority: v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {["low","medium","high","urgent"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select></div>
          </div>
          <div className="space-y-1.5"><Label>{locale === "ar" ? "الموضوع" : "Subject"}</Label>
            <Input value={form.subject} onChange={(e) => setForm({...form, subject: e.target.value})}/></div>
          <div className="space-y-1.5"><Label>{locale === "ar" ? "الوصف" : "Description"}</Label>
            <Textarea rows={5} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}/></div>
          <Button onClick={submit} disabled={busy || !form.subject.trim()}><Send className="w-4 h-4 me-1"/>{locale === "ar" ? "إرسال التذكرة" : "Submit ticket"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">{locale === "ar" ? "تذاكري" : "My tickets"}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {tickets.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">{locale==="ar"?"لا توجد تذاكر بعد":"No tickets yet"}</div>}
          {tickets.map(tk => (
            <Link key={tk.id} to="/app/support/$id" params={{ id: tk.id }} className="block border rounded-md p-3 hover:bg-muted/40">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-mono text-primary">{tk.ticket_number}</div>
                  <div className="font-medium text-sm truncate">{tk.subject}</div>
                </div>
                <StatusBadge value={tk.status}/>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
