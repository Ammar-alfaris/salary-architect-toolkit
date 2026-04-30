import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { compaRatio, exportCSV, PERFORMANCE_RATINGS } from "@/lib/comp";
import { fmtCurrency } from "@/lib/format";
import { Plus, Download, Search, Eye, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/employees")({ component: EmployeesPage });

const SAMPLE = [
  { first_name: "Sara", last_name: "Khan", department: "Engineering", job_title: "Senior Engineer", location: "Dubai", base_salary: 95000, target_bonus_percent: 15, performance_rating: "Exceeds" },
  { first_name: "Ahmed", last_name: "Hassan", department: "Engineering", job_title: "Engineering Manager", location: "Dubai", base_salary: 135000, target_bonus_percent: 20, performance_rating: "Outstanding" },
  { first_name: "Maya", last_name: "Patel", department: "Product", job_title: "Product Manager", location: "Cairo", base_salary: 78000, target_bonus_percent: 12, performance_rating: "Meets" },
  { first_name: "Omar", last_name: "Ali", department: "Sales", job_title: "Account Executive", location: "Riyadh", base_salary: 62000, target_bonus_percent: 25, performance_rating: "Exceeds" },
  { first_name: "Layla", last_name: "Mahmoud", department: "Finance", job_title: "Financial Analyst", location: "Cairo", base_salary: 55000, target_bonus_percent: 10, performance_rating: "Meets" },
  { first_name: "Daniel", last_name: "Lee", department: "Engineering", job_title: "Junior Engineer", location: "Remote", base_salary: 48000, target_bonus_percent: 8, performance_rating: "Meets" },
  { first_name: "Noura", last_name: "Saleh", department: "Marketing", job_title: "Marketing Lead", location: "Dubai", base_salary: 82000, target_bonus_percent: 15, performance_rating: "Outstanding" },
  { first_name: "Hassan", last_name: "Mostafa", department: "Operations", job_title: "Operations Director", location: "Riyadh", base_salary: 145000, target_bonus_percent: 25, performance_rating: "Meets" },
  { first_name: "Fatima", last_name: "Zaidi", department: "HR", job_title: "HR Business Partner", location: "Dubai", base_salary: 72000, target_bonus_percent: 12, performance_rating: "Exceeds" },
  { first_name: "Karim", last_name: "Adel", department: "Sales", job_title: "Sales Manager", location: "Cairo", base_salary: 98000, target_bonus_percent: 22, performance_rating: "Below" },
];

function EmployeesPage() {
  const { organizationId } = useAuth();
  const { t, locale } = useI18n();
  const [employees, setEmployees] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ employee_code: "", first_name: "", last_name: "", department: "", job_title: "", location: "", base_salary: 0, target_bonus_percent: 10, grade_id: "", performance_rating: "Meets" });

  const refresh = async () => {
    if (!organizationId) return;
    const [e, g] = await Promise.all([
      supabase.from("employees").select("*").eq("organization_id", organizationId).eq("archived", false).order("created_at", { ascending: false }),
      supabase.from("salary_grades").select("*"),
    ]);
    setEmployees(e.data ?? []);
    setGrades(g.data ?? []);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, [organizationId]);

  const gradeMap = useMemo(() => new Map(grades.map((g) => [g.id, g])), [grades]);
  const departments = useMemo(() => Array.from(new Set(employees.map((e) => e.department).filter(Boolean))), [employees]);

  const filtered = employees.filter((e) => {
    const matchesSearch = !search || e.full_name?.toLowerCase().includes(search.toLowerCase()) || e.employee_code?.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter === "all" || e.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const handleAdd = async () => {
    if (!organizationId) return;
    const { error } = await supabase.from("employees").insert({
      organization_id: organizationId,
      employee_code: form.employee_code || `EMP-${Date.now().toString().slice(-5)}`,
      first_name: form.first_name, last_name: form.last_name,
      department: form.department || null, job_title: form.job_title || null, location: form.location || null,
      base_salary: form.base_salary, target_bonus_percent: form.target_bonus_percent,
      grade_id: form.grade_id || null, performance_rating: form.performance_rating,
    });
    if (error) return toast.error(error.message);
    toast.success("Employee added");
    setOpen(false);
    setForm({ employee_code: "", first_name: "", last_name: "", department: "", job_title: "", location: "", base_salary: 0, target_bonus_percent: 10, grade_id: "", performance_rating: "Meets" });
    refresh();
  };

  const seedSample = async () => {
    if (!organizationId) return;
    const firstGradeId = grades[Math.floor(grades.length / 2)]?.id || null;
    const rows = SAMPLE.map((s, i) => ({
      ...s,
      organization_id: organizationId,
      employee_code: `EMP-${1000 + i}`,
      grade_id: grades.length ? grades[Math.min(grades.length - 1, Math.floor(i * grades.length / SAMPLE.length))]?.id : firstGradeId,
    }));
    const { error } = await supabase.from("employees").insert(rows);
    if (error) return toast.error(error.message);
    toast.success("Loaded 10 sample employees");
    refresh();
  };

  const handleExport = () => exportCSV("employees.csv", filtered.map((e) => {
    const g = gradeMap.get(e.grade_id);
    return { Code: e.employee_code, Name: e.full_name, Department: e.department, Title: e.job_title, Grade: g?.grade_code, Base: e.base_salary, Compa: g ? compaRatio(Number(e.base_salary), Number(g.midpoint)).toFixed(2) : "", Target: e.target_bonus_percent };
  }));

  return (
    <div>
      <PageHeader
        title={t("employees")}
        subtitle={`${employees.length} active`}
        actions={
          <>
            {employees.length === 0 && <Button size="sm" variant="outline" onClick={seedSample}><Sparkles className="w-4 h-4 me-1" />Load sample</Button>}
            <Button size="sm" variant="outline" onClick={handleExport}><Download className="w-4 h-4 me-1" />{t("export_csv")}</Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 me-1" />{t("add_employee")}</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Add employee</DialogTitle></DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>First name</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Last name</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Employee code</Label><Input placeholder="auto" value={form.employee_code} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>{t("department")}</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>{t("job_title")}</Label><Input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>{t("location")}</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>{t("base_salary")}</Label><Input type="number" value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: +e.target.value || 0 })} /></div>
                  <div className="space-y-1.5"><Label>{t("target_bonus_pct")}</Label><Input type="number" step="0.5" value={form.target_bonus_percent} onChange={(e) => setForm({ ...form, target_bonus_percent: +e.target.value || 0 })} /></div>
                  <div className="space-y-1.5">
                    <Label>{t("grade")}</Label>
                    <Select value={form.grade_id} onValueChange={(v) => setForm({ ...form, grade_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Pick grade" /></SelectTrigger>
                      <SelectContent>{grades.map((g) => <SelectItem key={g.id} value={g.id}>{g.grade_code} — mid {fmtCurrency(Number(g.midpoint), "USD", locale)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("performance")}</Label>
                    <Select value={form.performance_rating} onValueChange={(v) => setForm({ ...form, performance_rating: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PERFORMANCE_RATINGS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>{t("cancel")}</Button><Button onClick={handleAdd}>{t("save")}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="p-4 md:p-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name or code…" value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg bg-card overflow-hidden">
          {loading ? <div className="p-6 text-sm text-muted-foreground">{t("loading")}</div> : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">No employees match your filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr><th className="text-start px-4 py-2.5">Code</th><th className="text-start px-4 py-2.5">Name</th><th className="text-start px-4 py-2.5">{t("department")}</th><th className="text-start px-4 py-2.5">{t("job_title")}</th><th className="text-start px-4 py-2.5">{t("grade")}</th><th className="text-end px-4 py-2.5">{t("base_salary")}</th><th className="text-end px-4 py-2.5">Compa</th><th className="text-end px-4 py-2.5">Target%</th><th className="px-4 py-2.5"></th></tr>
                </thead>
                <tbody>
                  {filtered.map((e) => {
                    const g = gradeMap.get(e.grade_id);
                    const compa = g ? compaRatio(Number(e.base_salary), Number(g.midpoint)) : null;
                    return (
                      <tr key={e.id} className="border-t hover:bg-muted/20">
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{e.employee_code}</td>
                        <td className="px-4 py-2.5 font-medium">{e.full_name}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{e.department}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{e.job_title}</td>
                        <td className="px-4 py-2.5">{g?.grade_code ?? "—"}</td>
                        <td className="px-4 py-2.5 text-end num">{fmtCurrency(Number(e.base_salary), "USD", locale)}</td>
                        <td className="px-4 py-2.5 text-end num">{compa?.toFixed(2) ?? "—"}</td>
                        <td className="px-4 py-2.5 text-end num">{e.target_bonus_percent}%</td>
                        <td className="px-4 py-2.5 text-end"><Button asChild size="icon" variant="ghost"><Link to="/app/employees/$id" params={{ id: e.id }}><Eye className="w-4 h-4" /></Link></Button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
