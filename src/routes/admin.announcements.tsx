import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { DataTable, type Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin/announcements")({ component: AnnouncementsPage });

interface A { id: string; title: string; body: string; type: string; audience: string; start_at: string | null; end_at: string | null; is_active: boolean; created_at: string; }

function AnnouncementsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<A[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ title: "", body: "", type: "general", audience: "all", is_active: true });

  const load = async () => {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setRows((data as any) || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    const { error } = await supabase.from("announcements").insert({ ...draft, created_by: user?.id });
    if (error) return toast.error(error.message);
    toast.success("Announcement created"); setOpen(false);
    setDraft({ title: "", body: "", type: "general", audience: "all", is_active: true });
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("announcements").delete().eq("id", id);
    load();
  };
  const toggle = async (a: A) => {
    await supabase.from("announcements").update({ is_active: !a.is_active }).eq("id", a.id);
    load();
  };

  const columns: Column<A>[] = [
    { key: "title", header: "Title", sortable: true, cell: (r) => <span className="font-medium">{r.title}</span> },
    { key: "type", header: "Type", cell: (r) => <StatusBadge value={r.type} /> },
    { key: "audience", header: "Audience", cell: (r) => <span className="text-xs capitalize">{r.audience}</span> },
    { key: "is_active", header: "Active", cell: (r) => <Switch checked={r.is_active} onCheckedChange={() => toggle(r)} /> },
    { key: "created_at", header: "Created", cell: (r) => <span className="text-xs tabular-nums">{new Date(r.created_at).toLocaleDateString()}</span> },
    { key: "a", header: "", cell: (r) => <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button> },
  ];

  return (
    <div>
      <AdminPageHeader title="Announcements" subtitle="Platform-wide notices and product updates"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 me-1" />New announcement</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New announcement</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label className="text-xs">Title</Label><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
                <div><Label className="text-xs">Body</Label><Textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={4} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Type</Label>
                    <Select value={draft.type} onValueChange={(v) => setDraft({ ...draft, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["general","maintenance","feature","billing","warning"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Audience</Label>
                    <Select value={draft.audience} onValueChange={(v) => setDraft({ ...draft, audience: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["all","trial","paid","admins"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Start</Label><Input type="datetime-local" onChange={(e) => setDraft({ ...draft, start_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
                  <div><Label className="text-xs">End</Label><Input type="datetime-local" onChange={(e) => setDraft({ ...draft, end_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
                </div>
                <label className="flex items-center gap-2 text-sm"><Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />Active</label>
              </div>
              <DialogFooter><Button onClick={create}>Create</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        } />
      <div className="p-4 md:p-6">
        <DataTable rows={rows} columns={columns} loading={loading} searchable searchKeys={["title", "body"]} />
      </div>
    </div>
  );
}
