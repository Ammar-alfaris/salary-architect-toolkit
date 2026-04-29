import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { calculateBonus, compaRatio, rangePenetration, rangePosition, calculateAllowances } from "@/lib/comp";
import { fmtCurrency, fmtPercent } from "@/lib/format";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/app/employees/$id")({ component: EmployeeProfile });

function EmployeeProfile() {
  const { id } = Route.useParams();
  const { t, locale } = useI18n();
  const [emp, setEmp] = useState<any>(null);
  const [grade, setGrade] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: e } = await supabase.from("employees").select("*").eq("id", id).maybeSingle();
      setEmp(e);
      if (e?.grade_id) {
        const { data: g } = await supabase.from("salary_grades").select("*").eq("id", e.grade_id).maybeSingle();
        setGrade(g);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">{t("loading")}</div>;
  if (!emp) return <div className="p-6">Not found.</div>;

  const compa = grade ? compaRatio(Number(emp.base_salary), Number(grade.midpoint)) : 0;
  const penet = grade ? rangePenetration(Number(emp.base_salary), Number(grade.minimum), Number(grade.maximum)) : 0;
  const pos = grade ? rangePosition(Number(emp.base_salary), Number(grade.minimum), Number(grade.maximum)) : "in";
  const bonus = calculateBonus({ baseSalary: Number(emp.base_salary), targetBonusPercent: Number(emp.target_bonus_percent), performanceMultiplier: 1, businessMultiplier: 1, individualModifier: 1, prorationFactor: 1 });
  const allowances = calculateAllowances({ baseSalary: Number(emp.base_salary), housingPercent: 25, transportPercent: 10, mobileAmount: 50 * 12, educationAmount: 0, shiftPercent: 0, hardshipPercent: 0, customAmount: 0 });
  const tcc = Number(emp.base_salary) + bonus + allowances.total;

  return (
    <div>
      <PageHeader
        title={emp.full_name}
        subtitle={`${emp.job_title ?? "—"} • ${emp.department ?? "—"}`}
        actions={<Button asChild variant="outline" size="sm"><Link to="/app/employees"><ArrowLeft className="w-4 h-4 me-1" />Back</Link></Button>}
      />

      <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="border rounded-lg bg-card p-5">
          <h3 className="font-semibold text-sm mb-3">Job info</h3>
          <dl className="text-sm space-y-2">
            <Row label="Code" value={emp.employee_code} />
            <Row label={t("department")} value={emp.department} />
            <Row label={t("job_title")} value={emp.job_title} />
            <Row label={t("location")} value={emp.location} />
            <Row label={t("status")} value={emp.employment_status} />
            <Row label={t("performance")} value={emp.performance_rating} />
          </dl>
        </div>

        <div className="border rounded-lg bg-card p-5">
          <h3 className="font-semibold text-sm mb-3">Salary position</h3>
          <dl className="text-sm space-y-2">
            <Row label={t("base_salary")} value={fmtCurrency(Number(emp.base_salary), "USD", locale)} />
            <Row label={t("grade")} value={grade?.grade_code ?? "—"} />
            <Row label="Range" value={grade ? `${fmtCurrency(Number(grade.minimum), "USD", locale)} – ${fmtCurrency(Number(grade.maximum), "USD", locale)}` : "—"} />
            <Row label="Compa-ratio" value={compa.toFixed(2)} />
            <Row label="Range penetration" value={fmtPercent(penet * 100, locale)} />
            <Row label="Position" value={<span className={`text-xs px-2 py-0.5 rounded-full ${pos === "in" ? "bg-success/15 text-success" : pos === "below" ? "bg-warning/15 text-warning-foreground" : "bg-destructive/15 text-destructive"}`}>{pos}</span>} />
          </dl>
          {grade && (
            <div className="mt-4 h-2 bg-muted rounded-full relative">
              <div className="absolute h-2 bg-accent rounded-full" style={{ width: `${Math.min(100, Math.max(0, penet * 100))}%` }} />
            </div>
          )}
        </div>

        <div className="border rounded-lg bg-card p-5">
          <h3 className="font-semibold text-sm mb-3">Total rewards</h3>
          <dl className="text-sm space-y-2">
            <Row label="Base" value={fmtCurrency(Number(emp.base_salary), "USD", locale)} />
            <Row label={`Target bonus (${emp.target_bonus_percent}%)`} value={fmtCurrency(bonus, "USD", locale)} />
            <Row label="Estimated allowances" value={fmtCurrency(allowances.total, "USD", locale)} />
            <div className="flex justify-between border-t pt-2 mt-2"><span className="font-medium">Total cash comp</span><span className="num font-semibold">{fmtCurrency(tcc, "USD", locale)}</span></div>
          </dl>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button asChild size="sm" variant="outline"><Link to="/app/bonus">Calc bonus</Link></Button>
            <Button asChild size="sm" variant="outline"><Link to="/app/allowances">Allowances</Link></Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{label}</dt><dd className="text-end num">{value ?? "—"}</dd></div>;
}
