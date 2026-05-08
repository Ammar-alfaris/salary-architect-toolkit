import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { Layers, Grid3x3, Gift, TrendingUp, Wallet, Users, FileBarChart, Moon, Sun, Languages, ArrowRight, Check, Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "RewardArchitect — Salary structures, bonuses, merit & allowances" },
      { name: "description", content: "An enterprise compensation platform for HR teams. Build salary grades, run bonus and merit cycles, and manage allowances in one place." },
    ],
  }),
});

function Landing() {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const features = [
    { icon: Layers, title: t("feat_structure_title"), desc: t("feat_structure_desc") },
    { icon: Grid3x3, title: t("feat_matrix_title"), desc: t("feat_matrix_desc") },
    { icon: Gift, title: t("feat_bonus_title"), desc: t("feat_bonus_desc") },
    { icon: TrendingUp, title: t("feat_merit_title"), desc: t("feat_merit_desc") },
    { icon: Wallet, title: t("feat_allow_title"), desc: t("feat_allow_desc") },
    { icon: Users, title: t("feat_emp_title"), desc: t("feat_emp_desc") },
    { icon: FileBarChart, title: t("feat_reports_title"), desc: t("feat_reports_desc") },
  ];

  const navLinks = [
    { href: "#features", label: t("features") },
    { href: "#modules", label: t("modules") },
    { href: "#cta", label: t("pricing") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
          <Logo size={32} textClassName="truncate text-sm sm:text-base" className="min-w-0" />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-foreground">{l.label}</a>
            ))}
            <Link to="/blog" className="hover:text-foreground">Blog</Link>
          </nav>

          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setLocale(locale === "en" ? "ar" : "en")} aria-label={t("language")}>
              <Languages className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggle} aria-label={t("theme")}>
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild><Link to="/auth">{t("sign_in")}</Link></Button>
            <Button size="sm" className="hidden sm:inline-flex" asChild><Link to="/auth">{t("get_started")}</Link></Button>

            {/* Hamburger — mobile only */}
            <button
              className="md:hidden h-9 w-9 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav sheet */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 max-w-[85vw] p-0 flex flex-col [&>button]:hidden">
          <div className="flex items-center justify-between px-4 h-14 border-b shrink-0">
            <Logo size={28} textClassName="text-sm" />
            <button
              onClick={() => setMenuOpen(false)}
              className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <nav className="flex flex-col px-3 py-4 gap-1">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center px-3 py-2.5 rounded-md text-sm hover:bg-accent transition-colors"
              >
                {l.label}
              </a>
            ))}
            <Link
              to="/blog"
              onClick={() => setMenuOpen(false)}
              className="flex items-center px-3 py-2.5 rounded-md text-sm hover:bg-accent transition-colors"
            >
              Blog
            </Link>
          </nav>
          <div className="mt-auto px-3 pb-6 flex flex-col gap-2 border-t pt-4">
            <Button variant="outline" asChild className="w-full" onClick={() => setMenuOpen(false)}>
              <Link to="/auth">{t("sign_in")}</Link>
            </Button>
            <Button asChild className="w-full" onClick={() => setMenuOpen(false)}>
              <Link to="/auth">{t("get_started")} <ArrowRight className="w-4 h-4 ms-2" /></Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-50" style={{ background: "radial-gradient(ellipse at top, var(--primary-glow), transparent 60%)" }} />
        <div className="container mx-auto px-4 py-14 sm:py-20 md:py-28 max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-card text-xs text-muted-foreground mb-6 max-w-full">
            <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
            <span className="truncate">{t("for_total_rewards_teams")}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-semibold tracking-tight leading-[1.1] break-words">
            {t("hero_headline")}
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">{t("hero_sub")}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild><Link to="/auth">{t("start_free")} <ArrowRight className="w-4 h-4 ms-2" /></Link></Button>
            <Button size="lg" variant="outline" asChild><a href="#features">{t("view_demo")}</a></Button>
          </div>
        </div>
      </section>

      {/* Mock dashboard preview */}
      <section className="container mx-auto px-4 pb-16">
        <div className="rounded-xl border bg-card overflow-hidden shadow-[var(--shadow-elegant)]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-muted/40 border-b">
            {[
              { label: t("total_employees"), value: "1,284" },
              { label: t("active_structures"), value: "6" },
              { label: t("avg_compa_ratio"), value: "0.97" },
            ].map((k) => (
              <div key={k.label} className="bg-card border rounded-lg p-4">
                <div className="text-xs text-muted-foreground">{k.label}</div>
                <div className="text-2xl font-semibold mt-1 num">{k.value}</div>
              </div>
            ))}
          </div>
          <div className="p-6">
            <div className="text-sm font-medium mb-3">{t("salary_matrix")}</div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6, 7].map((g, i) => {
                const widthPct = 30 + i * 5;
                const offsetPct = i * 4;
                return (
                  <div key={g} className="flex items-center gap-3 text-xs">
                    <div className="w-12 text-muted-foreground">G0{g}</div>
                    <div className="flex-1 h-3 bg-muted rounded-full relative">
                      <div className="absolute h-3 rounded-full bg-gradient-to-r from-primary to-accent" style={{ left: `${offsetPct}%`, width: `${widthPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">{t("everything_total_rewards_needs")}</h2>
          <p className="mt-3 text-muted-foreground">{t("replace_spreadsheets")}</p>
        </div>
        <div id="modules" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="border rounded-lg p-5 bg-card hover:border-accent/50 transition-colors">
                <div className="w-10 h-10 rounded-md bg-accent/10 text-accent flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-medium">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="container mx-auto px-4 py-16">
        <div
          className="rounded-2xl p-10 md:p-14 text-center text-white shadow-2xl"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.32 0.08 255), oklch(0.5 0.13 215))",
          }}
        >
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white">{t("cta_headline")}</h2>
          <p className="mt-3 text-white/85 max-w-xl mx-auto">{t("cta_sub")}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild className="bg-white text-slate-900 hover:bg-white/90">
              <Link to="/auth">{t("start_free")}</Link>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/85">
            <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> {t("cta_no_cc")}</div>
            <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> {t("cta_bilingual")}</div>
            <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> {t("cta_export_ready")}</div>
          </div>
        </div>
      </section>

      <footer className="border-t mt-12">
        <div className="container mx-auto px-4 py-8 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} {t("app_name")}</div>
          <div className="flex gap-4"><a href="#" className="hover:text-foreground">{t("privacy")}</a><a href="#" className="hover:text-foreground">{t("terms")}</a><a href="#" className="hover:text-foreground">{t("contact")}</a></div>
        </div>
      </footer>
    </div>
  );
}
