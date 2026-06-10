import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// AI-agent webhook for managing blog posts.
// Auth: Authorization: Bearer <BLOG_WEBHOOK_SECRET>
// Body: { action: "list" | "get" | "create" | "update" | "delete" | "publish" | "unpublish" | "schedule", ... }

const PostFields = z.object({
  title: z.string().min(1).max(300).optional(),
  slug: z.string().min(1).max(300).regex(/^[a-z0-9-]+$/).optional(),
  excerpt: z.string().max(1000).nullable().optional(),
  content: z.string().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().min(1).max(80)).max(30).optional(),
  seo_title: z.string().max(300).nullable().optional(),
  seo_description: z.string().max(500).nullable().optional(),
  canonical_url: z.string().url().nullable().optional(),
  featured_image_url: z.string().url().nullable().optional(),
  featured_image_alt: z.string().max(300).nullable().optional(),
  status: z.enum(["draft", "scheduled", "published"]).optional(),
  publish_at: z.string().datetime().nullable().optional(),
  is_featured: z.boolean().optional(),
});

const InputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("list"), status: z.string().optional(), limit: z.number().int().min(1).max(100).optional() }),
  z.object({ action: z.literal("get"), id: z.string().uuid().optional(), slug: z.string().optional() }),
  z.object({ action: z.literal("create"), data: PostFields.required({ title: true, slug: true }) }),
  z.object({ action: z.literal("update"), id: z.string().uuid().optional(), slug: z.string().optional(), data: PostFields }),
  z.object({ action: z.literal("delete"), id: z.string().uuid().optional(), slug: z.string().optional() }),
  z.object({ action: z.literal("publish"), id: z.string().uuid().optional(), slug: z.string().optional() }),
  z.object({ action: z.literal("unpublish"), id: z.string().uuid().optional(), slug: z.string().optional() }),
  z.object({ action: z.literal("schedule"), id: z.string().uuid().optional(), slug: z.string().optional(), publish_at: z.string().datetime() }),
]);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

export const Route = createFileRoute("/api/public/blog-webhook")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async () =>
        json({
          ok: true,
          usage: "POST with Authorization: Bearer <BLOG_WEBHOOK_SECRET> and JSON body { action, ... }",
          actions: ["list", "get", "create", "update", "delete", "publish", "unpublish", "schedule"],
        }),
      POST: async ({ request }) => {
        const secret = process.env.BLOG_WEBHOOK_SECRET;
        if (!secret) return json({ error: "Webhook not configured" }, 500);

        const auth = request.headers.get("authorization") || "";
        const token = auth.replace(/^Bearer\s+/i, "").trim();
        if (!token || token !== secret) return json({ error: "Unauthorized" }, 401);

        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }

        const parsed = InputSchema.safeParse(payload);
        if (!parsed.success) {
          return json({ error: "Invalid input", issues: parsed.error.issues }, 400);
        }
        const input = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const findId = async (args: { id?: string; slug?: string }) => {
          if (args.id) return args.id;
          if (!args.slug) return null;
          const { data } = await supabaseAdmin.from("blog_posts").select("id").eq("slug", args.slug).maybeSingle();
          return (data as { id?: string } | null)?.id ?? null;
        };

        try {
          switch (input.action) {
            case "list": {
              let q = supabaseAdmin
                .from("blog_posts")
                .select("id,title,slug,status,publish_at,is_featured,updated_at,created_at")
                .order("updated_at", { ascending: false })
                .limit(input.limit ?? 50);
              if (input.status) q = q.eq("status", input.status);
              const { data, error } = await q;
              if (error) return json({ error: error.message }, 500);
              return json({ ok: true, posts: data });
            }
            case "get": {
              const id = await findId(input);
              if (!id) return json({ error: "Not found" }, 404);
              const { data, error } = await supabaseAdmin.from("blog_posts").select("*").eq("id", id).maybeSingle();
              if (error) return json({ error: error.message }, 500);
              if (!data) return json({ error: "Not found" }, 404);
              return json({ ok: true, post: data });
            }
            case "create": {
              const row: Record<string, unknown> = { ...input.data };
              if (row.status === "published" && !row.publish_at) row.publish_at = new Date().toISOString();
              const { data, error } = await supabaseAdmin.from("blog_posts").insert(row).select("*").single();
              if (error) return json({ error: error.message }, 400);
              return json({ ok: true, post: data });
            }
            case "update": {
              const id = await findId(input);
              if (!id) return json({ error: "Not found" }, 404);
              const row: Record<string, unknown> = { ...input.data };
              if (row.status === "published" && !row.publish_at) row.publish_at = new Date().toISOString();
              const { data, error } = await supabaseAdmin.from("blog_posts").update(row).eq("id", id).select("*").single();
              if (error) return json({ error: error.message }, 400);
              return json({ ok: true, post: data });
            }
            case "delete": {
              const id = await findId(input);
              if (!id) return json({ error: "Not found" }, 404);
              const { error } = await supabaseAdmin.from("blog_posts").delete().eq("id", id);
              if (error) return json({ error: error.message }, 400);
              return json({ ok: true, deleted: id });
            }
            case "publish": {
              const id = await findId(input);
              if (!id) return json({ error: "Not found" }, 404);
              const { data, error } = await supabaseAdmin
                .from("blog_posts")
                .update({ status: "published", publish_at: new Date().toISOString() })
                .eq("id", id)
                .select("*")
                .single();
              if (error) return json({ error: error.message }, 400);
              return json({ ok: true, post: data });
            }
            case "unpublish": {
              const id = await findId(input);
              if (!id) return json({ error: "Not found" }, 404);
              const { data, error } = await supabaseAdmin
                .from("blog_posts")
                .update({ status: "draft" })
                .eq("id", id)
                .select("*")
                .single();
              if (error) return json({ error: error.message }, 400);
              return json({ ok: true, post: data });
            }
            case "schedule": {
              const id = await findId(input);
              if (!id) return json({ error: "Not found" }, 404);
              const { data, error } = await supabaseAdmin
                .from("blog_posts")
                .update({ status: "scheduled", publish_at: input.publish_at })
                .eq("id", id)
                .select("*")
                .single();
              if (error) return json({ error: error.message }, 400);
              return json({ ok: true, post: data });
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Internal error";
          return json({ error: msg }, 500);
        }
      },
    },
  },
});
