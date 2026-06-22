import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { DataTable, type Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { KpiCard } from "@/components/admin/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { CreditCard, DollarSign, Sparkles, XCircle, RefreshCcw } from "lucide-react";

export const Route = createFileRoute("/admin/subscriptions")({ component: SubsPage });

interface Sub {
  id: string; organization_id: string; plan_id: string | null; status: string;
  billing_cycle: string; amount: number; renewal_at: string | null;
  trial_end_at: string | null; trial_start_at: string | null;
  payment_status: string; created_at: string; environment?: string;
  org_name?: string; plan_name?: string; currency?: string;
  last_paid_at?: string | null; last_paid_amount?: number | null;
  card_brand?: string | null; card_last4?: string | null;
}

function SubsPage() {
  const { locale } = useI18n();
  const [rows, setRows] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [cycleFilter, setCycleFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const [{ data: subs }, { data: orgs }, { data: plans }, { data: orders }] = await Promise.all([
      supabase.from("subscriptions").select("*").order("created_at", { ascending: false }),
      supabase.from("organizations").select("id,name"),
      supabase.from("plans").select("id,name,currency"),
      supabase.from("orders").select("subscription_id, paid_at, paid_amount, amount, paylink_card_brand, paylink_card_last4, status")
        .eq("status", "paid").order("paid_at", { ascending: false }),
    ]);
    const oM = Object.fromEntries((orgs || []).map((o: any) => [o.id, o.name]));
    const pM: Record<string, { name: string; currency: string }> = Object.fromEntries(
      (plans || []).map((p: any) => [p.id, { name: p.name, currency: p.currency }]),
    );
    const lastPaidBySub: Record<string, any> = {};
    (orders || []).forEach((o: any) => {
      if (!o.subscription_id) return;
      if (!lastPaidBySub[o.subscription_id]) lastPaidBySub[o.subscription_id] = o;
    });
    setRows((subs || []).map((s: any) => {
      const lp = lastPaidBySub[s.id];
      return {
        ...s,
        org_name: oM[s.organization_id],
        plan_name: pM[s.plan_id]?.name || "—",
        currency: pM[s.plan_id]?.currency || "SAR",
        last_paid_at: lp?.paid_at ?? null,
        last_paid_amount: lp ? Number(lp.paid_amount ?? lp.amount ?? 0) : null,
        card_brand: lp?.paylink_card_brand ?? null,
        card_last4: lp?.paylink_card_last4 ?? null,
      };
    }));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (cycleFilter !== "all" && r.billing_cycle !== cycleFilter) return false;
    return true;
  });

  // Summary metrics computed from the loaded data set.
  const summary = (() => {
    const active = rows.filter((r) => r.status === "active");
    const trial = rows.filter((r) => r.status === "trial" || r.status === "trial_ending");
    const canceled = rows.filter((r) => r.status === "canceled" || r.status === "cancelled");
    const recognised = rows.filter((r) =>
      r.status === "active" ||
      ((r.status === "trial" || r.status === "trial_ending") && r.payment_status === "paid"),
    );
    const mrr = recognised.reduce((a, r) => a + (r.billing_cycle === "annual" ? Number(r.amount) / 12 : Number(r.amount)), 0);
    const arr = mrr * 12;
    return {
      total: rows.length,
      active: active.length,
      trial: trial.length,
      canceled: canceled.length,
      mrr: Math.round(mrr),
      arr: Math.round(arr),
    };
  })();

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("subscriptions").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Updated to ${status}`); load();
  };

  const columns: Column<Sub>[] = [
    { key: "org_name", header: "Organization", sortable: true, cell: (r) => (
      <Link to="/admin/organizations/$id" params={{ id: r.organization_id }} className="font-medium hover:underline">
        {r.org_name || "—"}
      </Link>
    ) },
    { key: "plan_name", header: "Plan", cell: (r) => r.plan_name },
    { key: "status", header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
    { key: "billing_cycle", header: "Cycle", cell: (r) => <span className="text-xs capitalize">{r.billing_cycle}</span> },
    { key: "amount", header: "Amount", sortable: true, cell: (r) => <span className="tabular-nums" dir="ltr">{r.currency} {Number(r.amount).toFixed(2)}</span> },
    { key: "payment_status", header: "Payment", cell: (r) => <StatusBadge value={r.payment_status} /> },
    { key: "last_paid_at", header: "Last paid", cell: (r) => r.last_paid_at ? (
      <span className="text-xs tabular-nums" dir="ltr" title={`${r.currency} ${r.last_paid_amount?.toFixed(2)}`}>
        {fmtDate(r.last_paid_at, locale)}
      </span>
    ) : <span className="text-xs text-muted-foreground">—</span> },
    { key: "renewal_at", header: "Renewal / Trial end", cell: (r) => {
      const d = r.renewal_at || r.trial_end_at;
      return d ? <span className="text-xs tabular-nums" dir="ltr">{fmtDate(d, locale)}</span> : <span className="text-xs text-muted-foreground">—</span>;
    } },
    { key: "card", header: "Card", cell: (r) => r.card_last4 ? (
      <span className="text-xs font-mono" dir="ltr">{(r.card_brand || "•").toUpperCase()} •••• {r.card_last4}</span>
    ) : <span className="text-xs text-muted-foreground">—</span> },
    { key: "environment", header: "Env", cell: (r) => (
      <Badge variant={r.environment === "live" ? "default" : "outline"} className="text-[10px] uppercase">
        {r.environment || "—"}
      </Badge>
    ) },
    { key: "actions", header: "", cell: (r) => (
      <div className="flex gap-1">
        {r.status !== "active" && (
          <Button variant="outline" size="sm" onClick={() => updateStatus(r.id, "active")} title="Mark as active">
            <RefreshCcw className="w-3 h-3" />
          </Button>
        )}
        {r.status !== "canceled" && r.status !== "cancelled" && (
          <Button variant="outline" size="sm" onClick={() => updateStatus(r.id, "canceled")} title="Cancel">
            <XCircle className="w-3 h-3" />
          </Button>
        )}
      </div>
    ) },
  ];

  return (
    <div>
      <AdminPageHeader title="Subscriptions" subtitle={`${rows.length} subscriptions · ${summary.active} active · ${summary.trial} on trial`}
        actions={
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="trial_ending">Trial ending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cycleFilter} onValueChange={setCycleFilter}>
              <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cycles</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        } />
      <div className="p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <KpiCard label="Active" value={summary.active} icon={CreditCard} accent="success" />
          <KpiCard label="On trial" value={summary.trial} icon={Sparkles} accent="info" />
          <KpiCard label="Canceled" value={summary.canceled} icon={XCircle} accent="warning" />
          <KpiCard label="Total" value={summary.total} icon={CreditCard} />
          <KpiCard label="MRR" value={`SAR ${summary.mrr.toLocaleString()}`} icon={DollarSign} accent="success" />
          <KpiCard label="ARR" value={`SAR ${summary.arr.toLocaleString()}`} icon={DollarSign} accent="info" />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-sm">All subscriptions</CardTitle></CardHeader>
          <CardContent>
            <DataTable rows={filtered} columns={columns} loading={loading} searchable searchKeys={["org_name", "plan_name"]} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
