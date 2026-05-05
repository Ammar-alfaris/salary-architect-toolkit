import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { compaRatio, COMPA_BANDS } from "@/lib/comp";
import { fmtPercent, fmtNumber } from "@/lib/format";
import { bucketCompaCounts, distributionInsights } from "@/lib/insights";
import { InsightCard, WhyThisMatters } from "@/components/insight-card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

export const Route = createFileRoute("/app/analytics/compa")({ component: CompaAnalytics });

type GroupBy = "overall" | "grade" | "department" | "structure";

function CompaAnalytics() {
  const { organizationId, defaultCurrency } = useAuth();
  const { t, locale } = useI18n();
  const [employees, setEmployees] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [groupBy, setGroupBy] = useState<GroupBy>("overall");
  const [filter, setFilter] = useState<string>("__all__");

  useEffect(() => {
    if (!organizationId) return;
    Promise.all([
      supabase.from("employees").select("*").eq("organization_id", organizationId).eq("archived", false),
      supabase.from("salary_grades").select("*"),
      supabase.from("salary_structures").select("*").eq("organization_id", organizationId),
    ]).then(([e, g, s]) => {
      setEmployees(e.data ?? []);
      setGrades(g.data ?? []);
      setStructures(s.data ?? []);
    });
  }, [organizationId]);

  const gradeMap = useMemo(() => new Map(grades.map((g) => [g.id, g])), [grades]);

  const filterOptions = useMemo(() => {
    if (groupBy === "overall") return [];
    if (groupBy === "grade") return Array.from(new Set(grades.map((g) => g.grade_code))).sort();
    if (groupBy === "department") return Array.from(new Set(employees.map((e) => e.department).filter(Boolean))).sort();
    if (groupBy === "structure") return structures.map((s) => s.id);
    return [];
  }, [groupBy, employees, grades, structures]);

  const filtered = useMemo(() => {
    if (groupBy === "overall" || filter === "__all__") return employees;
    if (groupBy === "grade") {
      const ids = new Set(grades.filter((g) => g.grade_code === filter).map((g) => g.id));
      return employees.filter((e) => ids.has(e.grade_id));
    }
    if (groupBy === "department") return employees.filter((e) => e.department === filter);
    if (groupBy === "structure") {
      const ids = new Set(grades.filter((g) => g.salary_structure_id === filter).map((g) => g.id));
      return employees.filter((e) => ids.has(e.grade_id));
    }
    return employees;
  }, [employees, grades, groupBy, filter]);

  const employeeRows = useMemo(() =>
    filtered.map((e) => {
      const g = gradeMap.get(e.grade_id);
      if (!g) return null;
      const c = compaRatio(Number(e.base_salary), Number(g.midpoint));
      if (!isFinite(c)) return null;
      return { id: e.id, name: e.full_name, dept: e.department, grade: g.grade_code, base: Number(e.base_salary), compa: c };
    }).filter((v): v is NonNullable<typeof v> => v != null),
    [filtered, gradeMap],
  );
  const compaValues = useMemo(() => employeeRows.map((r) => r.compa), [employeeRows]);

  const below = useMemo(() => employeeRows.filter((r) => r.compa < 0.8).sort((a, b) => a.compa - b.compa), [employeeRows]);
  const above = useMemo(() => employeeRows.filter((r) => r.compa > 1.1).sort((a, b) => b.compa - a.compa), [employeeRows]);

  const total = compaValues.length;
  const bandCounts = useMemo(() => bucketCompaCounts(compaValues), [compaValues]);
  const avgCompa = total ? compaValues.reduce((s, v) => s + v, 0) / total : 0;
  const belowPct = total ? ((bandCounts["<80%"] ?? 0) / total) * 100 : 0;
  const inPct = total ? (((bandCounts["80-90%"] ?? 0) + (bandCounts["90-100%"] ?? 0) + (bandCounts["100-110%"] ?? 0)) / total) * 100 : 0;
  const abovePct = total ? ((bandCounts[">110%"] ?? 0) / total) * 100 : 0;

  const chartData = COMPA_BANDS.map((b) => ({
    band: b,
    count: bandCounts[b] ?? 0,
    share: total ? ((bandCounts[b] ?? 0) / total) * 100 : 0,
  }));

  const colors = ["var(--destructive)", "var(--warning)", "var(--success)", "var(--success)", "var(--destructive)"];

  const insights = distributionInsights({ totalEmployees: total, bandCounts, avgCompa });

  const groupLabel = (val: string) =>
    groupBy === "structure" ? structures.find((s) => s.id === val)?.name ?? val : val;

  return (
    <div>
      <PageHeader title={t("compa_analytics")} subtitle={t("compa_analytics_subtitle")} />

      <div className="p-4 md:p-6 space-y-4">
        <div className="border rounded-lg bg-card p-4 flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-1">{t("group_by")}</label>
            <Select value={groupBy} onValueChange={(v) => { setGroupBy(v as GroupBy); setFilter("__all__"); }}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="overall">{t("all")}</SelectItem>
                <SelectItem value="grade">{t("grade")}</SelectItem>
                <SelectItem value="department">{t("department")}</SelectItem>
                <SelectItem value="structure">{t("structure")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {groupBy !== "overall" && (
            <div className="flex-1">
              <label className="text-xs text-muted-foreground block mb-1">{t("filter")}</label>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("all")}</SelectItem>
                  {filterOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>{groupLabel(opt)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Kpi label={t("kpi_employees_total")} value={fmtNumber(total, locale)} />
          <Kpi label={t("kpi_avg_compa")} value={total ? avgCompa.toFixed(2) : "—"} />
          <Kpi label={t("kpi_below_range")} value={fmtPercent(belowPct, locale)} tone={belowPct > 20 ? "warn" : undefined} />
          <Kpi label={t("kpi_in_range")} value={fmtPercent(inPct, locale)} tone="ok" />
          <Kpi label={t("kpi_above_range")} value={fmtPercent(abovePct, locale)} tone={abovePct > 20 ? "risk" : undefined} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="border rounded-lg bg-card p-4 lg:col-span-2">
            <h3 className="font-semibold text-sm mb-3">{t("compa_analytics")}</h3>
            <div className="h-72" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="band" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any, _n: any, p: any) => [`${v} (${(p.payload.share).toFixed(1)}%)`, t("count")]}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => <Cell key={i} fill={colors[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <WhyThisMatters>{t("compa_explainer")}</WhyThisMatters>
          </div>

          <div className="border rounded-lg bg-card p-4">
            <h3 className="font-semibold text-sm mb-3">{t("band")}</h3>
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr><th className="text-start py-1.5">{t("band")}</th><th className="text-end py-1.5">{t("count")}</th><th className="text-end py-1.5">{t("share")}</th></tr>
              </thead>
              <tbody>
                {chartData.map((row) => (
                  <tr key={row.band} className="border-t">
                    <td className="py-1.5">{row.band}</td>
                    <td className="py-1.5 text-end num">{row.count}</td>
                    <td className="py-1.5 text-end num">{fmtPercent(row.share, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <InsightCard items={insights} />
      </div>
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
