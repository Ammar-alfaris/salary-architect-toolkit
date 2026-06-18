import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { openCheckout } from "@/lib/paddle";
import { toast } from "sonner";
import {
  Moon, Sun, Languages, Check, ArrowLeft, ChevronDown, ChevronUp,
  Users, UserCheck, Headphones, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Pricing — Total Reward" },
      { name: "description", content: "Every plan includes every feature. Choose by team size and the level of support you want." },
      { property: "og:title", content: "Pricing — Total Reward" },
      { property: "og:description", content: "Every plan includes every feature. Pick by team size and support level." },
      { property: "og:url", content: "https://totalreward.app/pricing" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://totalreward.app/pricing" }],
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
  sort_order: number;
  support_tier: "email" | "priority" | "dedicated";
  onboarding_type: "self_serve" | "guided" | "custom";
  paddle_monthly_price_id: string | null;
  paddle_annual_price_id: string | null;
}

const ALL_FEATURES = [
  "salary_structures", "matrix", "bonus", "merit", "allowances",
  "registry", "approvals", "reports", "analytics", "ar_support",
  "audit_log", "multi_admin",
] as const;

function PricingPage() {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggle } = useTheme();
  const { user, organizationId } = useAuth();
  const ar = locale === "ar";

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("plans").select("*").eq("is_visible", true).eq("status", "active").order("sort_order")
      .then(({ data }) => { setPlans((data as unknown as Plan[]) || []); setLoading(false); });
  }, []);

  async function startCheckout(plan: Plan) {
    if (!user) { window.location.href = "/auth?next=/pricing"; return; }
    const amount = billing === "annual" ? plan.annual_price : plan.monthly_price;
    if (!amount || amount <= 0) { toast.error("This plan isn't available for checkout yet."); return; }
    const productKey = `${plan.slug}_${billing}`;
    const title = `${plan.name} (${billing === "annual" ? "Annual" : "Monthly"})`;
    setCheckingOut(plan.id);
    const qs = new URLSearchParams({
      product: productKey,
      amount: String(amount),
      title,
    }).toString();
    window.location.href = `/checkout?${qs}`;
  }


  const formatPrice = (plan: Plan) => {
    const price = billing === "annual" ? plan.annual_price : plan.monthly_price;
    return `${plan.currency} ${price.toLocaleString()}`;
  };

  const savePct = (plan: Plan) => {
    if (!plan.monthly_price || !plan.annual_price) return 0;
    return Math.round(((plan.monthly_price * 12 - plan.annual_price) / (plan.monthly_price * 12)) * 100);
  };

  const supportLabel = (tier: Plan["support_tier"]) =>
    tier === "dedicated" ? t("support_tier_dedicated") :
    tier === "priority" ? t("support_tier_priority") :
    t("support_tier_email");

  const onboardingLabel = (ob: Plan["onboarding_type"]) =>
    ob === "custom" ? t("onboarding_custom") :
    ob === "guided" ? t("onboarding_guided") :
    t("onboarding_self_serve");

  const faqs = [
    { q: t("pricing_faq_1_q"), a: t("pricing_faq_1_a") },
    { q: t("pricing_faq_2_q"), a: t("pricing_faq_2_a") },
    { q: t("pricing_faq_3_q"), a: t("pricing_faq_3_a") },
    { q: t("pricing_faq_4_q"), a: t("pricing_faq_4_a") },
  ];

  return (
    <div className="min-h-screen bg-background" dir={ar ? "rtl" : "ltr"}>
      <PaymentTestModeBanner />

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
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setLocale(ar ? "en" : "ar")}>
              <Languages className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggle}>
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

      <div className="container mx-auto px-4 py-3">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className={cn("w-3.5 h-3.5", ar && "rotate-180")} />
          {t("back_home")}
        </Link>
      </div>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-8 pb-10 text-center max-w-3xl">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">{t("pricing_title")}</h1>
        <p className="mt-4 text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">{t("pricing_subtitle")}</p>

        <div className="mt-8 inline-flex items-center gap-1 p-1 rounded-full border bg-muted text-sm">
          <button onClick={() => setBilling("monthly")}
            className={cn("px-4 py-1.5 rounded-full transition-all font-medium",
              billing === "monthly" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}>
            {t("billing_monthly")}
          </button>
          <button onClick={() => setBilling("annual")}
            className={cn("px-4 py-1.5 rounded-full transition-all font-medium flex items-center gap-2",
              billing === "annual" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}>
            {t("billing_annual")}
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent/15 text-accent">
              {t("billing_save_badge")}
            </span>
          </button>
        </div>
      </section>

      {/* All-in features banner */}
      <section className="container mx-auto px-4 pb-12 max-w-5xl">
        <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-card to-accent/5 p-6 sm:p-8">
          <div className="flex items-center gap-2 justify-center mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-base sm:text-lg font-semibold">{t("pricing_all_in_title")}</h2>
          </div>
          <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto mb-5">{t("pricing_all_in_sub")}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {ALL_FEATURES.map(k => (
              <div key={k} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-accent shrink-0" />
                <span className="truncate">{t(`feat_label_${k}` as any)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plan cards */}
      <section className="container mx-auto px-4 pb-20">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {[1,2,3,4].map(i => (
              <div key={i} className="border rounded-2xl p-6 space-y-3">
                <Skeleton className="h-5 w-1/2" /><Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" />
                <Skeleton className="h-10 w-full mt-4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {plans.map(plan => {
              const save = savePct(plan);
              const isEnterprise = plan.slug === "enterprise";
              return (
                <div key={plan.id} className={cn(
                  "relative border rounded-2xl p-6 flex flex-col transition-all",
                  plan.is_recommended
                    ? "border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.25)] bg-card scale-[1.02]"
                    : "bg-card hover:shadow-md hover:border-border"
                )}>
                  {plan.is_recommended && (
                    <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                      <Badge className="px-3 py-0.5 text-xs font-semibold bg-primary text-primary-foreground shadow">
                        {t("plan_recommended")}
                      </Badge>
                    </div>
                  )}

                  <div className="mb-4">
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    {plan.description && <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>}
                  </div>

                  <div className="mb-5">
                    <div className="flex items-end gap-1.5">
                      <span className="text-3xl font-bold tabular-nums">{formatPrice(plan)}</span>
                      <span className="text-muted-foreground text-xs mb-1.5">
                        {billing === "annual" ? t("per_year") : t("per_month")}
                      </span>
                    </div>
                    {billing === "annual" && save > 0 && (
                      <p className="text-xs text-accent font-medium mt-0.5">{t("billing_save")} {save}%</p>
                    )}
                  </div>

                  <div className="flex-1 space-y-3 border-t pt-4 text-sm">
                    <Row icon={<Users className="w-4 h-4" />} label={t("plan_users").replace("{n}", String(plan.max_users))} />
                    <Row icon={<UserCheck className="w-4 h-4" />} label={t("plan_employees").replace("{n}", plan.max_employees.toLocaleString())} />
                    <Row icon={<Headphones className="w-4 h-4" />} label={`${t("support_tier_label")}: ${supportLabel(plan.support_tier)}`} />
                    <Row icon={<Sparkles className="w-4 h-4" />} label={`${t("onboarding_label")}: ${onboardingLabel(plan.onboarding_type)}`} />
                  </div>

                  {isEnterprise ? (
                    <Button asChild size="lg" className="mt-6 w-full" variant="outline">
                      <Link to="/contact">{t("contact_sales")}</Link>
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="mt-6 w-full"
                      variant={plan.is_recommended ? "default" : "outline"}
                      disabled={checkingOut === plan.id}
                      onClick={() => startCheckout(plan)}
                    >
                      {checkingOut === plan.id ? "…" : t("plan_subscribe")}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="container mx-auto px-4 pb-20 max-w-2xl">
        <h2 className="text-2xl font-semibold text-center mb-8">{t("pricing_faq_title")}</h2>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="border rounded-xl overflow-hidden">
              <button className="w-full flex items-center justify-between gap-4 px-5 py-4 text-start font-medium text-sm hover:bg-muted/50 transition-colors"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span>{faq.q}</span>
                {openFaq === i ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sm text-muted-foreground border-t bg-muted/20 pt-3">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

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

function Row({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-foreground/90">
      <span className="text-muted-foreground">{icon}</span>
      <span>{label}</span>
    </div>
  );
}
