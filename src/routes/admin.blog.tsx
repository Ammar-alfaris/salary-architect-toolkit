import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { DataTable, type Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/blog")({ component: BlogList });

interface Post { id: string; title: string; slug: string; status: string; publish_at: string | null; updated_at: string; is_featured: boolean; }

function BlogList() {
  const [rows, setRows] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  const load = async () => {
    const { data } = await supabase.from("blog_posts").select("id,title,slug,status,publish_at,updated_at,is_featured").order("updated_at", { ascending: false });
    setRows((data as any) || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    const slug = "post-" + Date.now();
    const { data, error } = await supabase.from("blog_posts").insert({ title: "Untitled", slug, status: "draft" }).select("id").single();
    if (error) return toast.error(error.message);
    window.location.href = `/admin/blog/${data!.id}`;
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    await supabase.from("blog_posts").delete().eq("id", id);
    toast.success("Deleted"); load();
  };

  const filtered = tab === "all" ? rows : rows.filter((r) => r.status === tab);

  const columns: Column<Post>[] = [
    { key: "title", header: "Title", sortable: true, cell: (r) => (
      <Link to="/admin/blog/$id" params={{ id: r.id }} className="font-medium hover:underline">
        {r.title} {r.is_featured && <span className="ms-1 text-[10px] px-1.5 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 rounded">FEATURED</span>}
      </Link>
    ) },
    { key: "slug", header: "Slug", cell: (r) => <code className="text-xs">{r.slug}</code> },
    { key: "status", header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
    { key: "publish_at", header: "Publish", cell: (r) => r.publish_at ? <span className="text-xs tabular-nums">{new Date(r.publish_at).toLocaleString()}</span> : "—" },
    { key: "updated_at", header: "Updated", sortable: true, cell: (r) => <span className="text-xs tabular-nums">{new Date(r.updated_at).toLocaleDateString()}</span> },
    { key: "a", header: "", cell: (r) => (
      <div className="flex gap-1">
        <Button asChild variant="ghost" size="icon"><Link to="/admin/blog/$id" params={{ id: r.id }}><Pencil className="w-4 h-4" /></Link></Button>
        <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
      </div>
    ) },
  ];

  return (
    <div>
      <AdminPageHeader title="Blog CMS" subtitle="Author, schedule, and publish content"
        actions={<Button size="sm" onClick={create}><Plus className="w-4 h-4 me-1" />New post</Button>} />
      <div className="p-4 md:p-6 space-y-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Drafts</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
          </TabsList>
        </Tabs>
        <DataTable rows={filtered} columns={columns} loading={loading} searchable searchKeys={["title", "slug"]} />
      </div>
    </div>
  );
}
