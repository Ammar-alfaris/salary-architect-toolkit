import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { calculateBonus, exportCSV } from "@/lib/comp";
import { fmtCurrency, fmtPercent } from "@/lib/format";
import { Download, Calculator } from "lucide-react";

export const Route = createFileRoute("/app/bonus")({ component: BonusPage });

function BonusPage() {
  const { organizationId } = useAuth();
  const { t, locale } = useI18n();
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeeId, setEmployeeId] = useState("");

  // individual params
  const [base, setBase] = useState(60000);
  const [target, setTarget] = useState(15);
  const [perfMul, setPerfMul] = useState(1);
  const [bizMul, setBizMul] = useState(1);
  const [indMul, setIndMul] = useState(1);
  const [proration, setProration] = useState(1);

  // bulk
  const [bulkPerf, setBulkPerf] = useState(1);
  const [bulkBiz, setBulkBiz] = useState(1);
  const [bulkResults, setBulkResults] = useState<any[]>([]);

  useEffect(() => {
    if (!organizationId) return;
    supabase.from("employees").select("*").eq("organization_id", organizationId).eq("archived", false).then(({ data }) => setEmployees(data ?? []));
  }, [organizationId]);

  useEffect(() => {
    const e = employees.find((x) => x.id === employeeId);
    if (e) { setBase(Number(e.base_salary)); setTarget(Number(e.target_bonus_percent)); }
  }, [employeeId, employees]);

  const bonus = calculateBonus({ baseSalary: base, targetBonusPercent: target, performanceMultiplier: perfMul, businessMultiplier: bizMul, individualModifier: indMul, prorationFactor: proration });

  const runBulk = () => {
    setBulkResults(employees.map((e) => {
      const b = calculateBonus({ baseSalary: Number(e.base_salary), targetBonusPercent: Number(e.target_bonus_percent), performanceMultiplier: bulkPerf, businessMultiplier: bulkBiz, individualModifier: 1, prorationFactor: 1 });
      return { id: e.id, name: e.full_name, dept: e.department, base: Number(e.base_salary), target: Number(e.target_bonus_percent), bonus: b };
    }));
  };

  const totalBudget = bulkResults.reduce((s, r) => s + r.bonus, 0);

  return (
    <div>
      <PageHeader title={t("bonus")} subtitle={t("bonus_subtitle")} />
      <div className="p-4 md:p-6">
        <Tabs defaultValue="individual">
          <TabsList><TabsTrigger value="individual">{t("individual")}</TabsTrigger><TabsTrigger value="bulk">{t("bulk")}</TabsTrigger></TabsList>

          <TabsContent value="individual" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 border rounded-lg bg-card p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>{t("employee_optional")}</Label>
                    <Select value={employeeId} onValueChange={setEmployeeId}>
                      <SelectTrigger><SelectValue placeholder={t("pick_employee_or_manual")} /></SelectTrigger>
                      <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name} — {e.job_title}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label>{t("base_salary")}</Label><Input type="number" value={base} onChange={(e) => setBase(+e.target.value || 0)} /></div>
                  <div className="space-y-1.5"><Label>{t("target_bonus_pct")}</Label><Input type="number" step="0.5" value={target} onChange={(e) => setTarget(+e.target.value || 0)} /></div>
                  <div className="space-y-1.5"><Label>{t("performance_multiplier")}</Label><Input type="number" step="0.05" value={perfMul} onChange={(e) => setPerfMul(+e.target.value || 0)} /></div>
                  <div className="space-y-1.5"><Label>{t("business_multiplier")}</Label><Input type="number" step="0.05" value={bizMul} onChange={(e) => setBizMul(+e.target.value || 0)} /></div>
                  <div className="space-y-1.5"><Label>{t("individual_modifier")}</Label><Input type="number" step="0.05" value={indMul} onChange={(e) => setIndMul(+e.target.value || 0)} /></div>
                  <div className="space-y-1.5"><Label>{t("proration_factor")}</Label><Input type="number" step="0.05" min={0} max={1} value={proration} onChange={(e) => setProration(+e.target.value || 0)} /></div>
                </div>
              </div>

              <div className="border rounded-lg bg-card p-5">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Calculator className="w-4 h-4" /> {t("result")}</h3>
                <div className="text-3xl font-semibold num">{fmtCurrency(bonus, "USD", locale)}</div>
                <p className="text-xs text-muted-foreground mt-1">{t("annual_bonus_estimate")}</p>
                <div className="mt-4 text-xs text-muted-foreground space-y-1.5">
                  <div className="font-mono p-2.5 bg-muted/50 rounded text-foreground/80" dir="ltr">
                    base × target% × perf × biz × ind × proration
                  </div>
                  <div>{t("monthly_equivalent")}: <span className="num text-foreground">{fmtCurrency(bonus / 12, "USD", locale)}</span></div>
                  <div>{t("pct_of_base")}: <span className="num text-foreground">{base ? fmtPercent((bonus / base) * 100, locale) : "—"}</span></div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bulk" className="mt-4 space-y-4">
            <div className="border rounded-lg bg-card p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="space-y-1.5"><Label>{t("perf_multiplier_all")}</Label><Input type="number" step="0.05" value={bulkPerf} onChange={(e) => setBulkPerf(+e.target.value || 0)} /></div>
                <div className="space-y-1.5"><Label>{t("business_multiplier")}</Label><Input type="number" step="0.05" value={bulkBiz} onChange={(e) => setBulkBiz(+e.target.value || 0)} /></div>
                <Button onClick={runBulk}><Calculator className="w-4 h-4 me-1" /> {t("run_for_n_employees", { n: employees.length })}</Button>
              </div>
            </div>
            {bulkResults.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="border rounded-lg bg-card p-4"><div className="text-xs text-muted-foreground">{t("total_budget")}</div><div className="text-2xl font-semibold num mt-1">{fmtCurrency(totalBudget, "USD", locale)}</div></div>
                  <div className="border rounded-lg bg-card p-4"><div className="text-xs text-muted-foreground">{t("avg_bonus")}</div><div className="text-2xl font-semibold num mt-1">{fmtCurrency(totalBudget / bulkResults.length, "USD", locale)}</div></div>
                  <div className="border rounded-lg bg-card p-4 flex items-end justify-end"><Button variant="outline" size="sm" onClick={() => exportCSV("bonus.csv", bulkResults)}><Download className="w-4 h-4 me-1" />{t("export_csv")}</Button></div>
                </div>
                <div className="border rounded-lg bg-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[640px]">
                      <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="text-start px-4 py-2.5">{t("name")}</th><th className="text-start px-4 py-2.5">{t("dept_short")}</th><th className="text-end px-4 py-2.5">{t("base")}</th><th className="text-end px-4 py-2.5">{t("target_pct_short")}</th><th className="text-end px-4 py-2.5">{t("bonus_label")}</th></tr></thead>
                      <tbody>
                        {bulkResults.map((r) => (
                          <tr key={r.id} className="border-t"><td className="px-4 py-2.5">{r.name}</td><td className="px-4 py-2.5 text-muted-foreground">{r.dept}</td><td className="px-4 py-2.5 text-end num">{fmtCurrency(r.base, "USD", locale)}</td><td className="px-4 py-2.5 text-end num">{r.target}%</td><td className="px-4 py-2.5 text-end num font-medium">{fmtCurrency(r.bonus, "USD", locale)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
