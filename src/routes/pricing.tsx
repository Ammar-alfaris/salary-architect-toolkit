import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Moon, Sun, Languages, Check, X, ArrowLeft, Zap, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Pricing — Total Reward" },
      { name: "description", content: "Simple, transparent pricing for compensation teams of all sizes. Compare plans and start a free trial." },
      { property: "og:title", content: "Pricing — Total Reward" },
      { property: "og:description", content: "Simple, transparent pricing for compensation teams of all sizes." },
      { property: "og:url", content: "https://totalreward.app/pricing" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "canonical", href: "https://totalreward.app/pricing" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            { "@type": "Question", name: "Can I change plans later?", acceptedAnswer: { "@type": "Answer", text: "Yes. You can upgrade or downgrade at any time — changes take effect immediately and are prorated." } },
            { "@type": "Question", name: "Is there a free trial?", acceptedAnswer: { "@type": "Answer", text: "Most plans include a free trial period. No credit card is required to get started." } },
            { "@type": "Question", name: "What currencies are supported?", acceptedAnswer: { "@type": "Answer", text: "Plans are billed in the currency shown on the plan card. Contact us if you need local pricing." } },
            { "@type": "Question", name: "What happens when I reach my employee limit?", acceptedAnswer: { "@type": "Answer", text: "You'll be prompted to upgrade to a higher plan. Your existing data is never deleted." } },
          ],
        }),
      },
    ],
  }),
});

interface Plan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  monthly_price: number;
  annual_price: number;
  currency: string;
  trial_days: number;
  max_users: number;
  max_employees: number;
  features: Record<string, boolean>;
  is_recommended: boolean;
  is_visible: boolean;
  status: string;
  sort_order: number;
  cta_label?: string;
}

const FEATURE_KEYS = [
  "salary_structures", "matrix", "bonus", "merit", "allowances",
  "registry", "reports", "ar_support", "api", "priority_support", "multi_admin",
] as const;

type FeatureKey = typeof FEATURE_KEYS[number];

