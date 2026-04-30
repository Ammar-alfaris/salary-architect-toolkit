import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { COMPA_BANDS, PERFORMANCE_RATINGS, compaRatio, compaRatioBand, defaultMeritMatrix, exportCSV, lookupMerit } from "@/lib/comp";
import { fmtCurrency, fmtPercent } from "@/lib/format";
import { Calculator, Download } from "lucide-react";

export const Route = createFileRoute("/app/merit")({ component: MeritPage });

function MeritPage() {
  const { organizationId } = useAuth();
  const { t, locale } = useI18n();
  const [employees, setEmployees] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [budget, setBudget] = useState(4);
  const [matrix, setMatrix] = useState(defaultMeritMatrix());

  useEffect(() => {
    if (!organizationId) return;
    Promise.all([
      supabase.from("employees").select("*").eq("organization_id", organizationId).eq("archived", false),
      supabase.from("salary_grades").select("*"),
    ]).then(([e, g]) => { setEmployees(e.data ?? []); setGrades(g.data ?? []); });
  }, [organizationId]);

  const gradeMap = useMemo(() => new Map(grades.map((g) => [g.id, g])), [grades]);

  const setRule = (rating: string, band: string, val: number) => {
    setMatrix((m) => m.map((r) => r.performance_rating === rating && r.compa_ratio_band === band ? { ...r, recommended_increase_percent: val } : r));
  };

  const recommendations = useMemo(() => employees.map((e) => {
    const g = gradeMap.get(e.grade_id);
    const compa = g ? compaRatio(Number(e.base_salary), Number(g.midpoint)) : 1;
    const rating = e.performance_rating || "Meets";
    const pct = lookupMerit(matrix, rating, compa);
    const increase = Number(e.base_salary) * pct / 100;
    return { id: e.id, name: e.full_name, dept: e.department, rating, base: Number(e.base_salary), compa, band: compaRatioBand(compa), pct, increase, newSalary: Number(e.base_salary) + increase };
  }), [employees, matrix, gradeMap]);

  const totalIncrease = recommendations.reduce((s, r) => s + r.increase, 0);
  const totalBase = recommendations.reduce((s, r) => s + r.base, 0);
  const actualBudgetPct = totalBase ? (totalIncrease / totalBase) * 100 : 0;

  return (
    <div>
      <PageHeader
        title={t("merit_increase")}
        subtitle="Configure your merit matrix and project the budget impact"
        actions={<Button variant="outline" size="sm" onClick={() => exportCSV("merit.csv", recommendations)}><Download className="w-4 h-4 me-1" />{t("export_csv")}</Button>}
      />

      <div className="p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="border rounded-lg bg-card p-4"><div className="text-xs text-muted-foreground">Target budget</div>
            <div className="flex items-end gap-2 mt-1"><Input type="number" step="0.1" value={budget} onChange={(e) => setBudget(+e.target.value || 0)} className="h-8" /><span className="text-sm">%</span></div>
          </div>
          <div className="border rounded-lg bg-card p-4"><div className="text-xs text-muted-foreground">Actual budget</div><div className={`text-2xl font-semibold num mt-1 ${actualBudgetPct > budget ? "text-destructive" : "text-success"}`}>{fmtPercent(actualBudgetPct, locale)}</div></div>
          <div className="border rounded-lg bg-card p-4"><div className="text-xs text-muted-foreground">Total increase</div><div className="text-2xl font-semibold num mt-1">{fmtCurrency(totalIncrease, "USD", locale)}</div></div>
          <div className="border rounded-lg bg-card p-4"><div className="text-xs text-muted-foreground">Employees</div><div className="text-2xl font-semibold num mt-1">{recommendations.length}</div></div>
        </div>

        <div className="border rounded-lg bg-card p-4">
          <h3 className="font-medium text-sm mb-3 flex items-center gap-2"><Calculator className="w-4 h-4" /> Merit guideline matrix</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-start px-3 py-2">Performance \ Compa-Ratio</th>
                  {COMPA_BANDS.map((b) => <th key={b} className="text-end px-3 py-2">{b}</th>)}
                </tr>
              </thead>
              <tbody>
                {PERFORMANCE_RATINGS.map((rating) => (
                  <tr key={rating} className="border-t">
                    <td className="px-3 py-2 font-medium">{rating}</td>
                    {COMPA_BANDS.map((band) => {
                      const r = matrix.find((x) => x.performance_rating === rating && x.compa_ratio_band === band)!;
                      return (
                        <td key={band} className="px-2 py-1">
                          <Input type="number" step="0.5" value={r.recommended_increase_percent} onChange={(e) => setRule(rating, band, +e.target.value || 0)} className="h-8 text-end num" />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border rounded-lg bg-card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr><th className="text-start px-4 py-2.5">Name</th><th className="text-start px-4 py-2.5">Rating</th><th className="text-end px-4 py-2.5">Compa</th><th className="text-end px-4 py-2.5">Band</th><th className="text-end px-4 py-2.5">Current</th><th className="text-end px-4 py-2.5">Increase %</th><th className="text-end px-4 py-2.5">Increase $</th><th className="text-end px-4 py-2.5">New Salary</th></tr>
            </thead>
            <tbody>
              {recommendations.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-sm text-muted-foreground py-10">No employees yet.</td></tr>
              ) : recommendations.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2.5 font-medium">{r.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.rating}</td>
                  <td className="px-4 py-2.5 text-end num">{r.compa.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-end text-xs text-muted-foreground">{r.band}</td>
                  <td className="px-4 py-2.5 text-end num">{fmtCurrency(r.base, "USD", locale)}</td>
                  <td className="px-4 py-2.5 text-end num">{r.pct}%</td>
                  <td className="px-4 py-2.5 text-end num text-success">{fmtCurrency(r.increase, "USD", locale)}</td>
                  <td className="px-4 py-2.5 text-end num font-medium">{fmtCurrency(r.newSalary, "USD", locale)}</td>
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
