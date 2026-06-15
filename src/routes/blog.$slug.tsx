import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReadingProgress } from "@/components/blog/reading-progress";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { ArrowLeft, ArrowRight, Clock, Layers, Languages, Moon, Sun, Share2, Twitter, Linkedin, Link as LinkIcon } from "lucide-react";
import { Logo } from "@/components/logo";
import { toast } from "sonner";

export const Route = createFileRoute("/blog/$slug")({
  component: BlogPost,
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("blog_posts")
      .select("title,slug,excerpt,featured_image_url,publish_at,updated_at,seo_title,seo_description")
      .eq("slug", params.slug)
      .eq("status", "published")
      .maybeSingle();
    return { post: data as null | {
      title: string; slug: string; excerpt: string | null;
      featured_image_url: string | null; publish_at: string | null;
      updated_at: string | null; seo_title: string | null; seo_description: string | null;
    } };
  },
  head: ({ params, loaderData }) => {
    const post = loaderData?.post;
    const url = `https://totalreward.app/blog/${params.slug}`;
    const title = post?.seo_title || post?.title || "Blog — Total Reward";
    const desc = post?.seo_description || post?.excerpt || "Read this article on Total Reward.";
    const img = post?.featured_image_url || undefined;
    return {
      meta: [
        { title: `${title} — Total Reward` },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        ...(img ? [{ property: "og:image" as const, content: img }, { name: "twitter:image" as const, content: img }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: post
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Article",
                headline: post.title,
                description: desc,
                image: img,
                datePublished: post.publish_at,
                dateModified: post.updated_at || post.publish_at,
                mainEntityOfPage: url,
                publisher: { "@type": "Organization", name: "Total Reward" },
              }),
            },
          ]
        : [],
    };
  },
});

interface Post {
  id: string; title: string; slug: string; excerpt: string | null;
  content: string | null; featured_image_url: string | null;
  featured_image_alt: string | null; publish_at: string | null;
  seo_title: string | null; seo_description: string | null; tags: string[];
}

function readingTime(content: string | null) {
  const w = (content || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(w / 200));
}

function isArabicText(...parts: (string | null | undefined)[]) {
  const text = parts.filter(Boolean).join(" ");
  if (!text) return false;
  const arabic = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return arabic > latin;
}

