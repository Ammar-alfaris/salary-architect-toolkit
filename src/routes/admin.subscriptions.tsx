import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { DataTable, type Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/subscriptions")({ component: SubsPage });

interface Sub {
  id: string; organization_id: string; plan_id: string | null; status: string;
  billing_cycle: string; amount: number; renewal_at: string | null;
  trial_end_at: string | null; payment_status: string; org_name?: string; plan_name?: string;
}

function SubsPage() {
  const [rows, setRows] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const load = async () => {
    const [{ data: subs }, { data: orgs }, { data: plans }] = await Promise.all([
      supabase.from("subscriptions").select("*").order("created_at", { ascending: false }),
      supabase.from("organizations").select("id,name"),
      supabase.from("plans").select("id,name"),
    ]);
    const oM = Object.fromEntries((orgs || []).map((o: any) => [o.id, o.name]));
    const pM = Object.fromEntries((plans || []).map((p: any) => [p.id, p.name]));
    setRows((subs || []).map((s: any) => ({ ...s, org_name: oM[s.organization_id], plan_name: pM[s.plan_id] || "—" })));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = statusFilter === "all" ? rows : rows.filter((r) => r.status === statusFilter);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("subscriptions").update({ status }).eq("id", id);
    toast.success(`Updated to ${status}`); load();
  };

  const columns: Column<Sub>[] = [
    { key: "org_name", header: "Organization", sortable: true, cell: (r) => <span className="font-medium">{r.org_name || "—"}</span> },
    { key: "plan_name", header: "Plan", cell: (r) => r.plan_name },
    { key: "status", header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
    { key: "billing_cycle", header: "Cycle", cell: (r) => <span className="text-xs capitalize">{r.billing_cycle}</span> },
    { key: "amount", header: "Amount", sortable: true, cell: (r) => <span className="tabular-nums">${r.amount}</span> },
    { key: "payment_status", header: "Payment", cell: (r) => <StatusBadge value={r.payment_status} /> },
    { key: "renewal_at", header: "Renewal", cell: (r) => r.renewal_at ? <span className="text-xs tabular-nums">{new Date(r.renewal_at).toLocaleDateString()}</span> : "—" },
    { key: "actions", header: "", cell: (r) => (
      <div className="flex gap-1">
        <Button variant="outline" size="sm" onClick={() => updateStatus(r.id, "active")}>Activate</Button>
        <Button variant="outline" size="sm" onClick={() => updateStatus(r.id, "cancelled")}>Cancel</Button>
      </div>
    ) },
  ];

  return (
    <div>
      <AdminPageHeader title="Subscriptions" subtitle={`${rows.length} total`}
        actions={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        } />
      <div className="p-4 md:p-6">
        <DataTable rows={filtered} columns={columns} loading={loading} searchable searchKeys={["org_name", "plan_name"]} />
      </div>
    </div>
  );
}
