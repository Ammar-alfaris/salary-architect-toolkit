import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { getCurrentSubscription } from "@/lib/billing.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Check, ArrowLeft, Users, UserCheck, Headphones, Sparkles, Star } from "lucide-react";

export const Route = createFileRoute("/app/billing/upgrade")({
  component: UpgradePage,
  head: () => ({
    meta: [
      { title: "Upgrade plan — Total Reward" },
      { name: "robots", content: "noindex" },
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
  is_recommended: boolean;
  sort_order: number;
  support_tier: "email" | "priority" | "dedicated";
  onboarding_type: "self_serve" | "guided" | "custom";
}

function UpgradePage() {
  const { t, locale } = useI18n();
  const { organizationId } = useAuth();
  const ar = locale === "ar";
  const navigate = useNavigate();
  const getSub = useServerFn(getCurrentSubscription);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  useEffect(() => {
    (async () => {
      const [{ data: plansData }, subRes] = await Promise.all([
        supabase.from("plans").select("*").eq("is_visible", true).eq("status", "active").order("sort_order"),
        organizationId ? getSub({ data: { organizationId } }) : Promise.resolve({ subscription: null } as any),
      ]);
      setPlans((plansData as unknown as Plan[]) || []);
      setSub(subRes?.subscription ?? null);
      if (subRes?.subscription?.billing_cycle === "annual") setBilling("annual");
      setLoading(false);
    })();
  }, [organizationId]);

  const currentPlanId = sub?.plan_id ?? sub?.plan?.id ?? null;
  const currentOrder = plans.find((p) => p.id === currentPlanId)?.sort_order ?? -1;

  const supportLabel = (tier: Plan["support_tier"]) =>
    tier === "dedicated" ? t("support_tier_dedicated") :
    tier === "priority" ? t("support_tier_priority") :
    t("support_tier_email");

  const onboardingLabel = (ob: Plan["onboarding_type"]) =>
    ob === "custom" ? t("onboarding_custom") :
    ob === "guided" ? t("onboarding_guided") :
    t("onboarding_self_serve");

  function actionFor(plan: Plan): { label: string; intent: "current" | "upgrade" | "downgrade" | "contact" } {
    if (plan.slug === "enterprise") return { label: t("contact_sales"), intent: "contact" };
    if (plan.id === currentPlanId) return { label: t("upgrade_current_label"), intent: "current" };
    if (plan.sort_order > currentOrder) return { label: t("upgrade_to_plan").replace("{plan}", plan.name), intent: "upgrade" };
    return { label: t("downgrade_to_plan").replace("{plan}", plan.name), intent: "downgrade" };
  }

  function onChoose(plan: Plan, intent: "upgrade" | "downgrade") {
    const price = billing === "annual" ? plan.annual_price : plan.monthly_price;
    navigate({
      to: "/checkout",
      search: {
        product: plan.slug,
        amount: price,
        title: `${plan.name} — ${billing === "annual" ? t("billing_annual") : t("billing_monthly")}${intent === "downgrade" ? ` (${t("downgrade_label")})` : ""}`,
      },
    });
  }

  return (
    <div className="p-4 md:p-6 space-y-6" dir={ar ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link to="/app/billing" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className={cn("w-3.5 h-3.5", ar && "rotate-180")} />
            {t("billing_back_to_billing")}
          </Link>
          <h1 className="text-2xl font-semibold mt-1">{t("upgrade_page_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("upgrade_page_sub")}</p>
        </div>
        <div className="inline-flex items-center gap-1 p-1 rounded-full border bg-muted text-sm">
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
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <Card key={i} className="p-6 space-y-3">
              <Skeleton className="h-5 w-1/2" /><Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-4 w-full" /><Skeleton className="h-10 w-full mt-4" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const action = actionFor(plan);
            const isCurrent = action.intent === "current";
            const isUpgrade = action.intent === "upgrade";
            const price = billing === "annual" ? plan.annual_price : plan.monthly_price;
            return (
              <Card key={plan.id} className={cn(
                "relative flex flex-col p-6 transition-all",
                isCurrent && "border-primary ring-2 ring-primary/30",
                isUpgrade && plan.is_recommended && "border-accent",
              )}>
                {isCurrent && (
                  <div className="absolute -top-3 left-0 right-0 flex justify-center">
                    <Badge className="bg-primary text-primary-foreground shadow">
                      <Star className="w-3 h-3 me-1" />
                      {t("upgrade_current_badge")}
                    </Badge>
                  </div>
                )}
                {!isCurrent && plan.is_recommended && (
                  <div className="absolute -top-3 left-0 right-0 flex justify-center">
                    <Badge className="bg-accent text-accent-foreground">{t("plan_recommended")}</Badge>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  {plan.description && <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>}
                </div>
                <div className="my-5">
                  <div className="flex items-end gap-1.5" dir="ltr">
                    <span className="text-3xl font-bold tabular-nums">{plan.currency} {price.toLocaleString()}</span>
                    <span className="text-muted-foreground text-xs mb-1.5">
                      {billing === "annual" ? t("per_year") : t("per_month")}
                    </span>
                  </div>
                </div>
                <CardContent className="p-0 flex-1 space-y-2.5 border-t pt-4 text-sm">
                  <Row icon={<Users className="w-4 h-4" />} label={t("plan_users").replace("{n}", String(plan.max_users))} />
                  <Row icon={<UserCheck className="w-4 h-4" />} label={t("plan_employees").replace("{n}", plan.max_employees.toLocaleString())} />
                  <Row icon={<Headphones className="w-4 h-4" />} label={`${t("support_tier_label")}: ${supportLabel(plan.support_tier)}`} />
                  <Row icon={<Sparkles className="w-4 h-4" />} label={`${t("onboarding_label")}: ${onboardingLabel(plan.onboarding_type)}`} />
                </CardContent>

                <div className="mt-5">
                  {action.intent === "current" ? (
                    <Button disabled className="w-full" variant="outline">
                      <Check className="w-4 h-4 me-1" />{action.label}
                    </Button>
                  ) : action.intent === "contact" ? (
                    <Button asChild className="w-full" variant="outline">
                      <Link to="/contact">{action.label}</Link>
                    </Button>
                  ) : (
                    <Button
                      onClick={() => onChoose(plan, action.intent as "upgrade" | "downgrade")}
                      className="w-full"
                      variant={action.intent === "upgrade" ? "default" : "outline"}
                    >
                      {action.label}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
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
