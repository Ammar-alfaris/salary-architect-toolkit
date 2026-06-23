import { createFileRoute, Link } from "@tanstack/react-router";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/status-badge";
import { ArrowLeft } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/organizations/$id")({ component: OrgDetail });

function OrgDetail() {
  const { id } = Route.useParams();
  const [org, setOrg] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [sub, setSub] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: o }, { data: roles }, { data: s }, { data: tk }] = await Promise.all([
        supabase.from("organizations").select("*").eq("id", id).maybeSingle(),
        supabase.from("user_roles").select("user_id,role").eq("organization_id", id),
        supabase.from("subscriptions").select("*,plans(name,monthly_price,currency)").eq("organization_id", id).maybeSingle(),
        supabase.from("support_tickets").select("id,subject,status,priority,created_at").eq("organization_id", id).limit(10),
      ]);
      setOrg(o); setSub(s); setTickets(tk || []);
      if (roles?.length) {
        const ids = roles.map((r: any) => r.user_id);
        const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);
        setUsers((profs || []).map((p: any) => ({ ...p, role: roles.find((r: any) => r.user_id === p.id)?.role })));
      }
    })();
  }, [id]);

  if (!org) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div>
      <AdminPageHeader title={org.name} subtitle="Organization details and account health"
        actions={<Button asChild variant="outline" size="sm"><Link to="/admin/organizations"><ArrowLeft className="w-4 h-4 me-1" />Back</Link></Button>} />
      <div className="p-4 md:p-6 grid lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Profile</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Name" value={org.name} />
            <Row label="Currency" value={<span className="font-mono">{org.default_currency}</span>} />
            <Row label="Locale" value={org.locale} />
            <Row label="Created" value={fmtDateTime(org.created_at)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Subscription</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {sub ? (
              <>
                <Row label="Plan" value={sub.plans?.name || "—"} />
                <Row label="Status" value={<StatusBadge value={sub.status} />} />
                <Row label="Cycle" value={sub.billing_cycle} />
                <Row label="Amount" value={`${sub.plans?.currency || ""} ${sub.amount}`} />
                <Row label="Renewal" value={sub.renewal_at ? <>{fmtDate(sub.renewal_at)}</> : "—"} />
              </>
            ) : <p className="text-muted-foreground text-xs">No active subscription</p>}
            <div className="pt-2 flex gap-2">
              <Button size="sm" variant="outline" disabled>Change plan</Button>
              <Button size="sm" variant="outline" disabled>Extend trial</Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Internal notes</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Add internal note (placeholder)…" />
            <Button size="sm" className="mt-2" onClick={() => toast.success("Note saved (local only)")}>Save note</Button>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Members ({users.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {users.map((u) => (
                <li key={u.id} className="px-4 py-2 flex items-center justify-between text-sm">
                  <div><div className="font-medium">{u.full_name}</div><div className="text-xs text-muted-foreground">{u.email}</div></div>
                  <StatusBadge value={u.role} />
                </li>
              ))}
              {users.length === 0 && <li className="px-4 py-6 text-center text-xs text-muted-foreground">No members</li>}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Recent tickets</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {tickets.map((t) => (
                <li key={t.id} className="px-4 py-2 text-sm flex items-center justify-between">
                  <div className="truncate me-2">{t.subject}</div>
                  <StatusBadge value={t.status} />
                </li>
              ))}
              {tickets.length === 0 && <li className="px-4 py-6 text-center text-xs text-muted-foreground">No tickets</li>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}
