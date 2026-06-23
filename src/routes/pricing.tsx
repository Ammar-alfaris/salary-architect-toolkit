import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { startTrial } from "@/lib/trial.functions";
import { getVisitorCurrency } from "@/lib/pricing-locale.functions";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
// Paylink replaces Paddle for subscription checkout.
import { toast } from "sonner";
import {
  Moon, Sun, Languages, Check, ArrowLeft, ChevronDown, ChevronUp,
  Users, UserCheck, Headphones, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRICING_FAQS = [
  { q: "Can I change plans later?", a: "Yes. You can upgrade or downgrade at any time — changes take effect immediately and are prorated." },
  { q: "Is there a free trial?", a: "Most plans include a free trial period. No credit card is required to get started." },
  { q: "What currencies are supported?", a: "Plans are billed in the currency shown on the plan card. Contact us if you need local pricing." },
  { q: "What happens when I reach my employee limit?", a: "You'll be prompted to upgrade to a higher plan. Your existing data is never deleted." },
];

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
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: PRICING_FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
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
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [currentPlanOrder, setCurrentPlanOrder] = useState<number>(-1);
  const [hasActiveSub, setHasActiveSub] = useState<boolean>(false);

  const startTrialFn = useServerFn(startTrial);
  const getVisitorCurrencyFn = useServerFn(getVisitorCurrency);

  // Geo-based currency. Lets users override via toggle (stored in localStorage).
  const [showLocal, setShowLocal] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("pricing_show_local") !== "0";
  });
  const fx = useQuery({
    queryKey: ["visitor-currency"],
    queryFn: () => getVisitorCurrencyFn(),
    staleTime: 60 * 60 * 1000,
  });
  const visitor = fx.data;
  const useLocal = showLocal && !!visitor && visitor.currency !== "SAR" && visitor.rate > 0;
  const toggleShowLocal = () => {
    const next = !showLocal;
    setShowLocal(next);
    if (typeof window !== "undefined") localStorage.setItem("pricing_show_local", next ? "1" : "0");
  };

  useEffect(() => {
    supabase.from("plans").select("*").eq("is_visible", true).eq("status", "active").order("sort_order")
      .then(({ data }) => {
        const list = (data as unknown as Plan[]) || [];
        setPlans(list);
        setLoading(false);
        // After plans load, look up the user's current subscription so we
        // can swap "Try free" CTAs to "Current plan" / "Upgrade".
        if (organizationId) {
          supabase.from("subscriptions").select("plan_id,status")
            .eq("organization_id", organizationId)
            .order("created_at", { ascending: false })
            .limit(1).maybeSingle()
            .then(({ data: sub }) => {
              if (sub?.plan_id) {
                setCurrentPlanId(sub.plan_id);
                setCurrentPlanOrder(list.find((p) => p.id === sub.plan_id)?.sort_order ?? -1);
                setHasActiveSub(sub.status === "active" || sub.status === "trial" || sub.status === "trial_ending");
              }
            });
        }
      });
  }, [organizationId]);

  async function handleTrialClick(plan: Plan) {
    // Already subscribed → don't restart a trial. Route to checkout or
    // upgrade page depending on direction.
    if (hasActiveSub && currentPlanId) {
      if (plan.id === currentPlanId) {
        window.location.href = "/app/billing";
        return;
      }
      const price = billing === "annual" ? plan.annual_price : plan.monthly_price;
      const qs = new URLSearchParams({
        product: plan.slug,
        amount: String(price),
        title: `${plan.name} — ${billing === "annual" ? t("billing_annual") : t("billing_monthly")}`,
      }).toString();
      window.location.href = `/checkout?${qs}`;
      return;
    }
    // Not signed in → take to signup with the chosen plan, then start trial after auth.
    if (!user) {
      const qs = new URLSearchParams({ plan: plan.slug, cycle: billing }).toString();
      window.location.href = `/auth?${qs}`;
      return;
    }
    setCheckingOut(plan.id);
    try {
      const { getPaymentMode } = await import("@/lib/payment-mode.functions");
      const { mode } = await getPaymentMode();
      const env = mode === "live" ? "live" : "sandbox";
      await startTrialFn({
        data: { planSlug: plan.slug, cycle: billing, environment: env },
      });
      toast.success(t("trial_activate_cta"));
      window.location.href = "/app/billing";
    } catch (e: any) {
      toast.error(e?.message || "Couldn't start trial");
      setCheckingOut(null);
    }
  }

  function ctaLabelFor(plan: Plan): string {
    if (hasActiveSub && currentPlanId) {
      if (plan.id === currentPlanId) return t("upgrade_current_label");
      if (plan.sort_order > currentPlanOrder) return t("upgrade_to_plan").replace("{plan}", plan.name);
      return t("downgrade_to_plan").replace("{plan}", plan.name);
    }
    return t("try_free_for_days").replace("{n}", String(plan.trial_days || 14));
  }


  // Currencies that conventionally show no fractional digits.
  const noDecimal = (c: string) => ["JPY", "KRW", "VND", "CLP"].includes(c);
  const formatMoney = (amount: number, currency: string) => {
    const digits = noDecimal(currency) ? 0 : 0; // we round to whole units for display
    try {
      return new Intl.NumberFormat(ar ? "ar" : "en", {
        style: "currency", currency, maximumFractionDigits: digits, minimumFractionDigits: digits,
      }).format(amount);
    } catch {
      return `${currency} ${Math.round(amount).toLocaleString()}`;
    }
  };
  const priceFor = (plan: Plan) => billing === "annual" ? plan.annual_price : plan.monthly_price;
  const renderPrimary = (plan: Plan) => {
    const sar = priceFor(plan);
    if (useLocal && visitor) {
      return formatMoney(Math.round(sar * visitor.rate), visitor.currency);
    }
    return formatMoney(sar, plan.currency || "SAR");
  };
  const renderSecondary = (plan: Plan) => {
    const sar = priceFor(plan);
    // Always remind users SAR is the billing currency when showing local.
    return `${t("approx_symbol")} ${formatMoney(sar, plan.currency || "SAR")} · ${t("billed_in_sar")}`;
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
                      disabled={checkingOut === plan.id || (hasActiveSub && plan.id === currentPlanId)}
                      onClick={() => handleTrialClick(plan)}
                    >
                      {checkingOut === plan.id ? "…" : ctaLabelFor(plan)}
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
