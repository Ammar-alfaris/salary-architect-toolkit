import { createFileRoute, Link } from "@tanstack/react-router";
import { fmtDate } from "@/lib/format";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { DataTable, type Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/tickets/")({ component: TicketsPage });

interface Ticket { id: string; subject: string; requester_name: string; requester_email: string; status: string; priority: string; created_at: string; }

function TicketsPage() {
  const [rows, setRows] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusF, setStatusF] = useState("all");
  const [pri, setPri] = useState("all");

  useEffect(() => {
    supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setRows((data as any) || []); setLoading(false);
    });
  }, []);

  const filtered = rows.filter((r) =>
    (statusF === "all" || r.status === statusF) && (pri === "all" || r.priority === pri)
  );

  const columns: Column<Ticket>[] = [
    { key: "subject", header: "Subject", sortable: true, cell: (r) => (
      <Link to="/admin/tickets/$id" params={{ id: r.id }} className="font-medium hover:underline">{r.subject}</Link>
    ) },
    { key: "requester_name", header: "Requester", cell: (r) => <div><div className="text-sm">{r.requester_name}</div><div className="text-xs text-muted-foreground">{r.requester_email}</div></div> },
    { key: "priority", header: "Priority", cell: (r) => <StatusBadge value={r.priority} /> },
    { key: "status", header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
    { key: "created_at", header: "Created", sortable: true, cell: (r) => <span className="text-xs tabular-nums">{fmtDate(r.created_at)}</span> },
    { key: "a", header: "", cell: (r) => <Button asChild variant="ghost" size="sm"><Link to="/admin/tickets/$id" params={{ id: r.id }}>Open</Link></Button> },
  ];

  return (
    <div>
      <AdminPageHeader title="Support tickets" subtitle={`${rows.length} tickets`}
        actions={
          <>
            <Select value={statusF} onValueChange={setStatusF}>
              <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="pending_customer">Pending customer</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={pri} onValueChange={setPri}>
              <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </>
        } />
      <div className="p-4 md:p-6">
        <DataTable rows={filtered} columns={columns} loading={loading} searchable searchKeys={["subject", "requester_name", "requester_email"]} />
      </div>
    </div>
  );
}
