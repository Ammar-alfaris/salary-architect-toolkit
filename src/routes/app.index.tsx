import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Users, Layers, DollarSign, BarChart3, Gift, TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtCurrency, fmtNumber, fmtPercent } from "@/lib/format";
import { compaRatio } from "@/lib/comp";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { ApprovalNotifications } from "@/components/approval-notifications";

export const Route = createFileRoute("/app/")({ component: Dashboard });

function Kpi({ label, value, icon: Icon, hint }: { label: string; value: string; icon: any; hint?: string }) {
  return (
    <div className="border rounded-lg bg-card p-4 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground truncate">{label}</div>
        <div className="w-7 h-7 shrink-0 rounded-md bg-accent/10 text-accent flex items-center justify-center"><Icon className="w-4 h-4" /></div>
      </div>
      <div
        className="text-xl md:text-2xl font-semibold mt-2 num break-words leading-tight"
        title={value}
      >
        {value}
      </div>
      {hint && <div className="text-xs text-muted-foreground mt-1 truncate">{hint}</div>}
    </div>
  );
}

function Dashboard() {
  const { organizationId, defaultCurrency } = useAuth();
  const { t, locale } = useI18n();
  const [employees, setEmployees] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) return;
    (async () => {
      const [emp, str, grd] = await Promise.all([
        supabase.from("employees").select("*").eq("organization_id", organizationId).eq("archived", false),
        supabase.from("salary_structures").select("*").eq("organization_id", organizationId).eq("archived", false).order("created_at", { ascending: false }).limit(5),
        supabase.from("salary_grades").select("*"),
      ]);
      setEmployees(emp.data ?? []);
      setStructures(str.data ?? []);
      setGrades(grd.data ?? []);
      setLoading(false);
    })();
  }, [organizationId]);

  const gradeMap = new Map(grades.map((g) => [g.id, g]));
  const totalPayroll = employees.reduce((sum, e) => sum + Number(e.base_salary || 0), 0);
  const compas = employees.map((e) => {
    const g = gradeMap.get(e.grade_id);
    return g ? compaRatio(Number(e.base_salary), Number(g.midpoint)) : null;
  }).filter((x): x is number => x != null);
  const avgCompa = compas.length ? compas.reduce((a, b) => a + b, 0) / compas.length : 0;
  const bonusBudget = employees.reduce((s, e) => s + Number(e.base_salary) * (Number(e.target_bonus_percent) || 0) / 100, 0);
  const meritBudget = totalPayroll * 0.04;

  const outOfRange = employees.filter((e) => {
    const g = gradeMap.get(e.grade_id);
    if (!g) return false;
    return Number(e.base_salary) < Number(g.minimum) || Number(e.base_salary) > Number(g.maximum);
  });

  // Compensation distribution by grade
  const distData = grades.slice(0, 10).map((g) => ({
    grade: g.grade_code,
    count: employees.filter((e) => e.grade_id === g.id).length,
    midpoint: Number(g.midpoint),
  }));

  // Budget by department
  const deptMap = new Map<string, number>();
  employees.forEach((e) => {
    const d = e.department || "Unassigned";
    deptMap.set(d, (deptMap.get(d) || 0) + Number(e.base_salary));
  });
  const deptData = Array.from(deptMap.entries()).map(([name, value]) => ({ name, value }));
  const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

  return (
    <div>
      <PageHeader
        title={t("dashboard")}
        subtitle={t("dashboard_subtitle")}
        actions={
          <>
            <Button asChild size="sm" variant="outline"><Link to="/app/employees">{t("add_employee")}</Link></Button>
            <Button asChild size="sm"><Link to="/app/structures"><Plus className="w-4 h-4 me-1" />{t("create_structure")}</Link></Button>
          </>
        }
      />
      <div className="p-4 md:p-6 space-y-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">{t("loading")}</div>
        ) : (
          <>
            <ApprovalNotifications />
            <div data-tour="kpis" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <Kpi label={t("total_employees")} value={fmtNumber(employees.length, locale)} icon={Users} />
              <Kpi label={t("active_structures")} value={fmtNumber(structures.length, locale)} icon={Layers} />
              <Kpi label={t("payroll_snapshot")} value={fmtCurrency(totalPayroll, defaultCurrency, locale)} icon={DollarSign} hint={t("annual_base")} />
              <Kpi label={t("avg_compa_ratio")} value={avgCompa ? avgCompa.toFixed(2) : "—"} icon={BarChart3} />
              <Kpi label={t("bonus_budget")} value={fmtCurrency(bonusBudget, defaultCurrency, locale)} icon={Gift} />
              <Kpi label={t("merit_budget")} value={fmtCurrency(meritBudget, defaultCurrency, locale)} icon={TrendingUp} hint={t("est_4_pct")} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border rounded-lg bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-sm">{t("headcount_by_grade")}</h3>
                </div>
                <div className="h-64" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="grade" stroke="var(--muted-foreground)" fontSize={11} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
                      <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border rounded-lg bg-card p-4">
                <h3 className="font-medium text-sm mb-3">{t("payroll_by_department")}</h3>
                <div className="h-64" dir="ltr">
                  {deptData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={deptData} dataKey="value" nameKey="name" outerRadius={80} innerRadius={45}>
                          {deptData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full grid place-items-center text-sm text-muted-foreground">{t("no_employee_data")}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border rounded-lg bg-card p-4">
                <h3 className="font-medium text-sm mb-3">{t("recent_structures")}</h3>
                {structures.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-6 text-center">{t("no_structures_yet")} <Link to="/app/structures" className="text-accent">{t("create_one")}</Link></div>
                ) : (
                  <div className="divide-y">
                    {structures.map((s) => (
                      <Link key={s.id} to="/app/matrix" className="flex items-center justify-between py-2.5 hover:bg-muted/40 -mx-2 px-2 rounded">
                        <div>
                          <div className="text-sm font-medium">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{t("grades_count", { n: s.grade_count })} • {s.currency}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">{new Date(s.effective_date).toLocaleDateString(locale === "ar" ? "ar" : "en-US")}</div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="border rounded-lg bg-card p-4">
                <h3 className="font-medium text-sm mb-3">{t("out_of_range_employees")} ({outOfRange.length})</h3>
                {outOfRange.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-6 text-center">{t("all_in_range")}</div>
                ) : (
                  <div className="divide-y max-h-64 overflow-auto">
                    {outOfRange.slice(0, 8).map((e) => {
                      const g = gradeMap.get(e.grade_id);
                      const isBelow = Number(e.base_salary) < Number(g.minimum);
                      return (
                        <div key={e.id} className="flex items-center justify-between py-2.5">
                          <div>
                            <div className="text-sm">{e.full_name}</div>
                            <div className="text-xs text-muted-foreground">{g.grade_code} • {fmtCurrency(Number(e.base_salary), defaultCurrency, locale)}</div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${isBelow ? "bg-warning/15 text-warning-foreground" : "bg-destructive/15 text-destructive"}`}>{isBelow ? t("below") : t("above")}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
