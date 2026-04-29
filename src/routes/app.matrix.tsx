import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { fmtCurrency } from "@/lib/format";
import { exportCSV } from "@/lib/comp";
import { Download } from "lucide-react";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export const Route = createFileRoute("/app/matrix")({ component: MatrixPage });

function MatrixPage() {
  const { organizationId } = useAuth();
  const { t, locale } = useI18n();
  const [structures, setStructures] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [structureId, setStructureId] = useState<string>("");

  useEffect(() => {
    if (!organizationId) return;
    supabase.from("salary_structures").select("*").eq("organization_id", organizationId).eq("archived", false).order("created_at", { ascending: false }).then(({ data }) => {
      setStructures(data ?? []);
      if (data?.[0]) setStructureId(data[0].id);
    });
  }, [organizationId]);

  useEffect(() => {
    if (!structureId) return;
    supabase.from("salary_grades").select("*").eq("salary_structure_id", structureId).order("sequence").then(({ data }) => setGrades(data ?? []));
  }, [structureId]);

  const structure = structures.find((s) => s.id === structureId);
  const chartData = useMemo(() => grades.map((g) => ({
    grade: g.grade_code,
    min: Number(g.minimum),
    range: Number(g.maximum) - Number(g.minimum),
    midpoint: Number(g.midpoint),
  })), [grades]);

  const handleExport = () => {
    exportCSV(`${structure?.name ?? "structure"}.csv`, grades.map((g) => ({
      Grade: g.grade_code, Name: g.grade_name, Minimum: g.minimum, Midpoint: g.midpoint, Maximum: g.maximum, "Spread%": g.spread_percent, "Progression%": g.progression_percent,
    })));
  };

  return (
    <div>
      <PageHeader
        title={t("salary_matrix")}
        subtitle={structure ? `${structure.name} • ${structure.currency}` : "Visualize salary range bands"}
        actions={
          <>
            <Select value={structureId} onValueChange={setStructureId}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Select structure" /></SelectTrigger>
              <SelectContent>{structures.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={handleExport} disabled={!grades.length}><Download className="w-4 h-4 me-1" />{t("export_csv")}</Button>
          </>
        }
      />

      <div className="p-4 md:p-6 space-y-4">
        {grades.length === 0 ? (
          <div className="border rounded-lg bg-card p-12 text-center text-sm text-muted-foreground">
            {structures.length === 0 ? "Create a salary structure to see its matrix here." : "Select a structure to view."}
          </div>
        ) : (
          <>
            <div className="border rounded-lg bg-card p-4">
              <h3 className="font-medium text-sm mb-3">Range bands & midpoint trend</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} stackOffset="none">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="grade" fontSize={11} stroke="var(--muted-foreground)" />
                    <YAxis fontSize={11} stroke="var(--muted-foreground)" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} formatter={(v: any) => fmtCurrency(Number(v), structure?.currency ?? "USD", locale)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="min" stackId="a" fill="transparent" name="" legendType="none" />
                    <Bar dataKey="range" stackId="a" fill="var(--chart-1)" name="Range" radius={[4, 4, 0, 0]} />
                    <Line dataKey="midpoint" stroke="var(--chart-3)" strokeWidth={2} name="Midpoint" dot />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="border rounded-lg bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-start px-4 py-2.5">{t("grade")}</th>
                    <th className="text-start px-4 py-2.5">Name</th>
                    <th className="text-end px-4 py-2.5">{t("minimum")}</th>
                    <th className="text-end px-4 py-2.5">{t("midpoint")}</th>
                    <th className="text-end px-4 py-2.5">{t("maximum")}</th>
                    <th className="text-end px-4 py-2.5">{t("spread")}</th>
                    <th className="text-end px-4 py-2.5">{t("progression")}</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((g) => (
                    <tr key={g.id} className="border-t">
                      <td className="px-4 py-2.5 font-medium">{g.grade_code}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{g.grade_name}</td>
                      <td className="px-4 py-2.5 text-end num">{fmtCurrency(Number(g.minimum), structure?.currency ?? "USD", locale)}</td>
                      <td className="px-4 py-2.5 text-end num font-medium">{fmtCurrency(Number(g.midpoint), structure?.currency ?? "USD", locale)}</td>
                      <td className="px-4 py-2.5 text-end num">{fmtCurrency(Number(g.maximum), structure?.currency ?? "USD", locale)}</td>
                      <td className="px-4 py-2.5 text-end num text-muted-foreground">{Number(g.spread_percent)}%</td>
                      <td className="px-4 py-2.5 text-end num text-muted-foreground">{Number(g.progression_percent)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
