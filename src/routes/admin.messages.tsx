import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { DataTable, type Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Mail, ShieldAlert, LifeBuoy, CheckCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/messages")({ component: MessagesPage });

interface Msg { id: string; name: string; email: string; subject: string | null; message: string; status: string; priority: string; created_at: string; source_form: string | null; internal_notes: string | null; }

function MessagesPage() {
  const [rows, setRows] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Msg | null>(null);

  const load = async () => {
    const { data } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
    setRows((data as any) || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    await supabase.from("contact_messages").update({ status }).eq("id", id);
    setActive((a) => a && a.id === id ? { ...a, status } : a);
    toast.success(status); load();
  };

  const convert = async (m: Msg) => {
    const { error } = await supabase.from("support_tickets").insert({
      requester_name: m.name, requester_email: m.email,
      subject: m.subject || "Converted from message",
      description: m.message, status: "new", priority: "medium",
    });
    if (error) return toast.error(error.message);
    await setStatus(m.id, "in_progress");
    toast.success("Converted to ticket");
  };

  const saveNotes = async (notes: string) => {
    if (!active) return;
    await supabase.from("contact_messages").update({ internal_notes: notes }).eq("id", active.id);
    toast.success("Notes saved");
  };

  const columns: Column<Msg>[] = [
    { key: "created_at", header: "Received", sortable: true, cell: (r) => <span className="text-xs tabular-nums">{new Date(r.created_at).toLocaleString()}</span> },
    { key: "name", header: "From", cell: (r) => <div><div className="font-medium text-sm">{r.name}</div><div className="text-xs text-muted-foreground">{r.email}</div></div> },
    { key: "subject", header: "Subject", cell: (r) => <span className="text-sm">{r.subject || "(no subject)"}</span> },
    { key: "source_form", header: "Source", cell: (r) => <span className="text-xs">{r.source_form || "—"}</span> },
    { key: "status", header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
    { key: "a", header: "", cell: (r) => <Button variant="ghost" size="sm" onClick={() => setActive(r)}>Open</Button> },
  ];

  return (
    <div>
      <AdminPageHeader title="Contact messages" subtitle={`${rows.length} total · ${rows.filter((r) => r.status === "new").length} unread`} />
      <div className="p-4 md:p-6">
        <DataTable rows={rows} columns={columns} loading={loading} searchable searchKeys={["name", "email", "subject"]} />
      </div>

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col">
          {active && (
            <>
              <SheetHeader>
                <SheetTitle>{active.subject || "Message"}</SheetTitle>
                <SheetDescription>{active.name} · {active.email}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 flex-1 overflow-y-auto space-y-4">
                <div className="rounded-md border p-3 text-sm whitespace-pre-wrap">{active.message}</div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground mb-1">Internal notes</div>
                  <Textarea defaultValue={active.internal_notes || ""} rows={4}
                    onBlur={(e) => saveNotes(e.target.value)} placeholder="Add note (auto-saved on blur)…" />
                </div>
              </div>
              <div className="border-t pt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setStatus(active.id, "read")}><Mail className="w-4 h-4 me-1" />Mark read</Button>
                <Button size="sm" variant="outline" onClick={() => setStatus(active.id, "replied")}><CheckCheck className="w-4 h-4 me-1" />Replied</Button>
                <Button size="sm" onClick={() => convert(active)}><LifeBuoy className="w-4 h-4 me-1" />→ Ticket</Button>
                <Button size="sm" variant="destructive" onClick={() => setStatus(active.id, "spam")}><ShieldAlert className="w-4 h-4 me-1" />Spam</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
