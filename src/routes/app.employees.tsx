import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { compaRatio, exportCSV, PERFORMANCE_RATINGS } from "@/lib/comp";
import { exportXLSX, parseXLSX, downloadEmployeeTemplate, EMPLOYEE_TEMPLATE_HEADERS } from "@/lib/excel";
import { fmtCurrency } from "@/lib/format";
import { logAudit } from "@/lib/audit";
import { usePermissions, maskSalary } from "@/lib/rbac";
import { Plus, Download, Search, Eye, Sparkles, FileSpreadsheet, Trash2, ChevronLeft, ChevronRight, ShieldAlert, Upload, FileDown, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";

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

const PAGE_SIZE = 25;

function EmployeesPage() {
  const { organizationId, defaultCurrency } = useAuth();
  const { t, locale } = useI18n();
  const perms = usePermissions();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ employee_code: "", first_name: "", last_name: "", department: "", job_title: "", job_family: "", location: "", base_salary: 0, target_bonus_percent: 10, grade_id: "", performance_rating: "Meets" });
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("organization_id", organizationId!)
        .eq("archived", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: grades = [] } = useQuery({
    queryKey: ["salary_grades", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase.from("salary_grades").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["employees", organizationId] });

  const gradeMap = useMemo(() => new Map(grades.map((g: any) => [g.id, g])), [grades]);
  const departments = useMemo(() => Array.from(new Set(employees.map((e: any) => e.department).filter(Boolean))), [employees]);

  const filtered = useMemo(
    () =>
      employees.filter((e: any) => {
        const ms = !search || e.full_name?.toLowerCase().includes(search.toLowerCase()) || e.employee_code?.toLowerCase().includes(search.toLowerCase());
        const md = deptFilter === "all" || e.department === deptFilter;
        return ms && md;
      }),
    [employees, search, deptFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r: any) => selected.has(r.id));
  const togglePage = () => {
    const next = new Set(selected);
    if (allOnPageSelected) pageRows.forEach((r: any) => next.delete(r.id));
    else pageRows.forEach((r: any) => next.add(r.id));
    setSelected(next);
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const handleAdd = async () => {
    if (!organizationId) return;
    if (!perms.canEdit) return toast.error(t("insufficient_permissions"));
    const code = form.employee_code || `EMP-${Date.now().toString().slice(-5)}`;
    const { data, error } = await supabase
      .from("employees")
      .insert({
        organization_id: organizationId,
        employee_code: code,
        first_name: form.first_name,
        last_name: form.last_name,
        department: form.department || null,
        job_title: form.job_title || null,
        job_family: form.job_family || null,
        location: form.location || null,
        base_salary: form.base_salary,
        target_bonus_percent: form.target_bonus_percent,
        grade_id: form.grade_id || null,
        performance_rating: form.performance_rating,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    toast.success(t("employee_added"));
    await logAudit({
      organizationId,
      action: "create",
      entityType: "employee",
      entityId: data.id,
      entityLabel: `${form.first_name} ${form.last_name} (${code})`,
      after: { base_salary: form.base_salary, target_bonus_percent: form.target_bonus_percent, grade_id: form.grade_id || null },
    });
    setOpen(false);
    setForm({ employee_code: "", first_name: "", last_name: "", department: "", job_title: "", job_family: "", location: "", base_salary: 0, target_bonus_percent: 10, grade_id: "", performance_rating: "Meets" });
    refresh();
  };

  const seedSample = async () => {
    if (!organizationId || !perms.canEdit) return;
    const firstGradeId = grades[Math.floor(grades.length / 2)]?.id || null;
    const rows = SAMPLE.map((s, i) => ({
      ...s,
      organization_id: organizationId,
      employee_code: `EMP-${1000 + i}`,
      grade_id: grades.length ? grades[Math.min(grades.length - 1, Math.floor((i * grades.length) / SAMPLE.length))]?.id : firstGradeId,
    }));
    const { error } = await supabase.from("employees").insert(rows);
    if (error) return toast.error(error.message);
    toast.success(t("loaded_sample_n", { n: 10 }));
    await logAudit({ organizationId, action: "create", entityType: "employee", entityLabel: "10 sample employees", metadata: { count: rows.length } });
    refresh();
  };

  const buildExportRows = (list: any[]) =>
    list.map((e) => {
      const g: any = gradeMap.get(e.grade_id);
      return {
        Code: e.employee_code,
        Name: e.full_name,
        Department: e.department,
        Title: e.job_title,
        Location: e.location,
        Grade: g?.grade_code,
        BaseSalary: perms.canViewSalary ? Number(e.base_salary) : t("restricted"),
        Compa: g && perms.canViewSalary ? compaRatio(Number(e.base_salary), Number(g.midpoint)).toFixed(2) : "",
        TargetBonusPct: e.target_bonus_percent,
        Performance: e.performance_rating,
      };
    });

  const handleExportCSV = async () => {
    exportCSV("employees.csv", buildExportRows(filtered));
    if (organizationId) await logAudit({ organizationId, action: "export", entityType: "employee", entityLabel: `${filtered.length} rows (CSV)` });
  };
  const handleExportXLSX = async () => {
    exportXLSX("employees.xlsx", buildExportRows(filtered), "Employees");
    if (organizationId) await logAudit({ organizationId, action: "export", entityType: "employee", entityLabel: `${filtered.length} rows (XLSX)` });
  };

  const handleBulkArchive = async () => {
    if (!organizationId || selected.size === 0 || !perms.canDelete) return;
    const ids = Array.from(selected);
    const { error } = await supabase.from("employees").update({ archived: true }).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(t("n_employees_archived", { n: ids.length }));
    await logAudit({ organizationId, action: "bulk_delete", entityType: "employee", entityLabel: `${ids.length} employees archived`, metadata: { ids } });
    setSelected(new Set());
    refresh();
  };


  const handleImportFile = async (file: File) => {
    if (!organizationId || !perms.canEdit) return;
    try {
      const rows = await parseXLSX(file);
      if (rows.length === 0) return toast.error(t("no_employees_match"));
      // Build code → grade_id map for fast lookup
      const codeToGrade = new Map<string, string>();
      grades.forEach((g: any) => codeToGrade.set(String(g.grade_code).toLowerCase(), g.id));

      // Skip duplicates (existing codes)
      const existingCodes = new Set(employees.map((e: any) => String(e.employee_code).toLowerCase()));
      let ok = 0;
      let fail = 0;
      const toInsert: any[] = [];
      for (const r of rows) {
        const code = String(r.employee_code ?? "").trim();
        if (!code || existingCodes.has(code.toLowerCase())) { fail++; continue; }
        const gradeCode = String(r.grade_code ?? "").trim().toLowerCase();
        toInsert.push({
          organization_id: organizationId,
          employee_code: code,
          first_name: String(r.first_name ?? "").trim() || "—",
          last_name: String(r.last_name ?? "").trim() || "—",
          email: String(r.email ?? "").trim() || null,
          department: String(r.department ?? "").trim() || null,
          job_title: String(r.job_title ?? "").trim() || null,
          job_family: String(r.job_family ?? "").trim() || null,
          location: String(r.location ?? "").trim() || null,
          grade_id: gradeCode ? codeToGrade.get(gradeCode) ?? null : null,
          base_salary: Number(r.base_salary) || 0,
          target_bonus_percent: Number(r.target_bonus_percent) || 0,
          performance_rating: String(r.performance_rating ?? "Meets").trim() || "Meets",
          hire_date: r.hire_date ? String(r.hire_date) : null,
          manager_name: String(r.manager_name ?? "").trim() || null,
        });
        ok++;
      }
      if (toInsert.length) {
        const { error } = await supabase.from("employees").insert(toInsert);
        if (error) { toast.error(error.message); return; }
      }
      toast.success(t("import_results", { ok, fail }));
      await logAudit({ organizationId, action: "create", entityType: "employee", entityLabel: `Excel import (${ok} added, ${fail} skipped)`, metadata: { ok, fail } });
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const openEdit = (emp: any) => {
    setEditTarget(emp);
    setEditForm({
      first_name: emp.first_name ?? "",
      last_name: emp.last_name ?? "",
      department: emp.department ?? "",
      job_title: emp.job_title ?? "",
      job_family: emp.job_family ?? "",
      location: emp.location ?? "",
      base_salary: Number(emp.base_salary) || 0,
      target_bonus_percent: Number(emp.target_bonus_percent) || 0,
      grade_id: emp.grade_id ?? "",
      performance_rating: emp.performance_rating ?? "Meets",
    });
  };

  const handleSaveEdit = async () => {
    if (!organizationId || !editTarget || !editForm) return;
    if (!perms.canEdit) return toast.error(t("insufficient_permissions"));
    const before = {
      base_salary: Number(editTarget.base_salary),
      target_bonus_percent: Number(editTarget.target_bonus_percent),
      grade_id: editTarget.grade_id,
      job_title: editTarget.job_title,
    };
    const { error } = await supabase
      .from("employees")
      .update({
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        department: editForm.department || null,
        job_title: editForm.job_title || null,
        job_family: editForm.job_family || null,
        location: editForm.location || null,
        base_salary: editForm.base_salary,
        target_bonus_percent: editForm.target_bonus_percent,
        grade_id: editForm.grade_id || null,
        performance_rating: editForm.performance_rating,
      })
      .eq("id", editTarget.id);
    if (error) return toast.error(error.message);
    toast.success(t("save_changes"));
    await logAudit({
      organizationId, action: "update", entityType: "employee", entityId: editTarget.id,
      entityLabel: `${editForm.first_name} ${editForm.last_name}`,
      before, after: { base_salary: editForm.base_salary, target_bonus_percent: editForm.target_bonus_percent, grade_id: editForm.grade_id || null, job_title: editForm.job_title },
    });
    setEditTarget(null);
    setEditForm(null);
    refresh();
  };

  return (
    <div>
      <PageHeader
        title={t("employees")}
        subtitle={perms.role ? t("employees_subtitle_role", { n: employees.length, role: perms.role }) : t("employees_subtitle_norole", { n: employees.length })}
        actions={
          <>
            {employees.length === 0 && perms.canEdit && (
              <Button size="sm" variant="outline" onClick={seedSample}>
                <Sparkles className="w-4 h-4 me-1" />
                {t("load_sample")}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleExportCSV}>
              <Download className="w-4 h-4 me-1" />
              {t("csv")}
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportXLSX}>
              <FileSpreadsheet className="w-4 h-4 me-1" />
              {t("excel")}
            </Button>
            {perms.canEdit && (
              <>
                <Button size="sm" variant="outline" onClick={() => downloadEmployeeTemplate()}>
                  <FileDown className="w-4 h-4 me-1" />
                  {t("download_template")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload className="w-4 h-4 me-1" />
                  {t("import_excel")}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); }}
                />
              </>
            )}
            {perms.canEdit && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 me-1" />
                    {t("add_employee")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{t("add_employee_title")}</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label>{t("first_name")}</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>{t("last_name")}</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>{t("employee_code")}</Label><Input placeholder={t("auto")} value={form.employee_code} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>{t("department")}</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>{t("job_title")}</Label><Input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>{t("location")}</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>{t("job_family")}</Label><Input placeholder={t("job_family_helper")} value={form.job_family} onChange={(e) => setForm({ ...form, job_family: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>{t("base_salary")}</Label><Input type="number" value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: +e.target.value || 0 })} /></div>
                    <div className="space-y-1.5"><Label>{t("target_bonus_pct")}</Label><Input type="number" step="0.5" value={form.target_bonus_percent} onChange={(e) => setForm({ ...form, target_bonus_percent: +e.target.value || 0 })} /></div>
                    <div className="space-y-1.5">
                      <Label>{t("grade")}</Label>
                      <Select value={form.grade_id} onValueChange={(v) => setForm({ ...form, grade_id: v })}>
                        <SelectTrigger><SelectValue placeholder={t("pick_grade")} /></SelectTrigger>
                        <SelectContent>
                          {grades.map((g: any) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.grade_code} — {t("midpoint")} {fmtCurrency(Number(g.midpoint), defaultCurrency, locale)}
                            </SelectItem>
                          ))}
                        </SelectContent>
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
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>{t("cancel")}</Button>
                    <Button onClick={handleAdd}>{t("save")}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </>
        }
      />

      <div className="p-4 md:p-6 space-y-3">
        {!perms.canViewSalary && !perms.loading && (
          <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 p-3 text-xs">
            <ShieldAlert className="w-4 h-4 text-warning mt-0.5" />
            <span>{t("role_hides_salary", { role: perms.role ?? t("viewer") })}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("search_by_name_code")}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="ps-9"
            />
          </div>
          <Select value={deptFilter} onValueChange={(v) => { setDeptFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all_departments")}</SelectItem>
              {departments.map((d) => <SelectItem key={d as string} value={d as string}>{d as string}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {selected.size > 0 && perms.canDelete && (
          <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <span>{t("selected_n", { n: selected.size })}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>{t("clear")}</Button>
              <Button size="sm" variant="destructive" onClick={handleBulkArchive}>
                <Trash2 className="w-4 h-4 me-1" /> {t("archive_selected")}
              </Button>
            </div>
          </div>
        )}

        <div className="border rounded-lg bg-card overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">{t("loading")}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">{t("no_employees_match")}</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[920px]">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      {perms.canDelete && (
                        <th className="px-3 py-2.5 w-8">
                          <Checkbox checked={allOnPageSelected} onCheckedChange={togglePage} aria-label={t("select_page")} />
                        </th>
                      )}
                      <th className="text-start px-4 py-2.5">{t("code")}</th>
                      <th className="text-start px-4 py-2.5">{t("name")}</th>
                      <th className="text-start px-4 py-2.5">{t("department")}</th>
                      <th className="text-start px-4 py-2.5">{t("job_title")}</th>
                      <th className="text-start px-4 py-2.5">{t("grade")}</th>
                      <th className="text-end px-4 py-2.5">{t("base_salary")}</th>
                      <th className="text-end px-4 py-2.5">{t("compa")}</th>
                      <th className="text-end px-4 py-2.5">{t("target_pct_short")}</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((e: any) => {
                      const g: any = gradeMap.get(e.grade_id);
                      const compa = g ? compaRatio(Number(e.base_salary), Number(g.midpoint)) : null;
                      return (
                        <tr key={e.id} className="border-t hover:bg-muted/20">
                          {perms.canDelete && (
                            <td className="px-3 py-2.5">
                              <Checkbox checked={selected.has(e.id)} onCheckedChange={() => toggleOne(e.id)} aria-label={t("select_row")} />
                            </td>
                          )}
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{e.employee_code}</td>
                          <td className="px-4 py-2.5 font-medium">{e.full_name}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{e.department}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{e.job_title}</td>
                          <td className="px-4 py-2.5">{g?.grade_code ?? "—"}</td>
                          <td className="px-4 py-2.5 text-end num">
                            {perms.canViewSalary
                              ? fmtCurrency(Number(e.base_salary), defaultCurrency, locale)
                              : maskSalary(Number(e.base_salary), false)}
                          </td>
                          <td className="px-4 py-2.5 text-end num">{perms.canViewSalary ? compa?.toFixed(2) ?? "—" : "—"}</td>
                          <td className="px-4 py-2.5 text-end num">{e.target_bonus_percent}%</td>
                          <td className="px-4 py-2.5 text-end">
                            <div className="inline-flex gap-0.5">
                              {perms.canEdit && (
                                <Button size="icon" variant="ghost" onClick={() => openEdit(e)} aria-label={t("edit_employee")}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              )}
                              <Button asChild size="icon" variant="ghost">
                                <Link to="/app/employees/$id" params={{ id: e.id }}><Eye className="w-4 h-4" /></Link>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t px-4 py-2.5 text-xs text-muted-foreground">
                <span>
                  {t("showing_range", { from: (safePage - 1) * PAGE_SIZE + 1, to: Math.min(safePage * PAGE_SIZE, filtered.length), total: filtered.length })}
                </span>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" disabled={safePage === 1} onClick={() => setPage(safePage - 1)} aria-label={t("prev")}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="tabular-nums">{safePage} / {totalPages}</span>
                  <Button size="icon" variant="ghost" disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)} aria-label={t("next")}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) { setEditTarget(null); setEditForm(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("edit_employee")}{editTarget ? ` — ${editTarget.full_name ?? editTarget.employee_code}` : ""}</DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>{t("first_name")}</Label><Input value={editForm.first_name} onChange={(ev) => setEditForm({ ...editForm, first_name: ev.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("last_name")}</Label><Input value={editForm.last_name} onChange={(ev) => setEditForm({ ...editForm, last_name: ev.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("department")}</Label><Input value={editForm.department} onChange={(ev) => setEditForm({ ...editForm, department: ev.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("job_title")}</Label><Input value={editForm.job_title} onChange={(ev) => setEditForm({ ...editForm, job_title: ev.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("location")}</Label><Input value={editForm.location} onChange={(ev) => setEditForm({ ...editForm, location: ev.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("job_family")}</Label><Input value={editForm.job_family} onChange={(ev) => setEditForm({ ...editForm, job_family: ev.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("base_salary")}</Label><Input type="number" value={editForm.base_salary} onChange={(ev) => setEditForm({ ...editForm, base_salary: +ev.target.value || 0 })} /></div>
              <div className="space-y-1.5"><Label>{t("target_bonus_pct")}</Label><Input type="number" step="0.5" value={editForm.target_bonus_percent} onChange={(ev) => setEditForm({ ...editForm, target_bonus_percent: +ev.target.value || 0 })} /></div>
              <div className="space-y-1.5">
                <Label>{t("grade")}</Label>
                <Select value={editForm.grade_id} onValueChange={(v) => setEditForm({ ...editForm, grade_id: v })}>
                  <SelectTrigger><SelectValue placeholder={t("pick_grade")} /></SelectTrigger>
                  <SelectContent>
                    {grades.map((g: any) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.grade_code} — {t("midpoint")} {fmtCurrency(Number(g.midpoint), defaultCurrency, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("performance")}</Label>
                <Select value={editForm.performance_rating} onValueChange={(v) => setEditForm({ ...editForm, performance_rating: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PERFORMANCE_RATINGS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setEditTarget(null); setEditForm(null); }}>{t("cancel")}</Button>
            <Button onClick={handleSaveEdit}>{t("save_changes")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
