import { createFileRoute, Link } from "@tanstack/react-router";
import { fmtDate } from "@/lib/format";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { DataTable, type Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

export const Route = createFileRoute("/admin/organizations")({ component: OrgsPage });

interface Org { id: string; name: string; default_currency: string; created_at: string; user_count?: number; plan?: string; status?: string; }

function OrgsPage() {
  const [rows, setRows] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: orgs }, { data: roles }, { data: subs }, { data: plans }] = await Promise.all([
        supabase.from("organizations").select("id,name,default_currency,created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("organization_id"),
        supabase.from("subscriptions").select("organization_id,plan_id,status"),
        supabase.from("plans").select("id,name"),
      ]);
      const counts: Record<string, number> = {};
      (roles || []).forEach((r: any) => { counts[r.organization_id] = (counts[r.organization_id] || 0) + 1; });
      const planMap = Object.fromEntries((plans || []).map((p: any) => [p.id, p.name]));
      const subMap: Record<string, any> = {};
      (subs || []).forEach((s: any) => { subMap[s.organization_id] = s; });
      setRows((orgs || []).map((o: any) => ({
        ...o, user_count: counts[o.id] || 0,
        plan: subMap[o.id] ? planMap[subMap[o.id].plan_id] || "—" : "—",
        status: subMap[o.id]?.status || "no_subscription",
      })));
      setLoading(false);
    })();
  }, []);

  const columns: Column<Org>[] = [
    { key: "name", header: "Organization", sortable: true, cell: (r) => <Link to="/admin/organizations/$id" params={{ id: r.id }} className="font-medium hover:underline">{r.name}</Link> },
    { key: "plan", header: "Plan", cell: (r) => r.plan },
    { key: "status", header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
    { key: "user_count", header: "Users", sortable: true, cell: (r) => <span className="tabular-nums">{r.user_count}</span> },
    { key: "default_currency", header: "Currency", cell: (r) => <span className="font-mono text-xs">{r.default_currency}</span> },
    { key: "created_at", header: "Created", sortable: true, cell: (r) => <span className="text-xs tabular-nums">{fmtDate(r.created_at)}</span> },
    { key: "a", header: "", cell: (r) => <Button asChild variant="ghost" size="icon"><Link to="/admin/organizations/$id" params={{ id: r.id }}><Eye className="w-4 h-4" /></Link></Button> },
  ];

  return (
    <div>
      <AdminPageHeader title="Organizations" subtitle={`${rows.length} accounts on the platform`} />
      <div className="p-4 md:p-6">
        <DataTable rows={rows} columns={columns} loading={loading} searchable searchKeys={["name", "plan"]} />
      </div>
    </div>
  );
}
