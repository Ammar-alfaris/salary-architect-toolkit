import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useOnboarding } from "@/lib/onboarding";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Building2, Layers, Users, TrendingUp, ArrowRight } from "lucide-react";
import type { TourGoal } from "@/lib/tours";

export const Route = createFileRoute("/app/onboarding")({ component: OnboardingPage });

const GOAL_ROUTE: Record<TourGoal, string> = {
  new_company: "/app/structures",
  existing_structure: "/app/employees",
  employees_only: "/app/employees",
  cycles_only: "/app/merit",
};

function OnboardingPage() {
  const { setGoal } = useOnboarding();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<TourGoal | null>(null);

  const choose = async (g: TourGoal) => {
    setBusy(g);
    await setGoal(g);
    navigate({ to: GOAL_ROUTE[g] as any });
  };

  const options: { id: TourGoal; icon: any; titleKey: string; descKey: string }[] = [
    { id: "new_company", icon: Building2, titleKey: "goal_new_company", descKey: "goal_new_company_desc" },
    { id: "existing_structure", icon: Layers, titleKey: "goal_existing_structure", descKey: "goal_existing_structure_desc" },
    { id: "employees_only", icon: Users, titleKey: "goal_employees_only", descKey: "goal_employees_only_desc" },
    { id: "cycles_only", icon: TrendingUp, titleKey: "goal_cycles_only", descKey: "goal_cycles_only_desc" },
  ];

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full mb-4">
          <Sparkles className="w-3.5 h-3.5" /> {t("welcome")}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-3">{t("onboarding_title")}</h1>
        <p className="text-muted-foreground">{t("onboarding_subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {options.map((o) => (
          <Card
            key={o.id}
            onClick={() => !busy && choose(o.id)}
            className={`p-5 cursor-pointer hover:border-primary hover:shadow-md transition group ${busy === o.id ? "opacity-50" : ""}`}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <o.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold mb-1 flex items-center gap-2">
                  {t(o.titleKey)}
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition rtl:rotate-180" />
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(o.descKey)}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="text-center mt-8">
        <Button variant="ghost" size="sm" onClick={() => { navigate({ to: "/app" }); }}>
          {t("skip_for_now")}
        </Button>
      </div>
    </div>
  );
}
