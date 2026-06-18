import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { getCurrentSubscription, getCustomerPortalUrl } from "@/lib/billing.functions";
import { getPaddleEnvironment } from "@/lib/paddle";
import { getOrgUsage, type OrgUsage } from "@/lib/quota";
import { useTrialStatus } from "@/lib/use-trial-status";
import { getInvoiceDownloadUrl, listMyInvoices, getDefaultPaymentMethod } from "@/lib/invoice.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { toast } from "sonner";
import { ExternalLink, Sparkles, Clock, AlertTriangle, Download, CreditCard } from "lucide-react";

export const Route = createFileRoute("/app/billing")({
  component: BillingPage,
});

function BillingPage() {
  const { t } = useI18n();
  const { organizationId } = useAuth();
  const trial = useTrialStatus();
  const getSub = useServerFn(getCurrentSubscription);
  const getPortal = useServerFn(getCustomerPortalUrl);
  const listInvoices = useServerFn(listMyInvoices);
  const getMethod = useServerFn(getDefaultPaymentMethod);
  const getDownload = useServerFn(getInvoiceDownloadUrl);

  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<any>(null);
  const [usage, setUsage] = useState<OrgUsage | null>(null);
  const [opening, setOpening] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [method, setMethod] = useState<any>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) return;
    const env = getPaddleEnvironment();
    Promise.all([
      getSub({ data: { organizationId, environment: env } }),
      getOrgUsage(organizationId),
      listInvoices(),
      getMethod(),
    ]).then(([res, u, inv, m]) => {
      setSub(res.subscription);
      setUsage(u);
      setInvoices(inv.invoices ?? []);
      setMethod(m.method);
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

  async function handleDownload(orderId: string) {
    try {
      setDownloadingId(orderId);
      const { url } = await getDownload({ data: { orderId } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e?.message || "Couldn't download invoice");
    } finally {
      setDownloadingId(null);
    }
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const isActive = sub?.status === "active";

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PaymentTestModeBanner />
      <div>
        <h1 className="text-2xl font-semibold">{t("billing_title")}</h1>
        <p className="text-sm text-muted-foreground">{t("billing_sub")}</p>
      </div>

      {trial.status !== "active" && trial.status !== "none" && (
        <TrialStatusCard trial={trial} />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("billing_current_plan")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!sub ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("billing_no_subscription")}</p>
              <Button asChild>
                <Link to="/pricing">{t("billing_choose_plan")}</Link>
              </Button>
            </div>
          ) : !isActive ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="text-xl font-semibold">{sub.plan?.name ?? "—"}</div>
                <Badge variant="secondary" className="capitalize">{sub.status}</Badge>
              </div>

              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <Stat label={t("billing_cycle")} value={sub.billing_cycle === "annual" ? t("billing_annual") : t("billing_monthly")} />
                <Stat label={t("billing_trial_amount")} value={`${sub.plan?.currency ?? ""} ${Number(sub.amount ?? 0).toLocaleString()}`} />
                {sub.trial_end_at && <Stat label={t("billing_trial_ends_on")} value={new Date(sub.trial_end_at).toLocaleDateString()} />}
                {usage && <Stat label={t("billing_seats_used")} value={`${usage.usersCount} / ${usage.maxUsers}`} progress={usage.usersCount/Math.max(usage.maxUsers,1)*100} />}
              </dl>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild size="lg">
                  <Link
                    to="/checkout"
                    search={{
                      product: sub.plan?.slug ?? sub.plan?.name ?? "plan",
                      amount: Number(sub.amount ?? 0),
                      title: `${sub.plan?.name ?? "Plan"} — ${sub.billing_cycle === "annual" ? t("billing_annual") : t("billing_monthly")}`,
                    }}
                  >
                    {t("billing_pay_now_activate")}
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/pricing">{t("billing_change_plan_link")}</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="text-xl font-semibold">{sub.plan?.name ?? "—"}</div>
                <Badge variant="default">{t("billing_status_active")}</Badge>
                {sub.cancel_at_period_end && <Badge variant="outline">{t("billing_cancels_on")} {sub.end_at ? new Date(sub.end_at).toLocaleDateString() : "—"}</Badge>}
              </div>

              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <Stat label={t("billing_cycle")} value={sub.billing_cycle === "annual" ? t("billing_annual") : t("billing_monthly")} />
                <Stat label={t("billing_renews_on")} value={sub.renewal_at ? new Date(sub.renewal_at).toLocaleDateString() : "—"} />
                {usage && <Stat label={t("billing_seats_used")} value={`${usage.usersCount} / ${usage.maxUsers}`} progress={usage.usersCount/Math.max(usage.maxUsers,1)*100} />}
                {usage && <Stat label={t("billing_employees_used")} value={`${usage.employeesCount} / ${usage.maxEmployees}`} progress={usage.employeesCount/Math.max(usage.maxEmployees,1)*100} />}
              </dl>

              {method && (
                <div className="flex items-center gap-3 rounded-md border p-3 text-sm bg-muted/30">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">{t("billing_card_on_file")}</div>
                    <div className="text-muted-foreground text-xs">
                      {(method.brand || "Card").toUpperCase()} •••• {method.last4 ?? "----"}
                      {method.exp_month && method.exp_year ? `  ·  ${String(method.exp_month).padStart(2, "0")}/${method.exp_year}` : ""}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild variant="outline">
                  <Link to="/pricing">{t("billing_change_plan")}</Link>
                </Button>
                <Button variant="ghost" onClick={openPortal} disabled={opening}>
                  {opening ? "…" : t("billing_cancel")} <ExternalLink className="w-3.5 h-3.5 ms-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("billing_invoice_history")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr className="border-b">
                    <th className="text-start py-2 font-medium">{t("billing_invoice_number")}</th>
                    <th className="text-start py-2 font-medium">{t("billing_invoice_date")}</th>
                    <th className="text-start py-2 font-medium">{t("billing_invoice_amount")}</th>
                    <th className="text-start py-2 font-medium">{t("billing_invoice_status")}</th>
                    <th className="text-end py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b last:border-0">
                      <td className="py-3 font-mono text-xs">{inv.invoice_number}</td>
                      <td className="py-3">{inv.invoice_issued_at ? new Date(inv.invoice_issued_at).toLocaleDateString() : "—"}</td>
                      <td className="py-3 font-medium">{(inv.currency ?? "SAR")} {Number(inv.paid_amount ?? inv.amount ?? 0).toFixed(2)}</td>
                      <td className="py-3">
                        <Badge variant={inv.status === "paid" ? "default" : "secondary"} className="capitalize">{inv.status}</Badge>
                      </td>
                      <td className="py-3 text-end">
                        <Button size="sm" variant="ghost" onClick={() => handleDownload(inv.id)} disabled={downloadingId === inv.id}>
                          <Download className="w-3.5 h-3.5 me-1" />
                          {downloadingId === inv.id ? "…" : t("billing_invoice_download")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
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

function TrialStatusCard({ trial }: { trial: ReturnType<typeof useTrialStatus> }) {
  const { t } = useI18n();
  const isWarning = trial.status === "trial_ending" || trial.status === "grace";
  const isBlocked = trial.status === "restricted" || trial.status === "dormant" || trial.status === "canceled";
  const Icon = isBlocked ? AlertTriangle : isWarning ? Clock : Sparkles;
  const tone = isBlocked ? "border-red-500/40 bg-red-500/5" : isWarning ? "border-amber-500/40 bg-amber-500/5" : "border-primary/30 bg-primary/5";
  const label =
    trial.status === "trial" ? t("billing_trial_active") :
    trial.status === "trial_ending" ? t("trial_ending_soon").replace("{n}", String(Math.max(trial.daysLeft, 0))) :
    trial.status === "grace" ? t("trial_grace_msg") :
    trial.status === "restricted" ? t("trial_restricted_msg") :
    trial.status === "dormant" ? t("trial_dormant_msg") :
    t("trial_canceled_msg");

  return (
    <Card className={tone}>
      <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex items-center gap-3 flex-1">
          <Icon className="w-5 h-5 shrink-0" />
          <div>
            <div className="text-sm font-medium">{label}</div>
            {trial.trialEndAt && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {t("billing_trial_ends_on")}: {new Date(trial.trialEndAt).toLocaleDateString()}
                {trial.planName ? ` · ${trial.planName}` : ""}
              </div>
            )}
          </div>
        </div>
        <Button asChild size="lg" className="shrink-0">
          <Link to="/pricing">{t("billing_activate_now")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
