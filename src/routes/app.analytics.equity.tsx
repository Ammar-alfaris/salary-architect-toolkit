import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { analyzeEquity, type EquityFlagType } from "@/lib/equity";
import { fmtCurrency, fmtPercent, fmtNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportCSV } from "@/lib/comp";
import { logAudit } from "@/lib/audit";
import { Download, ShieldAlert, Flag, Save } from "lucide-react";
import { toast } from "sonner";
import { WhyThisMatters } from "@/components/insight-card";

export const Route = createFileRoute("/app/analytics/equity")({ component: EquityAnalytics });

const FLAG_TONES: Record<EquityFlagType, string> = {
  outlier_high: "bg-warning/15 text-warning-foreground ring-warning/30",
  outlier_low: "bg-warning/15 text-warning-foreground ring-warning/30",
  compression: "bg-destructive/10 text-destructive ring-destructive/30",
  inversion: "bg-destructive/10 text-destructive ring-destructive/30",
  small_cohort: "bg-muted text-muted-foreground ring-border",
};

function EquityAnalytics() {
  const { organizationId, defaultCurrency } = useAuth();
  const { t, locale } = useI18n();
  const [employees, setEmployees] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [threshold, setThreshold] = useState(15);
  const [familyFilter, setFamilyFilter] = useState<string>("__all__");
  const [flagFilter, setFlagFilter] = useState<string>("__all__");
  const [persisting, setPersisting] = useState(false);

  useEffect(() => {
    if (!organizationId) return;
    Promise.all([
      supabase.from("employees").select("*").eq("organization_id", organizationId).eq("archived", false),
      supabase.from("salary_grades").select("*"),
    ]).then(([e, g]) => {
      setEmployees(e.data ?? []);
      setGrades(g.data ?? []);
    });
  }, [organizationId]);

  const families = useMemo(
    () => Array.from(new Set(employees.map((e: any) => e.job_family).filter(Boolean))).sort(),
    [employees],
  );

  const { rows, cohorts } = useMemo(
    () => analyzeEquity({ employees, grades, outlierThreshold: threshold }),
    [employees, grades, threshold],
  );

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (familyFilter !== "__all__" && r.employee.job_family !== familyFilter) return false;
      if (flagFilter !== "__all__") {
        if (flagFilter === "any" && !r.flag) return false;
        if (flagFilter !== "any" && r.flag !== flagFilter) return false;
      }
      return true;
    });
  }, [rows, familyFilter, flagFilter]);

  const stats = useMemo(() => {
    const flagged = rows.filter((r) => r.flag && r.flag !== "small_cohort").length;
    const noFamily = employees.filter((e: any) => !e.job_family).length;
    return {
      analyzed: rows.length,
      cohorts: cohorts.length,
      flagged,
      coverage: employees.length ? ((employees.length - noFamily) / employees.length) * 100 : 0,
    };
  }, [rows, cohorts, employees]);

  const persistFlags = async () => {
    if (!organizationId) return;
    const flaggable = rows.filter((r) => r.flag && r.flag !== "small_cohort");
    if (!flaggable.length) {
      toast.info(t("equity_no_flags"));
      return;
    }
    setPersisting(true);
    const inserts = flaggable.map((r) => ({
      organization_id: organizationId,
      employee_id: r.employee.id,
      job_family: r.employee.job_family,
      grade_id: r.employee.grade_id,
      flag_type: r.flag!,
      variance_percent: Number(r.variancePct.toFixed(2)),
      peer_median: r.peerMedian,
      status: "open",
    }));
    const { error } = await supabase.from("equity_review_flags").insert(inserts);
    setPersisting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit({
      organizationId,
      action: "create",
      entityType: "organization",
      entityLabel: "equity_flags",
      metadata: { count: inserts.length, threshold },
    });
    toast.success(t("equity_flags_saved", { n: inserts.length }));
  };

  const exportRows = () =>
    exportCSV(
      "pay-equity.csv",
      filteredRows.map((r) => ({
        employee: r.employee.full_name,
        department: r.employee.department,
        job_family: r.employee.job_family,
        cohort: r.cohortKey,
        cohort_size: r.cohortSize,
        peer_median: r.peerMedian,
        base_salary: r.employee.base_salary,
        variance_pct: r.variancePct.toFixed(2),
        flag: r.flag ?? "",
      })),
    );

  return (
    <div>
      <PageHeader
        title={t("pay_equity")}
        subtitle={t("pay_equity_subtitle")}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportRows}>
              <Download className="w-4 h-4 me-1" />
              {t("export_csv")}
            </Button>
            <Button size="sm" onClick={persistFlags} disabled={persisting}>
              <Save className="w-4 h-4 me-1" />
              {t("equity_save_flags")}
            </Button>
          </>
        }
      />

      <div className="p-4 md:p-6 space-y-4">
        <div className="border rounded-lg bg-card p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <Field label={t("equity_threshold")}>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="1"
                value={threshold}
                onChange={(e) => setThreshold(Math.max(1, +e.target.value || 0))}
                className="h-9"
              />
              <span className="text-sm">%</span>
            </div>
          </Field>
          <Field label={t("job_family")}>
            <Select value={familyFilter} onValueChange={setFamilyFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("all")}</SelectItem>
                {families.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("flag_filter")}>
            <Select value={flagFilter} onValueChange={setFlagFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("all")}</SelectItem>
                <SelectItem value="any">{t("flag_any")}</SelectItem>
                <SelectItem value="outlier_high">{t("flag_outlier_high")}</SelectItem>
                <SelectItem value="outlier_low">{t("flag_outlier_low")}</SelectItem>
                <SelectItem value="compression">{t("flag_compression")}</SelectItem>
                <SelectItem value="inversion">{t("flag_inversion")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("equity_coverage")}>
            <div className="h-9 flex items-center text-sm num">{fmtPercent(stats.coverage, locale)}</div>
          </Field>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label={t("equity_analyzed")} value={fmtNumber(stats.analyzed, locale)} />
          <Kpi label={t("equity_cohorts")} value={fmtNumber(stats.cohorts, locale)} />
          <Kpi label={t("equity_flagged")} value={fmtNumber(stats.flagged, locale)} tone={stats.flagged > 0 ? "warn" : "ok"} />
          <Kpi label={t("equity_threshold_short")} value={`±${threshold}%`} />
        </div>

        {stats.coverage < 100 && (
          <WhyThisMatters>{t("equity_coverage_note")}</WhyThisMatters>
        )}

        <div className="border rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">{t("equity_cohorts_summary")}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-start px-4 py-2.5">{t("job_family")}</th>
                  <th className="text-start px-4 py-2.5">{t("grade")}</th>
                  <th className="text-end px-4 py-2.5">{t("cohort_size")}</th>
                  <th className="text-end px-4 py-2.5">{t("peer_median")}</th>
                  <th className="text-end px-4 py-2.5">{t("equity_spread")}</th>
                  <th className="text-end px-4 py-2.5">{t("equity_outliers")}</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-sm text-muted-foreground py-8">{t("equity_no_cohorts")}</td></tr>
                ) : cohorts.map((c) => (
                  <tr key={c.key} className="border-t">
                    <td className="px-4 py-2 font-medium">{c.jobFamily}</td>
                    <td className="px-4 py-2 text-muted-foreground">{c.gradeCode}</td>
                    <td className="px-4 py-2 text-end num">{c.size}</td>
                    <td className="px-4 py-2 text-end num">{fmtCurrency(c.median, defaultCurrency, locale)}</td>
                    <td className="px-4 py-2 text-end num">{fmtPercent(c.spreadPct, locale)}</td>
                    <td className="px-4 py-2 text-end num">
                      {c.outlierCount > 0
                        ? <span className="text-warning-foreground font-medium">{c.outlierCount}</span>
                        : <span className="text-muted-foreground">0</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <Flag className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">{t("equity_employee_table")}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-start px-4 py-2.5">{t("name")}</th>
                  <th className="text-start px-4 py-2.5">{t("job_family")}</th>
                  <th className="text-start px-4 py-2.5">{t("department")}</th>
                  <th className="text-end px-4 py-2.5">{t("base_salary")}</th>
                  <th className="text-end px-4 py-2.5">{t("peer_median")}</th>
                  <th className="text-end px-4 py-2.5">{t("variance")}</th>
                  <th className="text-end px-4 py-2.5">{t("flag")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-sm text-muted-foreground py-8">{t("equity_no_rows")}</td></tr>
                ) : filteredRows.map((r) => (
                  <tr key={r.employee.id} className="border-t">
                    <td className="px-4 py-2 font-medium">{r.employee.full_name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.employee.job_family ?? "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.employee.department ?? "—"}</td>
                    <td className="px-4 py-2 text-end num">{fmtCurrency(Number(r.employee.base_salary), defaultCurrency, locale)}</td>
                    <td className="px-4 py-2 text-end num">{fmtCurrency(r.peerMedian, defaultCurrency, locale)}</td>
                    <td className={`px-4 py-2 text-end num ${Math.abs(r.variancePct) >= threshold ? "text-warning-foreground font-medium" : ""}`}>
                      {r.variancePct >= 0 ? "+" : ""}{r.variancePct.toFixed(1)}%
                    </td>
                    <td className="px-4 py-2 text-end">
                      {r.flag ? (
                        <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 ${FLAG_TONES[r.flag]}`}>
                          {t(`flag_${r.flag}`)}
                        </span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      {children}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" | "risk" }) {
  const color = tone === "risk" ? "text-destructive" : tone === "warn" ? "text-warning-foreground" : tone === "ok" ? "text-success" : "";
  return (
    <div className="border rounded-lg bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-semibold num mt-1 ${color}`}>{value}</div>
    </div>
  );
}