function BlogPost() {
  const { slug } = Route.useParams();
  const { locale, setLocale } = useI18n();
  const { theme, toggle } = useTheme();
  const ar = locale === "ar";
  const [post, setPost] = useState<Post | null>(null);
  const [related, setRelated] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("blog_posts")
        .select("id,title,slug,excerpt,content,featured_image_url,featured_image_alt,publish_at,seo_title,seo_description,tags")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      setPost((data as any) || null);
      if (data) {
        const { data: rel } = await supabase
          .from("blog_posts")
          .select("id,title,slug,excerpt,content,featured_image_url,featured_image_alt,publish_at,seo_title,seo_description,tags")
          .eq("status", "published")
          .neq("id", (data as any).id)
          .order("publish_at", { ascending: false })
          .limit(3);
        setRelated((rel as any) || []);
      }
      setLoading(false);
      document.title = (data as any)?.seo_title || (data as any)?.title || "Blog";
    })();
  }, [slug]);

  const toc = useMemo(() => {
    if (!post?.content) return [];
    const lines = post.content.split("\n");
    return lines
      .filter((l) => /^#{2,3}\s+/.test(l))
      .map((l) => {
        const level = l.match(/^(#+)/)![1].length;
        const text = l.replace(/^#+\s+/, "").trim();
        const id = text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
        return { level, text, id };
      });
  }, [post?.content]);

  const share = (kind: "x" | "li" | "copy") => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = post?.title || "";
    if (kind === "x") window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, "_blank");
    else if (kind === "li") window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, "_blank");
    else { navigator.clipboard.writeText(url); toast.success(ar ? "تم نسخ الرابط" : "Link copied"); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  if (!post) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
      <h1 className="text-2xl font-semibold">{ar ? "المقال غير موجود" : "Article not found"}</h1>
      <Button asChild><Link to="/blog">{ar ? "العودة للمدونة" : "Back to blog"}</Link></Button>
    </div>
  );

  const postIsArabic = isArabicText(post.title, post.excerpt, post.content);
  const postDir: "rtl" | "ltr" = postIsArabic ? "rtl" : "ltr";
  const postLang = postIsArabic ? "ar" : "en";

  return (
    <div className="min-h-screen bg-background" dir={ar ? "rtl" : "ltr"}>
      <ReadingProgress />

      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
          <Link to="/"><Logo size={32} /></Link>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild><Link to="/blog"><ArrowLeft className={`w-4 h-4 me-1 ${ar ? "rotate-180" : ""}`} />{ar ? "المدونة" : "Blog"}</Link></Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setLocale(ar ? "en" : "ar")} aria-label={ar ? "تغيير اللغة" : "Change language"}><Languages className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggle} aria-label={ar ? "تبديل المظهر" : "Toggle theme"}>{theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</Button>
            <Button size="sm" asChild><Link to="/auth">{ar ? "ابدأ" : "Get started"}</Link></Button>
          </div>
        </div>
      </header>

      <main>
      <article className="container mx-auto px-4 max-w-6xl" dir={postDir} lang={postLang}>
        <div className="pt-10 md:pt-14 pb-6 max-w-3xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-4">
            {post.publish_at && <span>{new Date(post.publish_at).toLocaleDateString(ar ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric" })}</span>}
            <span>·</span>
            <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{readingTime(post.content)} {ar ? "د قراءة" : "min read"}</span>
            {post.tags?.length > 0 && <>
              <span>·</span>
              <div className="flex gap-1.5 flex-wrap">{post.tags.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}</div>
            </>}
          </div>
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.15]">{post.title}</h1>
          {post.excerpt && <p className="mt-5 text-lg text-muted-foreground leading-relaxed">{post.excerpt}</p>}
          <div className="mt-6 flex items-center gap-2">
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Share2 className="w-3.5 h-3.5" />{ar ? "شارك:" : "Share:"}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => share("x")} aria-label={ar ? "شارك على تويتر" : "Share on Twitter"}><Twitter className="w-3.5 h-3.5" /></Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => share("li")} aria-label={ar ? "شارك على لينكدإن" : "Share on LinkedIn"}><Linkedin className="w-3.5 h-3.5" /></Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => share("copy")} aria-label={ar ? "نسخ الرابط" : "Copy link"}><LinkIcon className="w-3.5 h-3.5" /></Button>
          </div>
        </div>

        {post.featured_image_url && (
          <div className="rounded-2xl overflow-hidden border mb-10 max-w-5xl mx-auto">
            <img src={post.featured_image_url} alt={post.featured_image_alt || post.title} className="w-full h-auto" />
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_240px] gap-10 max-w-5xl mx-auto pb-16">
          <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:tracking-tight prose-headings:font-semibold prose-h2:text-2xl prose-h3:text-xl prose-img:rounded-xl prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-blockquote:border-s-4 prose-blockquote:border-primary prose-blockquote:bg-muted/30 prose-blockquote:rounded-e-md prose-blockquote:py-1 prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children, ...p }) => {
                  const text = String(children);
                  const id = text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
                  return <h2 id={id} {...p}>{children}</h2>;
                },
                h3: ({ children, ...p }) => {
                  const text = String(children);
                  const id = text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
                  return <h3 id={id} {...p}>{children}</h3>;
                },
              }}
            >
              {post.content || ""}
            </ReactMarkdown>
          </div>
          {toc.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  {ar ? "محتويات" : "On this page"}
                </div>
                <nav className="space-y-1.5 text-sm border-s ps-4">
                  {toc.map((h) => (
                    <a key={h.id} href={`#${h.id}`} className={`block hover:text-primary transition-colors ${h.level === 3 ? "ps-3 text-muted-foreground" : "text-foreground"}`}>
                      {h.text}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}
        </div>

        {/* CTA */}
        <section className="rounded-2xl border bg-gradient-to-br from-primary/15 via-accent/5 to-background p-8 md:p-12 text-center max-w-4xl mx-auto mb-16">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
            {ar ? "جرّب Total Reward مجاناً" : "Try Total Reward free"}
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            {ar ? "أنشئ هياكل الرواتب وأدر دورات المكافآت والزيادات في دقائق." : "Build salary structures and run bonus & merit cycles in minutes."}
          </p>
          <div className="mt-6">
            <Button size="lg" asChild>
              <Link to="/auth">{ar ? "اشترك الآن" : "Subscribe & start"} <ArrowRight className={`w-4 h-4 ms-2 ${ar ? "rotate-180" : ""}`} /></Link>
            </Button>
          </div>
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section className="max-w-5xl mx-auto pb-20">
            <h3 className="text-xl font-semibold tracking-tight mb-6">{ar ? "مقالات ذات صلة" : "Related articles"}</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {related.map((p) => (
                <Link key={p.id} to="/blog/$slug" params={{ slug: p.slug }} className="group rounded-xl overflow-hidden border bg-card hover:shadow-md transition-shadow">
                  <div className="aspect-[16/10] bg-muted overflow-hidden">
                    {p.featured_image_url ? (
                      <img src={p.featured_image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/15 to-accent/15" />
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold text-sm leading-snug group-hover:text-primary line-clamp-2">{p.title}</h4>
                    <div className="mt-2 text-[11px] text-muted-foreground inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />{readingTime(p.content)} {ar ? "د" : "m"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
      </main>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Total Reward
      </footer>
    </div>
  );
}
