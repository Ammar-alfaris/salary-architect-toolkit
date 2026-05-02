import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { DataTable, type Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Copy, Archive } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin/plans")({ component: PlansPage });

const FEATURE_KEYS = [
  "salary_structures", "matrix", "bonus", "merit", "allowances",
  "registry", "reports", "ar_support", "api", "priority_support", "multi_admin",
] as const;

interface Plan {
  id: string; name: string; slug: string; description?: string;
  monthly_price: number; annual_price: number; currency: string; trial_days: number;
  max_users: number; max_employees: number; features: Record<string, boolean>;
  is_recommended: boolean; is_visible: boolean; status: string; sort_order: number;
}

function PlansPage() {
  const [rows, setRows] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [open, setOpen] = useState(false);
  const { organizationId } = useAuth();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("plans").select("*").order("sort_order");
    setRows((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const blank = (): Plan => ({
    id: "", name: "", slug: "", description: "",
    monthly_price: 0, annual_price: 0, currency: "USD", trial_days: 14,
    max_users: 5, max_employees: 50, features: {},
    is_recommended: false, is_visible: true, status: "active", sort_order: rows.length + 1,
  });

  const save = async () => {
    if (!editing) return;
    const payload = { ...editing };
    if (!payload.slug) payload.slug = payload.name.toLowerCase().replace(/\s+/g, "-");
    const { id, ...rest } = payload;
    if (id) {
      const { error } = await supabase.from("plans").update(rest).eq("id", id);
      if (error) return toast.error(error.message);
      logAudit({ organizationId: organizationId || "", action: "update", entityType: "organization", entityId: id, entityLabel: payload.name, after: payload as any });
    } else {
      const { error } = await supabase.from("plans").insert(rest);
      if (error) return toast.error(error.message);
    }
    toast.success("Plan saved"); setOpen(false); setEditing(null); load();
  };

  const archive = async (p: Plan) => {
    await supabase.from("plans").update({ status: "archived", is_visible: false }).eq("id", p.id);
    toast.success("Archived"); load();
  };

  const duplicate = async (p: Plan) => {
    const { id, ...rest } = p as any;
    await supabase.from("plans").insert({ ...rest, name: p.name + " (copy)", slug: p.slug + "-copy-" + Date.now(), sort_order: rows.length + 1 });
    toast.success("Duplicated"); load();
  };

  const columns: Column<Plan>[] = [
    { key: "sort_order", header: "#", sortable: true, width: "60px", cell: (r) => <span className="tabular-nums text-xs text-muted-foreground">{r.sort_order}</span> },
    { key: "name", header: "Plan", sortable: true, cell: (r) => (
      <div><div className="font-medium">{r.name} {r.is_recommended && <span className="ms-1 text-[10px] px-1.5 py-0.5 bg-primary/15 text-primary rounded">RECOMMENDED</span>}</div>
        <div className="text-xs text-muted-foreground">{r.slug}</div></div>
    ) },
    { key: "monthly_price", header: "Monthly", sortable: true, cell: (r) => <span className="tabular-nums">{r.currency} {r.monthly_price}</span> },
    { key: "annual_price", header: "Annual", cell: (r) => <span className="tabular-nums">{r.currency} {r.annual_price}</span> },
    { key: "max_users", header: "Users", cell: (r) => r.max_users },
    { key: "max_employees", header: "Employees", cell: (r) => r.max_employees },
    { key: "trial_days", header: "Trial", cell: (r) => `${r.trial_days}d` },
    { key: "status", header: "Status", cell: (r) => <StatusBadge value={r.is_visible ? r.status : "hidden"} /> },
    { key: "actions", header: "", cell: (r) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => duplicate(r)}><Copy className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => archive(r)}><Archive className="w-4 h-4" /></Button>
      </div>
    ) },
  ];

  return (
    <div>
      <AdminPageHeader title="Packages & plans" subtitle={`${rows.length} plans configured`}
        actions={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setEditing(blank())}><Plus className="w-4 h-4 me-1" />Add plan</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing?.id ? "Edit plan" : "New plan"}</DialogTitle></DialogHeader>
              {editing && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Name"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
                  <Field label="Slug"><Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="auto from name" /></Field>
                  <Field label="Description" full><Textarea value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} /></Field>
                  <Field label="Currency"><Input value={editing.currency} onChange={(e) => setEditing({ ...editing, currency: e.target.value })} /></Field>
                  <Field label="Trial days"><Input type="number" value={editing.trial_days} onChange={(e) => setEditing({ ...editing, trial_days: +e.target.value })} /></Field>
                  <Field label="Monthly price"><Input type="number" value={editing.monthly_price} onChange={(e) => setEditing({ ...editing, monthly_price: +e.target.value })} /></Field>
                  <Field label="Annual price"><Input type="number" value={editing.annual_price} onChange={(e) => setEditing({ ...editing, annual_price: +e.target.value })} /></Field>
                  <Field label="Max users"><Input type="number" value={editing.max_users} onChange={(e) => setEditing({ ...editing, max_users: +e.target.value })} /></Field>
                  <Field label="Max employees"><Input type="number" value={editing.max_employees} onChange={(e) => setEditing({ ...editing, max_employees: +e.target.value })} /></Field>
                  <Field label="Sort order"><Input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: +e.target.value })} /></Field>
                  <div className="col-span-2 grid grid-cols-2 gap-2 pt-2 border-t">
                    <label className="flex items-center gap-2 text-sm"><Switch checked={editing.is_visible} onCheckedChange={(v) => setEditing({ ...editing, is_visible: v })} />Visible</label>
                    <label className="flex items-center gap-2 text-sm"><Switch checked={editing.is_recommended} onCheckedChange={(v) => setEditing({ ...editing, is_recommended: v })} />Recommended</label>
                  </div>
                  <div className="col-span-2 pt-2 border-t">
                    <Label className="text-xs uppercase text-muted-foreground">Feature toggles</Label>
                    <div className="grid grid-cols-2 gap-1.5 mt-2">
                      {FEATURE_KEYS.map((k) => (
                        <label key={k} className="flex items-center gap-2 text-sm">
                          <Switch checked={!!editing.features?.[k]}
                            onCheckedChange={(v) => setEditing({ ...editing, features: { ...editing.features, [k]: v } })} />
                          <span className="capitalize">{k.replace(/_/g, " ")}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter><Button onClick={save}>Save plan</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        } />
      <div className="p-4 md:p-6">
        <DataTable rows={rows} columns={columns} loading={loading} searchable searchKeys={["name", "slug"]} />
      </div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={full ? "col-span-2 space-y-1.5" : "space-y-1.5"}><Label className="text-xs">{label}</Label>{children}</div>;
}
