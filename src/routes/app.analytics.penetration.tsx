import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { rangePenetration } from "@/lib/comp";
import { fmtPercent, fmtNumber, fmtCurrency } from "@/lib/format";
import { penetrationBand, PENETRATION_BANDS, penetrationInsights } from "@/lib/insights";
import { InsightCard, WhyThisMatters } from "@/components/insight-card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

export const Route = createFileRoute("/app/analytics/penetration")({ component: PenetrationAnalytics });

type GroupBy = "overall" | "grade" | "department" | "structure";

function PenetrationAnalytics() {
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

  const penValues = useMemo(() =>
    filtered.map((e) => {
      const g = gradeMap.get(e.grade_id);
      if (!g) return null;
      const p = rangePenetration(Number(e.base_salary), Number(g.minimum), Number(g.maximum));
      return { id: e.id, name: e.full_name, dept: e.department, grade: g.grade_code, base: Number(e.base_salary), p };
    }).filter((v): v is NonNullable<typeof v> => v != null && isFinite(v.p)),
    [filtered, gradeMap],
  );

  const total = penValues.length;
  const bandCounts: Record<string, number> = { early: 0, mid: 0, high: 0, above: 0 };
  for (const v of penValues) bandCounts[penetrationBand(v.p)]++;
  const highCount = bandCounts.high;
  const lowCount = bandCounts.early;
  const aboveCount = bandCounts.above;
  const highPct = total ? (highCount / total) * 100 : 0;
  const lowPct = total ? (lowCount / total) * 100 : 0;
  const abovePct = total ? (aboveCount / total) * 100 : 0;

  const chartData = PENETRATION_BANDS.map((b) => ({
    band: t(`pen_band_${b}`),
    count: bandCounts[b],
    share: total ? (bandCounts[b] / total) * 100 : 0,
  }));

  const colors = ["var(--accent)", "var(--success)", "var(--warning)", "var(--destructive)"];

  const insights = penetrationInsights({ total, highCount, lowCount, aboveCount });

  const lowEmployees = useMemo(() => penValues.filter((v) => v.p < 0.33).sort((a, b) => a.p - b.p), [penValues]);
  const aboveEmployees = useMemo(() => penValues.filter((v) => v.p > 1).sort((a, b) => b.p - a.p), [penValues]);

  // Heatmap by grade
  const heat = useMemo(() => {
    const byGrade = new Map<string, { early: number; mid: number; high: number; above: number; total: number }>();
    for (const v of penValues) {
      const row = byGrade.get(v.grade) ?? { early: 0, mid: 0, high: 0, above: 0, total: 0 };
      row[penetrationBand(v.p)]++;
      row.total++;
      byGrade.set(v.grade, row);
    }
    return Array.from(byGrade.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [penValues]);

  const groupLabel = (val: string) =>
    groupBy === "structure" ? structures.find((s) => s.id === val)?.name ?? val : val;

  return (
    <div>
      <PageHeader title={t("penetration_analytics")} subtitle={t("penetration_analytics_subtitle")} />

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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label={t("kpi_employees_total")} value={fmtNumber(total, locale)} />
          <Kpi label={t("kpi_low_pen")} value={fmtPercent(lowPct, locale)} />
          <Kpi label={t("kpi_high_pen")} value={fmtPercent(highPct, locale)} tone={highPct >= 25 ? "warn" : undefined} />
          <Kpi label={t("kpi_above_max")} value={fmtPercent(abovePct, locale)} tone={abovePct >= 10 ? "risk" : undefined} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="border rounded-lg bg-card p-4 lg:col-span-2">
            <h3 className="font-semibold text-sm mb-3">{t("range_penetration")}</h3>
            <div className="h-64" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="band" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any, _n: any, p: any) => [`${v} (${p.payload.share.toFixed(1)}%)`, t("count")]}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => <Cell key={i} fill={colors[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <WhyThisMatters>{t("penetration_explainer")}</WhyThisMatters>
          </div>

          <div className="border rounded-lg bg-card p-4">
            <h3 className="font-semibold text-sm mb-3">{t("grade")}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="text-start py-1.5">{t("grade")}</th>
                    {PENETRATION_BANDS.map((b) => <th key={b} className="text-end py-1.5">{t(`pen_band_${b}`)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {heat.map(([grade, row]) => (
                    <tr key={grade} className="border-t">
                      <td className="py-1.5 font-medium">{grade}</td>
                      {PENETRATION_BANDS.map((b) => {
                        const c = row[b];
                        const intensity = row.total ? c / row.total : 0;
                        return (
                          <td key={b} className="py-1 text-end">
                            <span
                              className="inline-block px-1.5 py-0.5 rounded num"
                              style={{ background: `color-mix(in oklab, var(--accent) ${10 + intensity * 50}%, transparent)` }}
                            >{c}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {!heat.length && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">{t("no_data")}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <InsightCard items={insights} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PenOutlierTable
            title={t("employees_below_range")}
            tone="warn"
            rows={lowEmployees}
            currency={defaultCurrency}
            locale={locale}
            tName={t("name")}
            tBase={t("base_salary")}
          />
          <PenOutlierTable
            title={t("employees_above_range")}
            tone="risk"
            rows={aboveEmployees}
            currency={defaultCurrency}
            locale={locale}
            tName={t("name")}
            tBase={t("base_salary")}
          />
        </div>
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

function PenOutlierTable({
  title, tone, rows, currency, locale, tName, tBase,
}: {
  title: string;
  tone: "warn" | "risk";
  rows: { id: string; name: string; dept?: string; grade: string; base: number; p: number }[];
  currency: string;
  locale: string;
  tName: string;
  tBase: string;
}) {
  const dotClass = tone === "risk" ? "bg-destructive" : "bg-warning";
  return (
    <div className="border rounded-lg bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${dotClass}`} />
          {title}
        </h3>
        <span className="text-xs text-muted-foreground num">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">—</p>
      ) : (
        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-start py-1.5">{tName}</th>
                <th className="text-start py-1.5">Grade</th>
                <th className="text-end py-1.5">{tBase}</th>
                <th className="text-end py-1.5">%</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/20">
                  <td className="py-1.5">
                    <Link to="/app/employees_/$id" params={{ id: r.id }} className="hover:underline font-medium">
                      {r.name}
                    </Link>
                    {r.dept && <div className="text-xs text-muted-foreground">{r.dept}</div>}
                  </td>
                  <td className="py-1.5 text-muted-foreground">{r.grade}</td>
                  <td className="py-1.5 text-end num">{fmtCurrency(r.base, currency, locale)}</td>
                  <td className="py-1.5 text-end num font-medium">{fmtPercent(r.p * 100, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
