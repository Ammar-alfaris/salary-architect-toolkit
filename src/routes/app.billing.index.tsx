import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { getCurrentSubscription, cancelSubscriptionAtPeriodEnd, retryFailedPaymentNow } from "@/lib/billing.functions";
import { getOrgUsage, type OrgUsage } from "@/lib/quota";
import { useTrialStatus } from "@/lib/use-trial-status";
import { getInvoiceDownloadUrl, listMyInvoices, getDefaultPaymentMethod } from "@/lib/invoice.functions";
import { fmtDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { toast } from "sonner";
import { ExternalLink, Download, CreditCard, ArrowUpRight, AlertTriangle, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/app/billing/")({
  component: BillingPage,
});

function BillingPage() {
  const { t, locale } = useI18n();
  const { organizationId } = useAuth();
  const trial = useTrialStatus();
  const getSub = useServerFn(getCurrentSubscription);
  const cancelFn = useServerFn(cancelSubscriptionAtPeriodEnd);
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
    Promise.all([
      getSub({ data: { organizationId } }),
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
    if (!confirm(t("billing_cancel_confirm") || "Cancel your subscription at the end of the current period?")) return;
    try {
      setOpening(true);
      await cancelFn({ data: { subscriptionId: sub.id } });
      toast.success(t("billing_cancel_scheduled") || "Subscription will end at period close");
      setSub({ ...sub, cancel_at_period_end: true });
    } catch (e: any) {
      toast.error(e?.message || "Couldn't cancel");
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

      {/* NOTE: trial banner intentionally removed from this page — the
          primary "Pay now & activate" CTA below already covers it, and the
          old TrialStatusCard duplicated the same action with a different
          (wrong) destination. The global TrialBanner still shows on all
          other app pages. */}

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
                {sub.trial_end_at && <Stat label={t("billing_trial_ends_on")} value={fmtDate(sub.trial_end_at, locale)} ltr />}
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
                  <Link to="/app/billing/upgrade">
                    <ArrowUpRight className="w-4 h-4 me-1" />
                    {t("billing_upgrade_plan")}
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="text-xl font-semibold">{sub.plan?.name ?? "—"}</div>
                <Badge variant="default">{t("billing_status_active")}</Badge>
                {sub.cancel_at_period_end && <Badge variant="outline">{t("billing_cancels_on")} <span dir="ltr">{fmtDate(sub.end_at, locale)}</span></Badge>}
              </div>

              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <Stat label={t("billing_cycle")} value={sub.billing_cycle === "annual" ? t("billing_annual") : t("billing_monthly")} />
                <Stat label={t("billing_renews_on")} value={fmtDate(sub.renewal_at, locale)} ltr />
                {usage && <Stat label={t("billing_seats_used")} value={`${usage.usersCount} / ${usage.maxUsers}`} progress={usage.usersCount/Math.max(usage.maxUsers,1)*100} />}
                {usage && <Stat label={t("billing_employees_used")} value={`${usage.employeesCount} / ${usage.maxEmployees}`} progress={usage.employeesCount/Math.max(usage.maxEmployees,1)*100} />}
              </dl>

              {method && (
                <div className="flex items-center gap-3 rounded-md border p-3 text-sm bg-muted/30">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">{t("billing_card_on_file")}</div>
                    <div className="text-muted-foreground text-xs" dir="ltr">
                      {(method.brand || "Card").toUpperCase()} •••• {method.last4 ?? "----"}
                      {method.exp_month && method.exp_year ? `  ·  ${String(method.exp_month).padStart(2, "0")}/${method.exp_year}` : ""}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild>
                  <Link to="/app/billing/upgrade">
                    <ArrowUpRight className="w-4 h-4 me-1" />
                    {t("billing_upgrade_plan")}
                  </Link>
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
                      <td className="py-3 font-mono text-xs" dir="ltr">{inv.invoice_number}</td>
                      <td className="py-3"><span dir="ltr" className="tabular-nums">{fmtDate(inv.invoice_issued_at, locale)}</span></td>
                      <td className="py-3 font-medium tabular-nums" dir="ltr">{(inv.currency ?? "SAR")} {Number(inv.paid_amount ?? inv.amount ?? 0).toFixed(2)}</td>
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

function Stat({ label, value, progress, ltr }: { label: string; value: string; progress?: number; ltr?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium mt-0.5" {...(ltr ? { dir: "ltr" as const, style: { unicodeBidi: "isolate" } } : {})}>{value}</dd>
      {typeof progress === "number" && <Progress value={Math.min(progress, 100)} className="h-1 mt-2" />}
    </div>
  );
}
