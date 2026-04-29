import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { Layers, Grid3x3, Gift, TrendingUp, Wallet, Users, FileBarChart, Moon, Sun, Languages, ArrowRight, Check } from "lucide-react";

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

  const features = [
    { icon: Layers, title: "Salary Structure Builder", desc: "Configurable grade count, midpoint progression, and spread logic." },
    { icon: Grid3x3, title: "Salary Range Matrix", desc: "Auto-generate min, midpoint and max with rounding rules and visual range bars." },
    { icon: Gift, title: "Bonus Calculator", desc: "Target %, performance, business and individual modifiers with proration." },
    { icon: TrendingUp, title: "Merit Increase Planner", desc: "Editable matrix by performance × compa-ratio with budget impact." },
    { icon: Wallet, title: "Allowances Calculator", desc: "Housing, transport, mobile, education and custom allowance templates." },
    { icon: Users, title: "Employee Registry", desc: "Compensation profiles with compa-ratio, range penetration and total rewards." },
    { icon: FileBarChart, title: "Reports & Export", desc: "Export-ready CSVs for finance review and management reporting." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <span className="font-semibold tracking-tight">{t("app_name")}</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">{t("features")}</a>
            <a href="#modules" className="hover:text-foreground">{t("modules")}</a>
            <a href="#cta" className="hover:text-foreground">{t("pricing")}</a>
          </nav>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setLocale(locale === "en" ? "ar" : "en")}>
              <Languages className="w-4 h-4 me-1" />{locale.toUpperCase()}
            </Button>
            <Button variant="ghost" size="icon" onClick={toggle}>
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" asChild><Link to="/auth">{t("sign_in")}</Link></Button>
            <Button size="sm" asChild><Link to="/auth">{t("get_started")}</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-50" style={{ background: "radial-gradient(ellipse at top, var(--primary-glow), transparent 60%)" }} />
        <div className="container mx-auto px-4 py-20 md:py-28 max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-card text-xs text-muted-foreground mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            For HR, Compensation & Total Rewards teams
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
            {t("hero_headline")}
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">{t("hero_sub")}</p>
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
              { label: "Total Employees", value: "1,284" },
              { label: "Active Structures", value: "6" },
              { label: "Avg Compa-Ratio", value: "0.97" },
            ].map((k) => (
              <div key={k.label} className="bg-card border rounded-lg p-4">
                <div className="text-xs text-muted-foreground">{k.label}</div>
                <div className="text-2xl font-semibold mt-1 num">{k.value}</div>
              </div>
            ))}
          </div>
          <div className="p-6">
            <div className="text-sm font-medium mb-3">Salary Range Matrix</div>
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
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Everything Total Rewards needs</h2>
          <p className="mt-3 text-muted-foreground">Replace fragmented spreadsheets with a structured, repeatable compensation workflow.</p>
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
        <div className="rounded-2xl p-10 md:p-14 text-center text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Build salary structures faster, more consistently.</h2>
          <p className="mt-3 opacity-90 max-w-xl mx-auto">Start with a default structure, customize the formulas, and apply to your employees in minutes.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" variant="secondary" asChild><Link to="/auth">{t("start_free")}</Link></Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs opacity-90">
            <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> No credit card</div>
            <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> EN / AR with RTL</div>
            <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Export-ready reports</div>
          </div>
        </div>
      </section>

      <footer className="border-t mt-12">
        <div className="container mx-auto px-4 py-8 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} {t("app_name")}</div>
          <div className="flex gap-4"><a href="#" className="hover:text-foreground">Privacy</a><a href="#" className="hover:text-foreground">Terms</a><a href="#" className="hover:text-foreground">Contact</a></div>
        </div>
      </footer>
    </div>
  );
}
