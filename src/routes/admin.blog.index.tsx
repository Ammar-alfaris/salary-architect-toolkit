import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { DataTable, type Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Upload, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/blog/")({ component: BlogList });

interface Post { id: string; title: string; slug: string; status: string; publish_at: string | null; updated_at: string; is_featured: boolean; }

const CSV_HEADERS = [
  "title", "slug", "excerpt", "content", "status", "publish_at",
  "is_featured", "seo_title", "seo_description", "featured_image_url",
  "featured_image_alt", "tags",
];

function BlogList() {
  const [rows, setRows] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase.from("blog_posts").select("id,title,slug,status,publish_at,updated_at,is_featured").order("updated_at", { ascending: false });
    setRows((data as any) || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const navigate = useNavigate();
  const create = async () => {
    const slug = "post-" + Date.now();
    const { data, error } = await supabase.from("blog_posts").insert({ title: "Untitled", slug, status: "draft" }).select("id").single();
    if (error) return toast.error(error.message);
    navigate({ to: "/admin/blog/$id", params: { id: data!.id } });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    await supabase.from("blog_posts").delete().eq("id", id);
    toast.success("Deleted"); load();
  };

  const downloadTemplate = () => {
    const sample = [{
      title: "How to design a salary structure",
      slug: "how-to-design-salary-structure",
      excerpt: "A practical guide to building grades, midpoints and ranges.",
      content: "## Introduction\n\nWrite **markdown** here. You can use lists, tables, code blocks, and more.\n\n### Step 1\n\n- Bullet one\n- Bullet two",
      status: "draft",
      publish_at: "",
      is_featured: "false",
      seo_title: "Salary structure guide",
      seo_description: "Learn how to design competitive salary structures.",
      featured_image_url: "",
      featured_image_alt: "",
      tags: "compensation,salary,hr",
    }];
    const csv = Papa.unparse({ fields: CSV_HEADERS, data: sample });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "blog-posts-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (res) => {
        try {
          // Pre-fetch existing slugs
          const { data: existing } = await supabase.from("blog_posts").select("slug");
          const existingSlugs = new Set((existing || []).map((r: any) => r.slug));

          let inserted = 0, skipped = 0, invalid = 0;
          const toInsert: any[] = [];
          for (const r of res.data) {
            if (!r.title || !r.slug) { invalid++; continue; }
            if (existingSlugs.has(r.slug)) { skipped++; continue; }
            existingSlugs.add(r.slug);
            toInsert.push({
              title: String(r.title).trim(),
              slug: String(r.slug).trim(),
              excerpt: r.excerpt || null,
              content: r.content || null,
              status: r.status || "draft",
              publish_at: r.publish_at ? new Date(r.publish_at).toISOString() : null,
              is_featured: String(r.is_featured).toLowerCase() === "true",
              seo_title: r.seo_title || null,
              seo_description: r.seo_description || null,
              featured_image_url: r.featured_image_url || null,
              featured_image_alt: r.featured_image_alt || null,
              tags: r.tags ? String(r.tags).split(",").map((t: string) => t.trim()).filter(Boolean) : [],
            });
          }
          if (toInsert.length > 0) {
            const { data: ins, error } = await supabase.from("blog_posts").insert(toInsert).select("id");
            if (error) throw error;
            inserted = ins?.length ?? toInsert.length;
          }
          toast.success(`Imported ${inserted}. Skipped ${skipped} duplicate slug(s). ${invalid} invalid row(s).`);
          load();
        } catch (err: any) {
          toast.error(err.message || "Import failed");
        } finally {
          setImporting(false);
          if (fileRef.current) fileRef.current.value = "";
        }
      },
      error: (err) => { toast.error(err.message); setImporting(false); },
    });
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
    { key: "publish_at", header: "Publish", cell: (r) => r.publish_at ? <span className="text-xs tabular-nums">{fmtDateTime(r.publish_at)}</span> : "—" },
    { key: "updated_at", header: "Updated", sortable: true, cell: (r) => <span className="text-xs tabular-nums">{fmtDate(r.updated_at)}</span> },
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
        actions={
          <>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onFile} />
            <Button variant="outline" size="sm" onClick={downloadTemplate}><Download className="w-4 h-4 me-1" />Template</Button>
            <Button variant="outline" size="sm" disabled={importing} onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4 me-1" />{importing ? "Importing…" : "Import CSV"}
            </Button>
            <Button size="sm" onClick={create}><Plus className="w-4 h-4 me-1" />New post</Button>
          </>
        } />
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
