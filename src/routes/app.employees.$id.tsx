import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { calculateBonus, compaRatio, rangePenetration, rangePosition, calculateAllowances } from "@/lib/comp";
import { fmtCurrency, fmtPercent } from "@/lib/format";
import { employeeInsights } from "@/lib/insights";
import { InsightCard } from "@/components/insight-card";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/app/employees/$id")({ component: EmployeeProfile });

function EmployeeProfile() {
  const { id } = Route.useParams();
  const { t, locale } = useI18n();
  const [emp, setEmp] = useState<any>(null);
  const [grade, setGrade] = useState<any>(null);
  const [peers, setPeers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: e } = await supabase.from("employees").select("*").eq("id", id).maybeSingle();
      setEmp(e);
      if (e?.grade_id) {
        const { data: g } = await supabase.from("salary_grades").select("*").eq("id", e.grade_id).maybeSingle();
        setGrade(g);
        const { data: p } = await supabase
          .from("employees")
          .select("id, base_salary")
          .eq("organization_id", e.organization_id)
          .eq("grade_id", e.grade_id)
          .eq("archived", false)
          .neq("id", e.id);
        setPeers(p ?? []);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">{t("loading")}</div>;
  if (!emp) return <div className="p-6">{t("not_found_short")}</div>;

  const compa = grade ? compaRatio(Number(emp.base_salary), Number(grade.midpoint)) : 0;
  const penet = grade ? rangePenetration(Number(emp.base_salary), Number(grade.minimum), Number(grade.maximum)) : 0;
  const pos = grade ? rangePosition(Number(emp.base_salary), Number(grade.minimum), Number(grade.maximum)) : "in";
  const bonus = calculateBonus({ baseSalary: Number(emp.base_salary), targetBonusPercent: Number(emp.target_bonus_percent), performanceMultiplier: 1, businessMultiplier: 1, individualModifier: 1, prorationFactor: 1 });
  const allowances = calculateAllowances({ baseSalary: Number(emp.base_salary), housingPercent: 25, transportPercent: 10, mobileAmount: 50 * 12, educationAmount: 0, shiftPercent: 0, hardshipPercent: 0, customAmount: 0 });
  const tcc = Number(emp.base_salary) + bonus + allowances.total;
  const posLabel = pos === "in" ? t("pos_in") : pos === "below" ? t("pos_below") : t("pos_above");

  // Peer median (within same grade)
  const peerSalaries = peers.map((p) => Number(p.base_salary)).filter((n) => !isNaN(n) && n > 0).sort((a, b) => a - b);
  const peerMedian = peerSalaries.length
    ? peerSalaries.length % 2 === 0
      ? (peerSalaries[peerSalaries.length / 2 - 1] + peerSalaries[peerSalaries.length / 2]) / 2
      : peerSalaries[Math.floor(peerSalaries.length / 2)]
    : undefined;
  const peerVariance = peerMedian ? ((Number(emp.base_salary) - peerMedian) / peerMedian) * 100 : null;

  const insights = employeeInsights({
    base: Number(emp.base_salary),
    midpoint: grade ? Number(grade.midpoint) : undefined,
    min: grade ? Number(grade.minimum) : undefined,
    max: grade ? Number(grade.maximum) : undefined,
    peerMedian,
    allowanceTotal: allowances.total,
    bonus,
  });

  return (
    <div>
      <PageHeader
        title={emp.full_name}
        subtitle={`${emp.job_title ?? "—"} • ${emp.department ?? "—"}`}
        actions={<Button asChild variant="outline" size="sm"><Link to="/app/employees"><ArrowLeft className="w-4 h-4 me-1" />{t("back")}</Link></Button>}
      />

      <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="border rounded-lg bg-card p-5">
          <h3 className="font-semibold text-sm mb-3">{t("job_info")}</h3>
          <dl className="text-sm space-y-2">
            <Row label={t("code")} value={emp.employee_code} />
            <Row label={t("department")} value={emp.department} />
            <Row label={t("job_title")} value={emp.job_title} />
            <Row label={t("location")} value={emp.location} />
            <Row label={t("status")} value={emp.employment_status} />
            <Row label={t("performance")} value={emp.performance_rating} />
          </dl>
        </div>

        <div className="border rounded-lg bg-card p-5">
          <h3 className="font-semibold text-sm mb-3">{t("salary_position")}</h3>
          <dl className="text-sm space-y-2">
            <Row label={t("base_salary")} value={fmtCurrency(Number(emp.base_salary), "USD", locale)} />
            <Row label={t("grade")} value={grade?.grade_code ?? "—"} />
            <Row label={t("range_label")} value={grade ? `${fmtCurrency(Number(grade.minimum), "USD", locale)} – ${fmtCurrency(Number(grade.maximum), "USD", locale)}` : "—"} />
            <Row label={t("compa_ratio_label")} value={compa.toFixed(2)} />
            <Row label={t("range_penetration")} value={fmtPercent(penet * 100, locale)} />
            <Row label={t("position")} value={<span className={`text-xs px-2 py-0.5 rounded-full ${pos === "in" ? "bg-success/15 text-success" : pos === "below" ? "bg-warning/15 text-warning-foreground" : "bg-destructive/15 text-destructive"}`}>{posLabel}</span>} />
          </dl>
          {grade && (
            <div className="mt-4 h-2 bg-muted rounded-full relative">
              <div className="absolute h-2 bg-accent rounded-full" style={{ width: `${Math.min(100, Math.max(0, penet * 100))}%` }} />
            </div>
          )}
        </div>

        <div className="border rounded-lg bg-card p-5">
          <h3 className="font-semibold text-sm mb-3">{t("total_rewards")}</h3>
          <dl className="text-sm space-y-2">
            <Row label={t("base")} value={fmtCurrency(Number(emp.base_salary), "USD", locale)} />
            <Row label={t("target_bonus_paren", { pct: emp.target_bonus_percent })} value={fmtCurrency(bonus, "USD", locale)} />
            <Row label={t("estimated_allowances")} value={fmtCurrency(allowances.total, "USD", locale)} />
            <div className="flex justify-between border-t pt-2 mt-2"><span className="font-medium">{t("total_cash_comp_short")}</span><span className="num font-semibold">{fmtCurrency(tcc, "USD", locale)}</span></div>
          </dl>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button asChild size="sm" variant="outline"><Link to="/app/bonus">{t("calc_bonus")}</Link></Button>
            <Button asChild size="sm" variant="outline"><Link to="/app/allowances">{t("go_allowances")}</Link></Button>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 pb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="border rounded-lg bg-card p-5">
          <h3 className="font-semibold text-sm mb-3">{t("peer_positioning")}</h3>
          {peerMedian ? (
            <dl className="text-sm space-y-2">
              <Row label={t("peer_median")} value={fmtCurrency(peerMedian, "USD", locale)} />
              <Row label={t("kpi_employees_total")} value={peers.length} />
              <Row
                label={t("variance_from_peer")}
                value={
                  <span className={`num ${peerVariance != null && Math.abs(peerVariance) >= 15 ? "text-warning-foreground font-medium" : ""}`}>
                    {peerVariance != null ? `${peerVariance >= 0 ? "+" : ""}${peerVariance.toFixed(1)}%` : "—"}
                  </span>
                }
              />
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">{t("no_peers")}</p>
          )}
        </div>
        <div className="lg:col-span-2">
          <InsightCard items={insights} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{label}</dt><dd className="text-end num">{value ?? "—"}</dd></div>;
}
