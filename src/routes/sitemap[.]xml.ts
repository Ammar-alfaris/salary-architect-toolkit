import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BASE_URL = "https://totalreward.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/pricing", changefreq: "weekly", priority: "0.9" },
          { path: "/blog", changefreq: "daily", priority: "0.8" },
          { path: "/contact", changefreq: "monthly", priority: "0.6" },
        ];

        try {
          const { data: posts } = await supabaseAdmin
            .from("blog_posts")
            .select("slug,publish_at,updated_at")
            .eq("status", "published");
          for (const p of (posts ?? []) as Array<{ slug: string; publish_at: string | null; updated_at: string | null }>) {
            entries.push({
              path: `/blog/${p.slug}`,
              lastmod: (p.updated_at ?? p.publish_at ?? undefined) as string | undefined,
              changefreq: "weekly",
              priority: "0.7",
            });
          }
        } catch {
          // ignore — sitemap still includes static routes
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
