import { Link } from "@tanstack/react-router";
import { useTrialStatus } from "@/lib/use-trial-status";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { AlertTriangle, Clock, Sparkles } from "lucide-react";

export function TrialBanner() {
  const { t } = useI18n();
  const { status, daysLeft, loading } = useTrialStatus();

  if (loading) return null;
  if (status === "active" || status === "none") return null;

  const variants: Record<string, { bg: string; text: string; icon: React.ReactNode; msg: string; cta: string }> = {
    trial: {
      bg: "bg-primary/5 border-primary/20",
      text: "text-foreground",
      icon: <Sparkles className="w-4 h-4 text-primary" />,
      msg: t("trial_days_left").replace("{n}", String(Math.max(daysLeft, 0))),
      cta: t("trial_activate_cta"),
    },
    trial_ending: {
      bg: "bg-amber-500/10 border-amber-500/30",
      text: "text-amber-900 dark:text-amber-200",
      icon: <Clock className="w-4 h-4 text-amber-600" />,
      msg: t("trial_ending_soon").replace("{n}", String(Math.max(daysLeft, 0))),
      cta: t("trial_activate_cta"),
    },
    grace: {
      bg: "bg-orange-500/10 border-orange-500/30",
      text: "text-orange-900 dark:text-orange-200",
      icon: <AlertTriangle className="w-4 h-4 text-orange-600" />,
      msg: t("trial_grace_msg"),
      cta: t("trial_subscribe_now"),
    },
    restricted: {
      bg: "bg-red-500/10 border-red-500/30",
      text: "text-red-900 dark:text-red-200",
      icon: <AlertTriangle className="w-4 h-4 text-red-600" />,
      msg: t("trial_restricted_msg"),
      cta: t("trial_reactivate"),
    },
    dormant: {
      bg: "bg-red-500/15 border-red-500/40",
      text: "text-red-900 dark:text-red-200",
      icon: <AlertTriangle className="w-4 h-4 text-red-600" />,
      msg: t("trial_dormant_msg"),
      cta: t("trial_reactivate"),
    },
    canceled: {
      bg: "bg-muted border-border",
      text: "text-muted-foreground",
      icon: <AlertTriangle className="w-4 h-4" />,
      msg: t("trial_canceled_msg"),
      cta: t("trial_resubscribe"),
    },
  };

  const v = variants[status];
  if (!v) return null;

  return (
    <div className={`border-b ${v.bg} ${v.text}`}>
      <div className="container mx-auto px-4 py-2 flex items-center gap-3 text-sm">
        {v.icon}
        <span className="flex-1 truncate">{v.msg}</span>
        <Button asChild size="sm" variant="default" className="shrink-0 h-8">
          <Link to="/app/billing">{v.cta}</Link>
        </Button>
      </div>
    </div>
  );
}
