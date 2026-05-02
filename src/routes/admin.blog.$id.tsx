import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/blog/$id")({ component: PostEditor });

function PostEditor() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [post, setPost] = useState<any>(null);

  useEffect(() => {
    supabase.from("blog_posts").select("*").eq("id", id).maybeSingle().then(({ data }) => setPost(data));
  }, [id]);

  if (!post) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const update = (k: string, v: any) => setPost({ ...post, [k]: v });

  const save = async (status?: string) => {
    const payload = { ...post };
    if (status) payload.status = status;
    if (status === "published" && !payload.publish_at) payload.publish_at = new Date().toISOString();
    delete payload.id; delete payload.created_at; delete payload.updated_at;
    const { error } = await supabase.from("blog_posts").update(payload).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "published" ? "Published" : "Saved");
    setPost({ ...post, status: payload.status });
  };

  const remove = async () => {
    if (!confirm("Delete?")) return;
    await supabase.from("blog_posts").delete().eq("id", id);
    nav({ to: "/admin/blog" });
  };

  return (
    <div>
      <AdminPageHeader title={post.title || "Untitled"} subtitle={`Status: ${post.status}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm"><Link to="/admin/blog"><ArrowLeft className="w-4 h-4 me-1" />Back</Link></Button>
            <Button variant="outline" size="sm" onClick={() => save("draft")}><Save className="w-4 h-4 me-1" />Save draft</Button>
            <Button size="sm" onClick={() => save("published")}><Send className="w-4 h-4 me-1" />Publish</Button>
            <Button variant="ghost" size="icon" onClick={remove}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </>
        } />
      <div className="p-4 md:p-6 grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <Field label="Title"><Input value={post.title} onChange={(e) => update("title", e.target.value)} className="text-lg font-semibold" /></Field>
              <Field label="Slug"><Input value={post.slug} onChange={(e) => update("slug", e.target.value)} /></Field>
              <Field label="Excerpt"><Textarea value={post.excerpt || ""} onChange={(e) => update("excerpt", e.target.value)} rows={2} /></Field>
              <Field label="Content (markdown)"><Textarea value={post.content || ""} onChange={(e) => update("content", e.target.value)} rows={16} className="font-mono text-sm" /></Field>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Settings</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label="Status">
                <Select value={post.status} onValueChange={(v) => update("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Publish at"><Input type="datetime-local" value={post.publish_at ? post.publish_at.slice(0,16) : ""} onChange={(e) => update("publish_at", e.target.value ? new Date(e.target.value).toISOString() : null)} /></Field>
              <label className="flex items-center gap-2 text-sm"><Switch checked={post.is_featured} onCheckedChange={(v) => update("is_featured", v)} />Featured</label>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">SEO</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label="SEO title"><Input value={post.seo_title || ""} onChange={(e) => update("seo_title", e.target.value)} /></Field>
              <Field label="SEO description"><Textarea value={post.seo_description || ""} onChange={(e) => update("seo_description", e.target.value)} rows={2} /></Field>
              <Field label="Featured image URL"><Input value={post.featured_image_url || ""} onChange={(e) => update("featured_image_url", e.target.value)} /></Field>
              <Field label="Image alt text"><Input value={post.featured_image_alt || ""} onChange={(e) => update("featured_image_alt", e.target.value)} /></Field>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
