import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { getCurrentSubscription, getCustomerPortalUrl } from "@/lib/billing.functions";
import { getPaddleEnvironment } from "@/lib/paddle";
import { getOrgUsage, type OrgUsage } from "@/lib/quota";
import { useTrialStatus } from "@/lib/use-trial-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { toast } from "sonner";
import { ExternalLink, Sparkles, Clock, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/app/billing")({
  component: BillingPage,
});

function BillingPage() {
  const { t } = useI18n();
  const { organizationId } = useAuth();
  const trial = useTrialStatus();
  const getSub = useServerFn(getCurrentSubscription);
  const getPortal = useServerFn(getCustomerPortalUrl);

  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<any>(null);
  const [usage, setUsage] = useState<OrgUsage | null>(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!organizationId) return;
    const env = getPaddleEnvironment();
    Promise.all([
      getSub({ data: { organizationId, environment: env } }),
      getOrgUsage(organizationId),
    ]).then(([res, u]) => {
      setSub(res.subscription);
      setUsage(u);
      setLoading(false);
    });
  }, [organizationId]);

  async function openPortal() {
    if (!sub?.id) return;
    try {
      setOpening(true);
      const { url } = await getPortal({ data: { subscriptionId: sub.id, environment: getPaddleEnvironment() } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e?.message || "Couldn't open portal");
    } finally {
      setOpening(false);
    }
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <PaymentTestModeBanner />
      <div>
        <h1 className="text-2xl font-semibold">{t("billing_title")}</h1>
        <p className="text-sm text-muted-foreground">{t("billing_sub")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("billing_current_plan")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!sub || !sub.paddle_subscription_id ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("billing_no_subscription")}</p>
              <Button asChild>
                <Link to="/pricing">{t("billing_choose_plan")}</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="text-xl font-semibold">{sub.plan?.name ?? "—"}</div>
                <Badge variant={sub.status === "active" ? "default" : "secondary"}>{sub.status}</Badge>
                {sub.cancel_at_period_end && <Badge variant="outline">{t("billing_cancels_on")} {sub.end_at ? new Date(sub.end_at).toLocaleDateString() : "—"}</Badge>}
              </div>

              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <Stat label={t("billing_cycle")} value={sub.billing_cycle === "annual" ? t("billing_annual") : t("billing_monthly")} />
                <Stat label={t("billing_renews_on")} value={sub.renewal_at ? new Date(sub.renewal_at).toLocaleDateString() : "—"} />
                {usage && <Stat label={t("billing_seats_used")} value={`${usage.usersCount} / ${usage.maxUsers}`} progress={usage.usersCount/Math.max(usage.maxUsers,1)*100} />}
                {usage && <Stat label={t("billing_employees_used")} value={`${usage.employeesCount} / ${usage.maxEmployees}`} progress={usage.employeesCount/Math.max(usage.maxEmployees,1)*100} />}
              </dl>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" onClick={openPortal} disabled={opening}>
                  {opening ? "…" : t("billing_change_plan")} <ExternalLink className="w-3.5 h-3.5 ms-1" />
                </Button>
                <Button variant="ghost" onClick={openPortal} disabled={opening}>
                  {t("billing_cancel")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, progress }: { label: string; value: string; progress?: number }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium mt-0.5">{value}</dd>
      {typeof progress === "number" && <Progress value={Math.min(progress, 100)} className="h-1 mt-2" />}
    </div>
  );
}
