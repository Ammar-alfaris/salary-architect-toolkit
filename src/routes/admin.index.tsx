import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { KpiCard } from "@/components/admin/kpi-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users, Building2, CreditCard, Sparkles, DollarSign, LifeBuoy, Inbox, FileText, Plus, Megaphone, ShieldAlert,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip,
} from "recharts";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#10b981", "#f59e0b", "#ef4444"];

function Dashboard() {
  const [k, setK] = useState({
    users: 0, orgs: 0, activeSubs: 0, trials: 0,
    mrr: 0, revenueMonth: 0, revenueYear: 0, paymentsMonth: 0,
    openTickets: 0, unreadMsgs: 0, posts: 0,
  });
  const [signups, setSignups] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [subStatuses, setSubStatuses] = useState<any[]>([]);
  const [planMix, setPlanMix] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
      const startOfYear = new Date(); startOfYear.setMonth(0, 1); startOfYear.setHours(0, 0, 0, 0);

      const [
        { count: users }, { count: orgs },
        { data: subs }, { count: openTickets }, { count: unreadMsgs },
        { count: posts }, { data: recent }, { data: tk }, { data: msg }, { data: plans },
        { data: paidOrders },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("organizations").select("*", { count: "exact", head: true }),
        supabase.from("subscriptions").select("status, amount, plan_id, billing_cycle, payment_status"),
        supabase.from("support_tickets").select("*", { count: "exact", head: true }).in("status", ["new", "open", "in_progress"]),
        supabase.from("contact_messages").select("*", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("blog_posts").select("*", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("profiles").select("id,full_name,email,created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("support_tickets").select("id,subject,priority,status,created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("contact_messages").select("id,name,subject,status,created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("plans").select("id,name"),
        supabase.from("orders").select("paid_amount, amount, currency, paid_at, created_at, plan_id, status")
          .eq("status", "paid")
          .gte("paid_at", startOfYear.toISOString()),
      ]);

      const subList = subs || [];
      // Revenue-recognised subs: active OR trial whose payment cleared.
      const recognised = subList.filter((s: any) =>
        s.status === "active" ||
        ((s.status === "trial" || s.status === "trial_ending") && s.payment_status === "paid"),
      );
      // MRR: monthly amount + annual/12, summed across recognised subs.
      const mrr = recognised.reduce((acc, s: any) => {
        const amt = Number(s.amount) || 0;
        return acc + (s.billing_cycle === "annual" ? amt / 12 : amt);
      }, 0);
      const trial = subList.filter((s: any) => s.status === "trial" || s.status === "trial_ending");

      const orders = paidOrders || [];
      const revenueYear = orders.reduce((a, o: any) => a + Number(o.paid_amount ?? o.amount ?? 0), 0);
      const monthOrders = orders.filter((o: any) =>
        new Date(o.paid_at ?? o.created_at).getTime() >= startOfMonth.getTime(),
      );
      const revenueMonth = monthOrders.reduce((a, o: any) => a + Number(o.paid_amount ?? o.amount ?? 0), 0);

      setK({
        users: users ?? 0, orgs: orgs ?? 0,
        activeSubs: recognised.length, trials: trial.length,
        mrr: Math.round(mrr),
        revenueMonth: Math.round(revenueMonth),
        revenueYear: Math.round(revenueYear),
        paymentsMonth: monthOrders.length,
        openTickets: openTickets ?? 0, unreadMsgs: unreadMsgs ?? 0, posts: posts ?? 0,
      });

      const counts: Record<string, number> = {};
      subList.forEach((s: any) => { counts[s.status] = (counts[s.status] || 0) + 1; });
      setSubStatuses(Object.entries(counts).map(([name, value]) => ({ name, value })));

      const planCounts: Record<string, number> = {};
      subList.forEach((s: any) => {
        const name = (plans || []).find((p) => p.id === s.plan_id)?.name || "Unassigned";
        planCounts[name] = (planCounts[name] || 0) + 1;
      });
      setPlanMix(Object.entries(planCounts).map(([name, count]) => ({ name, count })));

      setSignups(recent || []); setTickets(tk || []); setMessages(msg || []);
    })();
  }, []);

  return (
    <div>
      <AdminPageHeader title="Platform overview" subtitle="Operational snapshot of the entire SaaS platform"
        actions={
          <>
            <Button asChild variant="outline" size="sm"><Link to="/admin/plans"><Plus className="w-4 h-4 me-1" />Add plan</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/admin/blog"><FileText className="w-4 h-4 me-1" />New post</Link></Button>
            <Button asChild size="sm"><Link to="/admin/announcements"><Megaphone className="w-4 h-4 me-1" />Announce</Link></Button>
          </>
        } />
      <div className="p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Total users" value={k.users} icon={Users} />
          <KpiCard label="Organizations" value={k.orgs} icon={Building2} />
          <KpiCard label="Paid subscriptions" value={k.activeSubs} icon={CreditCard} accent="success" />
          <KpiCard label="Trials" value={k.trials} icon={Sparkles} accent="info" />
          <KpiCard label="MRR" value={`SAR ${k.mrr.toLocaleString()}`} icon={DollarSign} accent="success" hint="Monthly recurring (active + paid trials)" />
          <KpiCard label="Revenue this month" value={`SAR ${k.revenueMonth.toLocaleString()}`} icon={DollarSign} accent="success" hint={`${k.paymentsMonth} successful payments`} />
          <KpiCard label="Revenue YTD" value={`SAR ${k.revenueYear.toLocaleString()}`} icon={DollarSign} accent="info" />
          <KpiCard label="Open tickets" value={k.openTickets} icon={LifeBuoy} accent="warning" />
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Subscription status</CardTitle></CardHeader>
            <CardContent className="h-56">
              {subStatuses.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={subStatuses} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
                      {subStatuses.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Accounts by plan</CardTitle></CardHeader>
            <CardContent className="h-56">
              {planMix.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={planMix}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <ListCard title="Recent signups" empty="No new users" items={signups.map((u) => ({
            id: u.id, primary: u.full_name || u.email, secondary: new Date(u.created_at).toLocaleString(),
          }))} />
          <ListCard title="Latest tickets" empty="No tickets" items={tickets.map((t) => ({
            id: t.id, primary: t.subject, secondary: new Date(t.created_at).toLocaleString(), badge: t.status,
          }))} />
          <ListCard title="Recent messages" empty="Inbox empty" items={messages.map((m) => ({
            id: m.id, primary: m.subject || m.name, secondary: m.name, badge: m.status,
          }))} />
        </div>
      </div>
    </div>
  );
}

function Empty() {
  return <div className="h-full flex items-center justify-center text-xs text-muted-foreground"><ShieldAlert className="w-4 h-4 me-1.5" />No data yet</div>;
}

function ListCard({ title, items, empty }: { title: string; items: { id: string; primary: string; secondary?: string; badge?: string }[]; empty: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">{empty}</div>
        ) : (
          <ul className="divide-y">
            {items.map((it) => (
              <li key={it.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{it.primary}</div>
                  {it.secondary && <div className="text-xs text-muted-foreground truncate">{it.secondary}</div>}
                </div>
                {it.badge && <StatusBadge value={it.badge} />}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
