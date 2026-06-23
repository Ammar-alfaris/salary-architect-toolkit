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
import {fmtCurrency, fmtDateTime, fmtPercent} from "@/lib/format";
import { Download, Calculator, Save } from "lucide-react";
import { ApplyOrApprove } from "@/components/apply-or-approve";
import { snapshotVersion } from "@/lib/governance";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";

export const Route = createFileRoute("/app/bonus")({ component: BonusPage });

function BonusPage() {
  const { organizationId, defaultCurrency } = useAuth();
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
  const [cycleId, setCycleId] = useState<string | null>(null);

  // approved/finalized cycles
  const [approvedCycles, setApprovedCycles] = useState<any[]>([]);
  const loadApproved = async () => {
    if (!organizationId) return;
    const { data } = await supabase
      .from("bonus_cycles")
      .select("*")
      .eq("organization_id", organizationId)
      .not("approved_at", "is", null)
      .order("approved_at", { ascending: false });
    setApprovedCycles(data ?? []);
  };
  useEffect(() => { loadApproved(); }, [organizationId]);

  const ensureCycle = async () => {
    if (!organizationId) return null;
    if (cycleId) return cycleId;
    const { data, error } = await supabase.from("bonus_cycles").insert({
      organization_id: organizationId,
      name: `Bonus ${new Date().getFullYear()}`,
      year: new Date().getFullYear(),
      default_target_bonus_percent: target,
      business_multiplier: bulkBiz,
      status: "draft",
    }).select().single();
    if (error) { toast.error(error.message); return null; }
    setCycleId(data.id);
    return data.id as string;
  };

  const applyBonus = async () => {
    if (!bulkResults.length) { toast.error(t("no_employees_yet")); return; }
    const id = await ensureCycle();
    if (!id || !organizationId) return;
    try {
      await supabase.from("bonus_results").insert(
        bulkResults.map((r) => ({
          bonus_cycle_id: id,
          employee_id: r.id,
          base_salary: r.base,
          target_bonus_percent: r.target,
          performance_multiplier: bulkPerf,
          business_multiplier: bulkBiz,
          individual_modifier: 1,
          calculated_bonus: r.bonus,
          proration_factor: 1,
        })) as never,
      );
      await snapshotVersion({
        orgId: organizationId, entityType: "bonus_cycle", entityId: id,
        snapshot: { results: bulkResults, bulkPerf, bulkBiz },
        changeSummary: `${bulkResults.length} employees, total ${bulkResults.reduce((s, r) => s + r.bonus, 0)}`,
      });
      await logAudit({ organizationId, action: "update", entityType: "bonus_cycle", entityId: id, entityLabel: `Bonus ${new Date().getFullYear()}` });
      toast.success(t("apply_bonus_done"));
    } catch (e: any) { toast.error(e.message); }
  };


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
          <TabsList>
            <TabsTrigger value="individual">{t("individual")}</TabsTrigger>
            <TabsTrigger value="bulk">{t("bulk")}</TabsTrigger>
            <TabsTrigger value="approved">{t("status_approved")} ({approvedCycles.length})</TabsTrigger>
          </TabsList>

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
                <div className="text-3xl font-semibold num">{fmtCurrency(bonus, defaultCurrency, locale)}</div>
                <p className="text-xs text-muted-foreground mt-1">{t("annual_bonus_estimate")}</p>
                <div className="mt-4 text-xs text-muted-foreground space-y-1.5">
                  <div className="font-mono p-2.5 bg-muted/50 rounded text-foreground/80" dir="ltr">
                    base × target% × perf × biz × ind × proration
                  </div>
                  <div>{t("monthly_equivalent")}: <span className="num text-foreground">{fmtCurrency(bonus / 12, defaultCurrency, locale)}</span></div>
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
                <Button data-tour="bonus-cycle" onClick={runBulk}><Calculator className="w-4 h-4 me-1" /> {t("run_for_n_employees", { n: employees.length })}</Button>
              </div>
            </div>
            {bulkResults.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="border rounded-lg bg-card p-4"><div className="text-xs text-muted-foreground">{t("total_budget")}</div><div className="text-2xl font-semibold num mt-1">{fmtCurrency(totalBudget, defaultCurrency, locale)}</div></div>
                  <div className="border rounded-lg bg-card p-4"><div className="text-xs text-muted-foreground">{t("avg_bonus")}</div><div className="text-2xl font-semibold num mt-1">{fmtCurrency(totalBudget / bulkResults.length, defaultCurrency, locale)}</div></div>
                  <div className="border rounded-lg bg-card p-4 flex items-end justify-end gap-2"><Button variant="outline" size="sm" onClick={() => exportCSV("bonus.csv", bulkResults)}><Download className="w-4 h-4 me-1" />{t("export_csv")}</Button><Button variant="outline" size="sm" onClick={ensureCycle}><Save className="w-4 h-4 me-1" />{t("bonus_save_snapshot")}</Button></div>
                </div>
                <ApplyOrApprove
                  entityType="bonus_cycle"
                  entityKey="bonus_cycle"
                  entityId={cycleId}
                  entityLabel={`Bonus ${new Date().getFullYear()}`}
                  proposedPayload={{ results: bulkResults, bulkPerf, bulkBiz }}
                  onApply={applyBonus}
                />

                <div className="border rounded-lg bg-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[640px]">
                      <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="text-start px-4 py-2.5">{t("name")}</th><th className="text-start px-4 py-2.5">{t("dept_short")}</th><th className="text-end px-4 py-2.5">{t("base")}</th><th className="text-end px-4 py-2.5">{t("target_pct_short")}</th><th className="text-end px-4 py-2.5">{t("bonus_label")}</th></tr></thead>
                      <tbody>
                        {bulkResults.map((r) => (
                          <tr key={r.id} className="border-t"><td className="px-4 py-2.5">{r.name}</td><td className="px-4 py-2.5 text-muted-foreground">{r.dept}</td><td className="px-4 py-2.5 text-end num">{fmtCurrency(r.base, defaultCurrency, locale)}</td><td className="px-4 py-2.5 text-end num">{r.target}%</td><td className="px-4 py-2.5 text-end num font-medium">{fmtCurrency(r.bonus, defaultCurrency, locale)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="approved" className="mt-4 space-y-3">
            {approvedCycles.length === 0 ? (
              <div className="border rounded-lg bg-card p-10 text-center text-sm text-muted-foreground">
                {t("approvals_empty")}
              </div>
            ) : (
              approvedCycles.map((c) => {
                const fp = (c.final_payload ?? {}) as any;
                const results: any[] = Array.isArray(fp.results) ? fp.results : [];
                const total = results.reduce((s, r) => s + (Number(r.bonus) || 0), 0);
                return (
                  <div key={c.id} className="border rounded-lg bg-card p-4 ring-1 ring-success/30 bg-success/5 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-semibold">{c.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {t("status_approved")} · {c.approved_by_email ?? "—"} · {c.approved_at ? fmtDateTime(c.approved_at, locale) : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => results.length && exportCSV(`${c.name}.csv`, results)} disabled={!results.length}>
                          <Download className="w-4 h-4 me-1" />{t("export_csv")}
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div className="border rounded-md p-2 bg-card"><div className="text-muted-foreground">{t("employees")}</div><div className="font-semibold">{results.length}</div></div>
                      <div className="border rounded-md p-2 bg-card"><div className="text-muted-foreground">{t("total_budget")}</div><div className="font-semibold tabular-nums">{fmtCurrency(total, defaultCurrency, locale)}</div></div>
                      <div className="border rounded-md p-2 bg-card"><div className="text-muted-foreground">Year</div><div className="font-semibold">{c.year}</div></div>
                    </div>
                    {results.length > 0 && (
                      <div className="border rounded-md overflow-hidden">
                        <div className="overflow-x-auto max-h-72 overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/40 sticky top-0">
                              <tr><th className="text-start p-2">{t("name")}</th><th className="text-end p-2">{t("base")}</th><th className="text-end p-2">{t("target_pct_short")}</th><th className="text-end p-2">{t("bonus_label")}</th></tr>
                            </thead>
                            <tbody>
                              {results.map((r: any, i: number) => (
                                <tr key={r.id ?? i} className="border-t">
                                  <td className="p-2 break-all">{r.name ?? r.id}</td>
                                  <td className="p-2 text-end tabular-nums">{fmtCurrency(Number(r.base) || 0, defaultCurrency, locale)}</td>
                                  <td className="p-2 text-end tabular-nums">{Number(r.target ?? 0)}%</td>
                                  <td className="p-2 text-end tabular-nums font-semibold text-success">{fmtCurrency(Number(r.bonus) || 0, defaultCurrency, locale)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground">{t("approval_locked_label")} — {t("approval_lock_on_approval_help")}</p>
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
