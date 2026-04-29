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

export const Route = createFileRoute("/app/")({ component: Dashboard });

function Kpi({ label, value, icon: Icon, hint }: { label: string; value: string; icon: any; hint?: string }) {
  return (
    <div className="border rounded-lg bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="w-7 h-7 rounded-md bg-accent/10 text-accent flex items-center justify-center"><Icon className="w-4 h-4" /></div>
      </div>
      <div className="text-2xl font-semibold mt-2 num">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function Dashboard() {
  const { organizationId } = useAuth();
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
        subtitle="Compensation overview at a glance"
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <Kpi label={t("total_employees")} value={fmtNumber(employees.length, locale)} icon={Users} />
              <Kpi label={t("active_structures")} value={fmtNumber(structures.length, locale)} icon={Layers} />
              <Kpi label={t("payroll_snapshot")} value={fmtCurrency(totalPayroll, "USD", locale)} icon={DollarSign} hint="Annual base" />
              <Kpi label={t("avg_compa_ratio")} value={avgCompa ? avgCompa.toFixed(2) : "—"} icon={BarChart3} />
              <Kpi label={t("bonus_budget")} value={fmtCurrency(bonusBudget, "USD", locale)} icon={Gift} />
              <Kpi label={t("merit_budget")} value={fmtCurrency(meritBudget, "USD", locale)} icon={TrendingUp} hint="Est. 4%" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border rounded-lg bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-sm">Headcount by grade</h3>
                </div>
                <div className="h-64">
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
                <h3 className="font-medium text-sm mb-3">Payroll by department</h3>
                <div className="h-64">
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
                    <div className="h-full grid place-items-center text-sm text-muted-foreground">No employee data yet.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border rounded-lg bg-card p-4">
                <h3 className="font-medium text-sm mb-3">{t("recent_structures")}</h3>
                {structures.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-6 text-center">No structures yet. <Link to="/app/structures" className="text-accent">Create one →</Link></div>
                ) : (
                  <div className="divide-y">
                    {structures.map((s) => (
                      <Link key={s.id} to="/app/matrix" className="flex items-center justify-between py-2.5 hover:bg-muted/40 -mx-2 px-2 rounded">
                        <div>
                          <div className="text-sm font-medium">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.grade_count} grades • {s.currency}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">{new Date(s.effective_date).toLocaleDateString()}</div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="border rounded-lg bg-card p-4">
                <h3 className="font-medium text-sm mb-3">{t("out_of_range")} ({outOfRange.length})</h3>
                {outOfRange.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-6 text-center">All employees within range ✓</div>
                ) : (
                  <div className="divide-y max-h-64 overflow-auto">
                    {outOfRange.slice(0, 8).map((e) => {
                      const g = gradeMap.get(e.grade_id);
                      const pos = Number(e.base_salary) < Number(g.minimum) ? "below" : "above";
                      return (
                        <div key={e.id} className="flex items-center justify-between py-2.5">
                          <div>
                            <div className="text-sm">{e.full_name}</div>
                            <div className="text-xs text-muted-foreground">{g.grade_code} • {fmtCurrency(Number(e.base_salary), "USD", locale)}</div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${pos === "below" ? "bg-warning/15 text-warning-foreground" : "bg-destructive/15 text-destructive"}`}>{pos}</span>
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
