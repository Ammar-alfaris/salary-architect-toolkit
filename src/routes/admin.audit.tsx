import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { DataTable, type Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/admin/audit")({ component: AuditPage });

interface Log { id: string; actor_email: string | null; action: string; entity_type: string; entity_label: string | null; created_at: string; }

function AuditPage() {
  const [rows, setRows] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionF, setActionF] = useState("all");

  useEffect(() => {
    supabase.from("audit_logs").select("id,actor_email,action,entity_type,entity_label,created_at").order("created_at", { ascending: false }).limit(500).then(({ data }) => {
      setRows((data as any) || []); setLoading(false);
    });
  }, []);

  const filtered = actionF === "all" ? rows : rows.filter((r) => r.action === actionF);

  const columns: Column<Log>[] = [
    { key: "created_at", header: "When", sortable: true, cell: (r) => <span className="text-xs tabular-nums">{new Date(r.created_at).toLocaleString()}</span> },
    { key: "actor_email", header: "Actor", cell: (r) => <span className="font-mono text-xs">{r.actor_email || "system"}</span> },
    { key: "action", header: "Action", cell: (r) => <StatusBadge value={r.action} /> },
    { key: "entity_type", header: "Entity", cell: (r) => <span className="text-xs capitalize">{r.entity_type}</span> },
    { key: "entity_label", header: "Label", cell: (r) => r.entity_label || "—" },
  ];

  return (
    <div>
      <AdminPageHeader title="Audit logs" subtitle={`${rows.length} most recent platform actions`}
        actions={
          <Select value={actionF} onValueChange={setActionF}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {["create","update","delete","archive","bulk_update","bulk_delete","export","run_cycle"].map(a =>
                <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        } />
      <div className="p-4 md:p-6">
        <DataTable rows={filtered} columns={columns} loading={loading} searchable searchKeys={["actor_email","action","entity_type","entity_label"]} />
      </div>
    </div>
  );
}
