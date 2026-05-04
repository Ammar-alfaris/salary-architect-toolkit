import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { COMPA_BANDS, PERFORMANCE_RATINGS, compaRatio, compaRatioBand, defaultMeritMatrix, exportCSV, lookupMerit, scaleMatrixToBudget } from "@/lib/comp";
import { fmtCurrency, fmtPercent } from "@/lib/format";
import { meritBudgetInsights } from "@/lib/insights";
import { InsightCard } from "@/components/insight-card";
import { ApplyOrApprove } from "@/components/apply-or-approve";
import { snapshotVersion } from "@/lib/governance";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";
import { Calculator, Download, Save, RotateCcw, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/app/merit")({ component: MeritPage });

function MeritPage() {
  const { organizationId, defaultCurrency } = useAuth();
  const { t, locale } = useI18n();
  const [employees, setEmployees] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [budget, setBudget] = useState(4);
  const [matrix, setMatrix] = useState(defaultMeritMatrix());
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [cycleLocked, setCycleLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  // Track if user manually edited the matrix; if so, stop auto-scaling on budget change.
  const [matrixDirty, setMatrixDirty] = useState(false);

  useEffect(() => {
    if (!organizationId) return;
    Promise.all([
      supabase.from("employees").select("*").eq("organization_id", organizationId).eq("archived", false),
      supabase.from("salary_grades").select("*"),
      supabase.from("merit_cycles").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]).then(([e, g, c]) => {
      setEmployees(e.data ?? []);
      setGrades(g.data ?? []);
      if (c.data) {
        setCycleId(c.data.id);
        setBudget(Number(c.data.total_budget_percent));
      }
    });
  }, [organizationId]);

  // Auto-scale the merit matrix to the new target budget when the budget changes
  // (unless the user has manually customised the matrix).
  useEffect(() => {
    if (matrixDirty) return;
    setMatrix(scaleMatrixToBudget(defaultMeritMatrix(), budget, 4));
  }, [budget, matrixDirty]);

  const gradeMap = useMemo(() => new Map(grades.map((g) => [g.id, g])), [grades]);

  const setRule = (rating: string, band: string, val: number) => {
    if (cycleLocked) return toast.error(t("approval_lock_blocked"));
    setMatrixDirty(true);
    setMatrix((m) => m.map((r) => r.performance_rating === rating && r.compa_ratio_band === band ? { ...r, recommended_increase_percent: val } : r));
  };

  const resetMatrix = () => {
    if (cycleLocked) return;
    setMatrixDirty(false);
    setMatrix(scaleMatrixToBudget(defaultMeritMatrix(), budget, 4));
    toast.success(t("matrix_scaled_to_budget", { pct: budget }));
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

  const saveCycle = async () => {
    if (!organizationId) return;
    setSaving(true);
    try {
      let id = cycleId;
      if (!id) {
        const { data, error } = await supabase.from("merit_cycles").insert({
          organization_id: organizationId,
          name: `Merit ${new Date().getFullYear()}`,
          effective_date: new Date().toISOString().slice(0, 10),
          total_budget_percent: budget,
          status: "draft",
        }).select().single();
        if (error) throw error;
        id = data.id;
        setCycleId(id);
      } else {
        await supabase.from("merit_cycles").update({ total_budget_percent: budget }).eq("id", id);
      }
      // Snapshot version
      await snapshotVersion({
        orgId: organizationId,
        entityType: "merit_cycle",
        entityId: id!,
        snapshot: { budget, matrix, recommendations },
        changeSummary: `Budget ${budget}%, ${recommendations.length} employees`,
      });
      await logAudit({
        organizationId,
        action: "update",
        entityType: "merit_cycle",
        entityId: id!,
        entityLabel: `Merit ${new Date().getFullYear()}`,
        metadata: { budget, employees: recommendations.length },
      });
      toast.success(t("settings_saved"));
      window.dispatchEvent(new CustomEvent("tour:merit-created"));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const applyMerit = async () => {
    if (!recommendations.length) { toast.error(t("no_employees_yet")); return; }
    if (!confirm(t("apply_merit_confirm"))) return;
    await saveCycle();
    try {
      // write merit_results + update employee base salaries
      if (cycleId) {
        await supabase.from("merit_results").insert(
          recommendations.map((r) => ({
            merit_cycle_id: cycleId,
            employee_id: r.id,
            current_salary: r.base,
            recommended_increase_percent: r.pct,
            increase_amount: r.increase,
            new_salary: r.newSalary,
          })) as never,
        );
      }
      await Promise.all(
        recommendations.map((r) =>
          supabase.from("employees").update({ base_salary: r.newSalary }).eq("id", r.id),
        ),
      );
      toast.success(t("apply_merit_done"));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div>
      <PageHeader
        title={t("merit_increase")}
        subtitle={t("merit_subtitle")}
        actions={
          <>
            <Button data-tour="merit-cycle" variant="outline" size="sm" onClick={saveCycle} disabled={saving}>
              <Save className="w-4 h-4 me-1" />{t("save")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportCSV("merit.csv", recommendations)}>
              <Download className="w-4 h-4 me-1" />{t("export_csv")}
            </Button>
          </>
        }
      />

      <div className="p-4 md:p-6 space-y-4">
        {cycleId && (
          <ApplyOrApprove
            entityType="merit_cycle"
            entityKey="merit_cycle"
            entityId={cycleId}
            entityLabel={`Merit ${new Date().getFullYear()}`}
            proposedPayload={{ budget, matrix, recommendations }}
            onApply={applyMerit}
          />
        )}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="border rounded-lg bg-card p-4">
            <div className="text-xs text-muted-foreground">{t("target_budget")}</div>
            <div className="flex items-end gap-2 mt-1">
              <Input type="number" step="0.1" value={budget} disabled={cycleLocked} onChange={(e) => setBudget(+e.target.value || 0)} className="h-8" />
              <span className="text-sm">%</span>
            </div>
          </div>
          <div className="border rounded-lg bg-card p-4">
            <div className="text-xs text-muted-foreground">{t("actual_budget")}</div>
            <div className={`text-2xl font-semibold num mt-1 ${actualBudgetPct > budget ? "text-destructive" : "text-success"}`}>{fmtPercent(actualBudgetPct, locale)}</div>
          </div>
          <div className="border rounded-lg bg-card p-4">
            <div className="text-xs text-muted-foreground">{t("total_increase")}</div>
            <div className="text-2xl font-semibold num mt-1">{fmtCurrency(totalIncrease, defaultCurrency, locale)}</div>
          </div>
          <div className="border rounded-lg bg-card p-4">
            <div className="text-xs text-muted-foreground">{t("employees")}</div>
            <div className="text-2xl font-semibold num mt-1">{recommendations.length}</div>
          </div>
        </div>

        <InsightCard items={meritBudgetInsights({ targetPct: budget, actualPct: actualBudgetPct })} />

        <div className="border rounded-lg bg-card p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="font-medium text-sm flex items-center gap-2"><Calculator className="w-4 h-4" /> {t("merit_guideline_matrix")}</h3>
            <Button size="sm" variant="ghost" onClick={resetMatrix} disabled={cycleLocked}>
              <RotateCcw className="w-3.5 h-3.5 me-1" /> {t("reset_to_default")}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-start px-3 py-2">{t("perf_compa_axis")}</th>
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
                <tr>
                  <th className="text-start px-4 py-2.5">{t("name")}</th>
                  <th className="text-start px-4 py-2.5">{t("rating")}</th>
                  <th className="text-end px-4 py-2.5">{t("compa")}</th>
                  <th className="text-end px-4 py-2.5">{t("band")}</th>
                  <th className="text-end px-4 py-2.5">{t("current")}</th>
                  <th className="text-end px-4 py-2.5">{t("increase_pct")}</th>
                  <th className="text-end px-4 py-2.5">{t("increase_amount")}</th>
                  <th className="text-end px-4 py-2.5">{t("new_salary")}</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.length === 0 ? (
                  <tr><td colSpan={8} className="text-center text-sm text-muted-foreground py-10">{t("no_employees_yet")}</td></tr>
                ) : recommendations.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2.5 font-medium">{r.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.rating}</td>
                    <td className="px-4 py-2.5 text-end num">{r.compa.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-end text-xs text-muted-foreground">{r.band}</td>
                    <td className="px-4 py-2.5 text-end num">{fmtCurrency(r.base, defaultCurrency, locale)}</td>
                    <td className="px-4 py-2.5 text-end num">{r.pct}%</td>
                    <td className="px-4 py-2.5 text-end num text-success">{fmtCurrency(r.increase, defaultCurrency, locale)}</td>
                    <td className="px-4 py-2.5 text-end num font-medium">{fmtCurrency(r.newSalary, defaultCurrency, locale)}</td>
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
