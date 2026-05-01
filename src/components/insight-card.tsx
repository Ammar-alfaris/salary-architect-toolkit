import { AlertTriangle, CheckCircle2, Info, ShieldAlert, HelpCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { InsightItem, InsightTone } from "@/lib/insights";

const toneStyles: Record<InsightTone, { bg: string; ring: string; icon: typeof Info; iconColor: string }> = {
  info: { bg: "bg-muted/40", ring: "ring-border", icon: Info, iconColor: "text-muted-foreground" },
  ok: { bg: "bg-success/10", ring: "ring-success/30", icon: CheckCircle2, iconColor: "text-success" },
  warn: { bg: "bg-warning/10", ring: "ring-warning/30", icon: AlertTriangle, iconColor: "text-warning-foreground" },
  risk: { bg: "bg-destructive/10", ring: "ring-destructive/30", icon: ShieldAlert, iconColor: "text-destructive" },
};

export function InsightCard({ items, title }: { items: InsightItem[]; title?: string }) {
  const { t } = useI18n();
  if (!items.length) return null;

  return (
    <div className="border rounded-lg bg-card p-4 md:p-5">
      <div className="flex items-center gap-2 mb-3">
        <HelpCircle className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">{title ?? t("decision_support")}</h3>
      </div>
      <ul className="space-y-2.5">
        {items.map((item, i) => {
          const s = toneStyles[item.tone];
          const Icon = s.icon;
          return (
            <li
              key={i}
              className={`flex gap-3 rounded-md p-3 ring-1 ${s.bg} ${s.ring}`}
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${s.iconColor}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium leading-snug">{t(item.titleKey, item.vars)}</p>
                  {item.badgeKey && (
                    <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full ring-1 ${s.ring} ${s.iconColor}`}>
                      {t(item.badgeKey)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t(item.bodyKey, item.vars)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function WhyThisMatters({ children, title }: { children: React.ReactNode; title?: string }) {
  const { t } = useI18n();
  return (
    <div className="border-s-2 border-accent/60 bg-accent/5 ps-3 py-2 text-xs text-muted-foreground rounded-e">
      <p className="font-medium text-foreground/80 mb-0.5">{title ?? t("why_this_matters")}</p>
      <div>{children}</div>
    </div>
  );
}
