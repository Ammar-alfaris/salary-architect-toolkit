import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { DataTable, type Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Eye } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({ component: UsersPage });

interface Row { id: string; full_name: string | null; email: string | null; created_at: string; org_name?: string; role?: string; }

function UsersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Row | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: orgs }] = await Promise.all([
      supabase.from("profiles").select("id,full_name,email,created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role,organization_id"),
      supabase.from("organizations").select("id,name"),
    ]);
    const orgMap = Object.fromEntries((orgs || []).map((o: any) => [o.id, o.name]));
    const roleMap: Record<string, { role: string; org: string }> = {};
    (roles || []).forEach((r: any) => { roleMap[r.user_id] = { role: r.role, org: orgMap[r.organization_id] || "—" }; });
    setRows((profiles || []).map((p: any) => ({ ...p, role: roleMap[p.id]?.role, org_name: roleMap[p.id]?.org })));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = roleFilter === "all" ? rows : rows.filter((r) => r.role === roleFilter);

  const exportCsv = (selected: Row[]) => {
    const list = selected.length ? selected : filtered;
    const csv = ["Name,Email,Org,Role,Created", ...list.map(r => `"${r.full_name || ""}","${r.email || ""}","${r.org_name || ""}","${r.role || ""}","${r.created_at}"`)].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "users.csv"; a.click();
    toast.success(`Exported ${list.length} users`);
  };

  const columns: Column<Row>[] = [
    { key: "full_name", header: "Name", sortable: true, cell: (r) => <span className="font-medium">{r.full_name || "—"}</span> },
    { key: "email", header: "Email", sortable: true, cell: (r) => <span className="font-mono text-xs">{r.email}</span> },
    { key: "org_name", header: "Organization", cell: (r) => r.org_name || "—" },
    { key: "role", header: "Role", cell: (r) => r.role ? <StatusBadge value={r.role} /> : "—" },
    { key: "created_at", header: "Joined", sortable: true, cell: (r) => <span className="text-xs text-muted-foreground tabular-nums">{new Date(r.created_at).toLocaleDateString()}</span> },
    { key: "actions", header: "", cell: (r) => <Button variant="ghost" size="icon" onClick={() => setActive(r)}><Eye className="w-4 h-4" /></Button> },
  ];

  return (
    <div>
      <AdminPageHeader title="User management" subtitle={`${rows.length} platform users`}
        actions={
          <>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="analyst">Analyst</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => exportCsv([])}><Download className="w-4 h-4 me-1" />Export</Button>
          </>
        } />
      <div className="p-4 md:p-6">
        <DataTable rows={filtered} columns={columns} loading={loading} searchable
          searchKeys={["full_name", "email", "org_name"]}
          bulkActions={(sel) => <Button variant="outline" size="sm" onClick={() => exportCsv(sel)}>Export selected</Button>} />
      </div>

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{active?.full_name || "User"}</SheetTitle>
            <SheetDescription className="font-mono text-xs">{active?.email}</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-3 text-sm">
            <Field label="Organization" value={active?.org_name || "—"} />
            <Field label="Role" value={active?.role || "—"} />
            <Field label="Joined" value={active ? new Date(active.created_at).toLocaleString() : "—"} />
            <Field label="User ID" value={<code className="text-xs">{active?.id}</code>} />
            <div className="pt-3 border-t space-y-2">
              <Button variant="outline" size="sm" className="w-full" disabled>Reset password (placeholder)</Button>
              <Button variant="outline" size="sm" className="w-full" disabled>Impersonate (placeholder)</Button>
              <Button variant="destructive" size="sm" className="w-full" disabled>Suspend user (placeholder)</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-end break-all">{value}</span>
    </div>
  );
}
