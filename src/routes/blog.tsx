import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { ArrowRight, Clock, Search, Layers, Languages, Moon, Sun, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/blog")({
  component: BlogIndex,
  head: () => ({
    meta: [
      { title: "Blog — Total Reward" },
      { name: "description", content: "Insights on compensation strategy, salary structures, bonus design, merit cycles and equity." },
      { property: "og:title", content: "Total Reward Blog" },
      { property: "og:description", content: "Insights on compensation strategy from the Total Reward team." },
    ],
  }),
});

interface Post {
  id: string; title: string; slug: string; excerpt: string | null;
  content: string | null; featured_image_url: string | null;
  publish_at: string | null; is_featured: boolean; tags: string[];
}

function readingTime(content: string | null) {
  const w = (content || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(w / 200));
}

function BlogIndex() {
  const { locale, setLocale } = useI18n();
  const { theme, toggle } = useTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("blog_posts")
      .select("id,title,slug,excerpt,content,featured_image_url,publish_at,is_featured,tags")
      .eq("status", "published")
      .order("publish_at", { ascending: false, nullsFirst: false })
      .then(({ data }) => {
        setPosts((data as any) || []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return posts;
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(s) ||
        (p.excerpt || "").toLowerCase().includes(s) ||
        p.tags.some((t) => t.toLowerCase().includes(s))
    );
  }, [posts, q]);

  const featured = filtered.find((p) => p.is_featured) || filtered[0];
  const rest = filtered.filter((p) => p.id !== featured?.id);

  const ar = locale === "ar";

  return (
    <div className="min-h-screen bg-background" dir={ar ? "rtl" : "ltr"}>
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
          <Link to="/"><Logo size={32} /></Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">{ar ? "الرئيسية" : "Home"}</Link>
            <Link to="/blog" className="text-foreground font-medium">{ar ? "المدونة" : "Blog"}</Link>
          </nav>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setLocale(ar ? "en" : "ar")}>
              <Languages className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggle}>
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button size="sm" asChild><Link to="/auth">{ar ? "ابدأ مجاناً" : "Get started"}</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 -z-10 opacity-50" style={{ background: "radial-gradient(ellipse at top, var(--primary-glow), transparent 60%)" }} />
        <div className="container mx-auto px-4 py-14 md:py-20 max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-card text-xs text-muted-foreground mb-5">
            <Sparkles className="w-3 h-3 text-primary" />
            <span>{ar ? "رؤى ومقالات" : "Insights & articles"}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">
            {ar ? "مدونة المكافآت الشاملة" : "The Total Reward Blog"}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            {ar
              ? "مقالات ودراسات عملية حول هياكل الرواتب، المكافآت، الزيادات، والإنصاف الداخلي."
              : "Practical guides on salary structures, bonuses, merit cycles and pay equity."}
          </p>
          <div className="mt-6 max-w-md mx-auto relative">
            <Search className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 text-muted-foreground ${ar ? "right-3" : "left-3"}`} />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={ar ? "ابحث في المقالات…" : "Search articles…"}
              className={ar ? "pr-9" : "pl-9"}
            />
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-10 md:py-14">
        {loading ? (
          <div className="text-center text-muted-foreground py-20 text-sm">{ar ? "جاري التحميل…" : "Loading…"}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-20 text-sm">
            {ar ? "لا توجد مقالات منشورة بعد." : "No published articles yet."}
          </div>
        ) : (
          <>
            {featured && (
              <Link
                to="/blog/$slug"
                params={{ slug: featured.slug }}
                className="group block mb-12 rounded-2xl overflow-hidden border bg-card hover:shadow-[var(--shadow-elegant)] transition-shadow"
              >
                <div className="grid md:grid-cols-2">
                  <div className="aspect-[16/10] md:aspect-auto bg-muted relative overflow-hidden">
                    {featured.featured_image_url ? (
                      <img src={featured.featured_image_url} alt={featured.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
                    )}
                    <Badge className="absolute top-4 start-4 bg-primary text-primary-foreground">
                      {ar ? "مميّز" : "Featured"}
                    </Badge>
                  </div>
                  <div className="p-6 md:p-10 flex flex-col justify-center">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      {featured.publish_at && <span>{new Date(featured.publish_at).toLocaleDateString(ar ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric" })}</span>}
                      <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{readingTime(featured.content)} {ar ? "د قراءة" : "min read"}</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-semibold tracking-tight group-hover:text-primary transition-colors">{featured.title}</h2>
                    {featured.excerpt && <p className="mt-3 text-muted-foreground line-clamp-3">{featured.excerpt}</p>}
                    <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary">
                      {ar ? "اقرأ المقال" : "Read article"} <ArrowRight className={`w-4 h-4 ${ar ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                </div>
              </Link>
            )}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rest.map((p) => (
                <Link key={p.id} to="/blog/$slug" params={{ slug: p.slug }} className="group rounded-xl overflow-hidden border bg-card hover:shadow-md transition-shadow flex flex-col">
                  <div className="aspect-[16/10] bg-muted overflow-hidden">
                    {p.featured_image_url ? (
                      <img src={p.featured_image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/15 to-accent/15" />
                    )}
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2">
                      {p.publish_at && <span>{new Date(p.publish_at).toLocaleDateString(ar ? "ar-SA" : "en-US")}</span>}
                      <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{readingTime(p.content)}m</span>
                    </div>
                    <h3 className="font-semibold text-base leading-snug group-hover:text-primary transition-colors line-clamp-2">{p.title}</h3>
                    {p.excerpt && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{p.excerpt}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* CTA */}
        <section className="mt-16 md:mt-24 rounded-2xl border bg-gradient-to-br from-primary/10 via-accent/5 to-background p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
            {ar ? "جاهز لإدارة مكافآتك بذكاء؟" : "Ready to modernize your total rewards?"}
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            {ar ? "ابدأ تجربتك المجانية اليوم وأدِر هياكل الرواتب والمكافآت من مكان واحد." : "Start your free trial today and manage salary structures, bonuses and merit cycles in one place."}
          </p>
          <div className="mt-6">
            <Button size="lg" asChild>
              <Link to="/auth">{ar ? "ابدأ التجربة المجانية" : "Start free trial"} <ArrowRight className={`w-4 h-4 ms-2 ${ar ? "rotate-180" : ""}`} /></Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t mt-12 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Total Reward
      </footer>
    </div>
  );
}