function PricingPage() {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggle } = useTheme();
  const ar = locale === "ar";

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("plans")
      .select("*")
      .eq("is_visible", true)
      .eq("status", "active")
      .order("sort_order")
      .then(({ data }) => {
        setPlans((data as Plan[]) || []);
        setLoading(false);
      });
  }, []);

  const featureLabel = (key: FeatureKey): string => t(`feat_label_${key}` as any);

  const formatPrice = (plan: Plan) => {
    const price = billing === "annual" ? plan.annual_price : plan.monthly_price;
    return `${plan.currency} ${price.toLocaleString()}`;
  };

  const savePct = (plan: Plan) => {
    if (plan.monthly_price === 0 || plan.annual_price === 0) return 0;
    const annualizedMonthly = plan.monthly_price * 12;
    return Math.round(((annualizedMonthly - plan.annual_price) / annualizedMonthly) * 100);
  };

  const faqs = [
    { q: t("pricing_faq_1_q"), a: t("pricing_faq_1_a") },
    { q: t("pricing_faq_2_q"), a: t("pricing_faq_2_a") },
    { q: t("pricing_faq_3_q"), a: t("pricing_faq_3_a") },
    { q: t("pricing_faq_4_q"), a: t("pricing_faq_4_a") },
  ];

  return (
    <div className="min-h-screen bg-background" dir={ar ? "rtl" : "ltr"}>

      {/* ── Header ── */}
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center gap-3">
          <Logo size={32} textClassName="truncate text-sm sm:text-base" className="min-w-0 shrink-0" />
          <nav className="hidden md:flex items-center gap-5 text-sm text-muted-foreground flex-1 justify-center">
            <Link to="/" className="hover:text-foreground transition-colors">{t("features")}</Link>
            <Link to="/pricing" className="text-foreground font-medium">{t("pricing")}</Link>
            <Link to="/blog" className="hover:text-foreground transition-colors">{t("blog")}</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">{t("contact")}</Link>
          </nav>
          <div className="flex items-center gap-0.5 ms-auto shrink-0">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setLocale(ar ? "en" : "ar")} aria-label={t("language")}>
              <Languages className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggle} aria-label={t("theme")}>
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex ms-1">
              <Link to="/auth">{t("sign_in")}</Link>
            </Button>
            <Button size="sm" asChild className="ms-1">
              <Link to="/auth">{t("get_started")}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Breadcrumb ── */}
      <div className="container mx-auto px-4 py-3">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className={cn("w-3.5 h-3.5", ar && "rotate-180")} />
          {t("back_home")}
        </Link>
      </div>

      {/* ── Hero ── */}
      <section className="container mx-auto px-4 pt-8 pb-12 text-center max-w-3xl">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">
          {t("pricing_title")}
        </h1>
        <p className="mt-4 text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
          {t("pricing_subtitle")}
        </p>

        {/* Billing toggle */}
        <div className="mt-8 inline-flex items-center gap-1 p-1 rounded-full border bg-muted text-sm">
          <button
            onClick={() => setBilling("monthly")}
            className={cn(
              "px-4 py-1.5 rounded-full transition-all font-medium",
              billing === "monthly"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t("billing_monthly")}
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={cn(
              "px-4 py-1.5 rounded-full transition-all font-medium flex items-center gap-2",
              billing === "annual"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t("billing_annual")}
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent/15 text-accent">
              {t("billing_save_badge")}
            </span>
          </button>
        </div>
      </section>

      {/* ── Plan Cards ── */}
      <section className="container mx-auto px-4 pb-20">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-2xl p-6 space-y-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-10 w-1/2" />
                <div className="space-y-2 pt-4">
                  {[1, 2, 3, 4, 5].map((j) => <Skeleton key={j} className="h-4 w-full" />)}
                </div>
                <Skeleton className="h-10 w-full mt-4" />
              </div>
            ))}
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t("pricing_no_plans")}</p>
          </div>
        ) : (
          <div className={cn(
            "grid gap-6 max-w-6xl mx-auto",
            plans.length === 1 ? "grid-cols-1 max-w-sm" :
            plans.length === 2 ? "grid-cols-1 sm:grid-cols-2 max-w-3xl" :
            "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          )}>
            {plans.map((plan) => {
              const save = savePct(plan);
              const enabledFeatures = FEATURE_KEYS.filter((k) => plan.features?.[k]);
              const disabledFeatures = FEATURE_KEYS.filter((k) => !plan.features?.[k]);
              const isFree = plan.monthly_price === 0 && plan.annual_price === 0;

              return (
                <div
                  key={plan.id}
                  className={cn(
                    "relative border rounded-2xl p-6 flex flex-col transition-shadow",
                    plan.is_recommended
                      ? "border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.3)] bg-card"
                      : "bg-card hover:shadow-md"
                  )}
                >
                  {plan.is_recommended && (
                    <div className={cn(
                      "absolute -top-3.5 left-0 right-0 flex justify-center"
                    )}>
                      <Badge className="px-3 py-0.5 text-xs font-semibold bg-primary text-primary-foreground shadow">
                        {t("plan_recommended")}
                      </Badge>
                    </div>
                  )}

                  {/* Plan name & description */}
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold">{plan.name}</h2>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="mb-1">
                    {isFree ? (
                      <div className="text-4xl font-bold">{t("price_free")}</div>
                    ) : (
                      <div className="flex items-end gap-1.5">
                        <span className="text-4xl font-bold tabular-nums">{formatPrice(plan)}</span>
                        <span className="text-muted-foreground text-sm mb-1.5">
                          {billing === "annual" ? t("per_year") : t("per_month")}
                        </span>
                      </div>
                    )}
                    {billing === "annual" && save > 0 && (
                      <p className="text-xs text-accent font-medium mt-0.5">
                        {t("billing_save")} {save}%
                      </p>
                    )}
                  </div>

                  {/* Limits */}
                  <div className="flex flex-wrap gap-3 mt-3 mb-5">
                    {plan.max_employees > 0 && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                        {t("plan_employees").replace("{n}", plan.max_employees.toLocaleString())}
                      </span>
                    )}
                    {plan.max_users > 0 && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                        {t("plan_users").replace("{n}", plan.max_users.toString())}
                      </span>
                    )}
                    {plan.trial_days > 0 && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent">
                        {t("plan_trial").replace("{n}", plan.trial_days.toString())}
                      </span>
                    )}
                  </div>

                  {/* Features */}
                  <div className="flex-1 space-y-2 border-t pt-4">
                    {enabledFeatures.map((k) => (
                      <div key={k} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-accent shrink-0" />
                        <span>{featureLabel(k)}</span>
                      </div>
                    ))}
                    {disabledFeatures.map((k) => (
                      <div key={k} className="flex items-center gap-2 text-sm text-muted-foreground/50">
                        <X className="w-4 h-4 shrink-0" />
                        <span className="line-through">{featureLabel(k)}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <Button
                    asChild
                    size="lg"
                    className="mt-6 w-full"
                    variant={plan.is_recommended ? "default" : "outline"}
                  >
                    <Link to="/auth">
                      {plan.cta_label || (plan.trial_days > 0 ? t("plan_start_trial") : t("plan_get_started"))}
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Feature Comparison Note ── */}
      {!loading && plans.length > 0 && (
        <section className="container mx-auto px-4 pb-16 text-center">
          <p className="text-sm text-muted-foreground">
            {t("pricing_contact_q")}{" "}
            <Link to="/contact" className="text-primary underline-offset-4 hover:underline font-medium">
              {t("pricing_contact_cta")}
            </Link>
          </p>
        </section>
      )}

      {/* ── FAQ ── */}
      <section className="container mx-auto px-4 pb-20 max-w-2xl">
        <h2 className="text-2xl font-semibold text-center mb-8">{t("pricing_faq_title")}</h2>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="border rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-start font-medium text-sm hover:bg-muted/50 transition-colors"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span>{faq.q}</span>
                {openFaq === i
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                }
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sm text-muted-foreground border-t bg-muted/20 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="container mx-auto px-4 pb-20 max-w-4xl">
        <div
          className="rounded-2xl p-10 text-center text-white"
          style={{ background: "linear-gradient(135deg, oklch(0.32 0.08 255), oklch(0.5 0.13 215))" }}
        >
          <h2 className="text-2xl md:text-3xl font-semibold text-white">{t("cta_headline")}</h2>
          <p className="mt-3 text-white/85 max-w-lg mx-auto text-sm">{t("cta_sub")}</p>
          <Button size="lg" className="mt-6 bg-white text-slate-900 hover:bg-white/90" asChild>
            <Link to="/auth">{t("start_free")}</Link>
          </Button>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/80">
            <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> {t("cta_no_cc")}</div>
            <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> {t("cta_bilingual")}</div>
            <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> {t("cta_export_ready")}</div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} {t("app_name")}</div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-foreground">{t("privacy")}</a>
            <a href="#" className="hover:text-foreground">{t("terms")}</a>
            <Link to="/contact" className="hover:text-foreground">{t("contact")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
