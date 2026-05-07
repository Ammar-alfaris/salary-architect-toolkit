import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/admin/status-badge";
import { ArrowLeft, Send, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin/tickets/$id")({ component: TicketDetail });

function TicketDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [t, setT] = useState<any>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [draft, setDraft] = useState("");
  const [internal, setInternal] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true); setErr(null);
    const [tkRes, mmRes] = await Promise.all([
      supabase.from("support_tickets").select("*").eq("id", id).maybeSingle(),
      supabase.from("ticket_messages").select("*").eq("ticket_id", id).order("created_at"),
    ]);
    if (tkRes.error) setErr(tkRes.error.message);
    else if (!tkRes.data) setErr("Ticket not found or you don't have access.");
    setT(tkRes.data); setMsgs(mmRes.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const update = async (patch: any) => {
    await supabase.from("support_tickets").update(patch).eq("id", id);
    setT({ ...t, ...patch });
  };

  const send = async () => {
    if (!draft.trim()) return;
    const { error } = await supabase.from("ticket_messages").insert({
      ticket_id: id, sender_type: "agent", sender_id: user?.id, sender_name: user?.email,
      message: draft, is_internal: internal,
    });
    if (error) return toast.error(error.message);
    setDraft(""); load();
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (err || !t) return (
    <div className="p-6 space-y-3">
      <Button asChild variant="outline" size="sm"><Link to="/admin/tickets"><ArrowLeft className="w-4 h-4 me-1" />Back to tickets</Link></Button>
      <div className="text-sm text-destructive">{err || "Ticket not found."}</div>
    </div>
  );

  return (
    <div>
      <AdminPageHeader title={t.subject} subtitle={`${t.requester_name} · ${t.requester_email}`}
        actions={<Button asChild variant="outline" size="sm"><Link to="/admin/tickets"><ArrowLeft className="w-4 h-4 me-1" />Back</Link></Button>} />
      <div className="p-4 md:p-6 grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Conversation</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md border p-3 bg-muted/30 text-sm whitespace-pre-wrap">{t.description}</div>
              {msgs.map((m) => (
                <div key={m.id} className={`rounded-md border p-3 text-sm ${m.is_internal ? "bg-amber-500/5 border-amber-500/30" : ""}`}>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    {m.is_internal && <Lock className="w-3 h-3" />}
                    <span className="font-medium">{m.sender_name || m.sender_type}</span>
                    <span>· {new Date(m.created_at).toLocaleString()}</span>
                  </div>
                  <div className="whitespace-pre-wrap">{m.message}</div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-2">
              <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} placeholder="Reply or add internal note…" />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                  Internal note (not sent to customer)
                </label>
                <Button onClick={send} size="sm"><Send className="w-4 h-4 me-1" />Send</Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Status</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={t.status} onValueChange={(v) => update({ status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["new","open","in_progress","pending_customer","resolved","closed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={t.priority} onValueChange={(v) => update({ priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["low","medium","high","urgent"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">Current: <StatusBadge value={t.status} /></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
