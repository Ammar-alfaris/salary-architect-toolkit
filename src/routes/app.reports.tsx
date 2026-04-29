import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { compaRatio, exportCSV } from "@/lib/comp";
import { fmtCurrency } from "@/lib/format";
import { Download, FileBarChart, Users, Layers, TrendingUp, Wallet, AlertCircle } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/app/reports")({ component: ReportsPage });

function ReportsPage() {
  const { organizationId } = useAuth();
  const { t, locale } = useI18n();
  const [employees, setEmployees] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);

  useEffect(() => {
    if (!organizationId) return;
    Promise.all([
      supabase.from("employees").select("*").eq("organization_id", organizationId).eq("archived", false),
      supabase.from("salary_grades").select("*"),
      supabase.from("salary_structures").select("*").eq("organization_id", organizationId),
    ]).then(([e, g, s]) => { setEmployees(e.data ?? []); setGrades(g.data ?? []); setStructures(s.data ?? []); });
  }, [organizationId]);

  const gradeMap = useMemo(() => new Map(grades.map((g) => [g.id, g])), [grades]);

  const compRows = employees.map((e) => {
    const g = gradeMap.get(e.grade_id);
    const compa = g ? compaRatio(Number(e.base_salary), Number(g.midpoint)) : 0;
    return { Code: e.employee_code, Name: e.full_name, Department: e.department, Title: e.job_title, Grade: g?.grade_code ?? "", Base: e.base_salary, Compa: compa.toFixed(2), TargetBonus: e.target_bonus_percent };
  });

  const deptMap = new Map<string, number>();
  employees.forEach((e) => {
    const d = e.department || "Unassigned";
    deptMap.set(d, (deptMap.get(d) || 0) + Number(e.base_salary));
  });
  const deptBudget = Array.from(deptMap.entries()).map(([dept, value]) => ({ dept, value }));

  const outOfRange = employees.filter((e) => {
    const g = gradeMap.get(e.grade_id);
    if (!g) return false;
    return Number(e.base_salary) < Number(g.minimum) || Number(e.base_salary) > Number(g.maximum);
  });

  const reports = [
    { icon: Layers, title: "Salary structures", desc: `${structures.length} structures, ${grades.length} grades`, action: () => structures.forEach((s) => exportCSV(`structure-${s.name}.csv`, grades.filter((g) => g.salary_structure_id === s.id).map((g) => ({ Grade: g.grade_code, Min: g.minimum, Mid: g.midpoint, Max: g.maximum })))) },
    { icon: Users, title: "Employee compensation", desc: `${employees.length} active employees`, action: () => exportCSV("employee-comp.csv", compRows) },
    { icon: TrendingUp, title: "Merit projection", desc: "4% budget projection", action: () => exportCSV("merit-projection.csv", employees.map((e) => ({ Name: e.full_name, Base: e.base_salary, Increase: Number(e.base_salary) * 0.04, NewSalary: Number(e.base_salary) * 1.04 }))) },
    { icon: Wallet, title: "Bonus budget", desc: "Sum of target bonuses", action: () => exportCSV("bonus-budget.csv", employees.map((e) => ({ Name: e.full_name, Base: e.base_salary, Target: e.target_bonus_percent, Bonus: Number(e.base_salary) * Number(e.target_bonus_percent) / 100 }))) },
    { icon: AlertCircle, title: "Out of range employees", desc: `${outOfRange.length} flagged`, action: () => exportCSV("out-of-range.csv", outOfRange.map((e) => { const g = gradeMap.get(e.grade_id); return { Name: e.full_name, Grade: g?.grade_code, Min: g?.minimum, Base: e.base_salary, Max: g?.maximum }; })) },
  ];

  return (
    <div>
      <PageHeader title={t("reports")} subtitle="Export-ready summaries for finance and management" />
      <div className="p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {reports.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.title} className="border rounded-lg bg-card p-5">
                <div className="flex items-start justify-between">
                  <div className="w-9 h-9 rounded-md bg-accent/10 text-accent flex items-center justify-center"><Icon className="w-4 h-4" /></div>
                  <Button size="sm" variant="ghost" onClick={r.action}><Download className="w-4 h-4" /></Button>
                </div>
                <h3 className="font-medium mt-3 text-sm">{r.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="border rounded-lg bg-card p-4">
          <h3 className="font-medium text-sm mb-3 flex items-center gap-2"><FileBarChart className="w-4 h-4" /> Payroll by department</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptBudget}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="dept" fontSize={11} stroke="var(--muted-foreground)" />
                <YAxis fontSize={11} stroke="var(--muted-foreground)" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} formatter={(v: any) => fmtCurrency(Number(v), "USD", locale)} />
                <Bar dataKey="value" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
