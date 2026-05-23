import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/lib/rbac";
import { supabase } from "@/integrations/supabase/client";
import { compaRatio, rangePenetration, rangePosition, PERFORMANCE_RATINGS } from "@/lib/comp";
import { fmtCurrency } from "@/lib/format";
import { logAudit } from "@/lib/audit";
import { ArrowLeft, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/employees/$id")({ component: EmployeeProfile });

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Intern"];
const EMPLOYMENT_STATUSES = ["active", "on_leave", "terminated"];
const GENDERS = ["Male", "Female", "Other"];

function EmployeeProfile() {
  const { id } = Route.useParams();
  const { t, locale } = useI18n();
  const { defaultCurrency, organizationId } = useAuth();
  const perms = usePermissions();
  const navigate = useNavigate();

  const [emp, setEmp] = useState<any>(null);
  const [grade, setGrade] = useState<any>(null);
  const [grades, setGrades] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [allowances, setAllowances] = useState<any>(null);
  const [customAllowances, setCustomAllowances] = useState<any[]>([]);
  const [fieldDefs, setFieldDefs] = useState<any[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [salaryHistory, setSalaryHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(null);


  const reload = async () => {
    setLoading(true);
    const { data: e } = await supabase.from("employees").select("*").eq("id", id).maybeSingle();
    setEmp(e);
    if (!e) { setLoading(false); return; }
    const [{ data: gs }, { data: ms }, { data: al }, { data: ca }, { data: fd }, { data: fv }, { data: sh }] = await Promise.all([
      supabase.from("salary_grades").select("*"),
      supabase.from("employees").select("id, full_name, employee_code").eq("organization_id", e.organization_id).eq("archived", false).neq("id", e.id).order("full_name"),
      supabase.from("employee_allowances").select("*").eq("employee_id", e.id).maybeSingle(),
      supabase.from("employee_custom_allowances").select("*").eq("employee_id", e.id).order("created_at"),
      supabase.from("org_custom_field_defs").select("*").eq("organization_id", e.organization_id).order("created_at"),
      supabase.from("employee_custom_field_values").select("*").eq("employee_id", e.id),
      supabase.from("salary_history").select("*").eq("employee_id", e.id).order("created_at", { ascending: false }).limit(50),
    ]);
    setGrades(gs ?? []);
    setManagers(ms ?? []);
    setAllowances(al ?? null);
    setCustomAllowances(ca ?? []);
    setFieldDefs(fd ?? []);
    setSalaryHistory(sh ?? []);

    const vmap: Record<string, string> = {};
    (fv ?? []).forEach((v: any) => { vmap[v.field_def_id] = v.value_text ?? ""; });
    setFieldValues(vmap);
    const g = (gs ?? []).find((x: any) => x.id === e.grade_id);
    setGrade(g ?? null);
    setLoading(false);
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [id]);

  const startEdit = () => {
    if (!emp) return;
    setForm({
      first_name: emp.first_name ?? "", last_name: emp.last_name ?? "", email: emp.email ?? "",
      phone_number: emp.phone_number ?? "", date_of_birth: emp.date_of_birth ?? "",
      nationality: emp.nationality ?? "", gender: emp.gender ?? "",
      employee_code: emp.employee_code ?? "", department: emp.department ?? "",
      job_title: emp.job_title ?? "", job_family: emp.job_family ?? "", location: emp.location ?? "",
      cost_center: emp.cost_center ?? "", business_unit: emp.business_unit ?? "",
      employment_type: emp.employment_type ?? "", employment_status: emp.employment_status ?? "active",
      hire_date: emp.hire_date ?? "", contract_start_date: emp.contract_start_date ?? "",
      contract_end_date: emp.contract_end_date ?? "", manager_id: emp.manager_id ?? "",
      grade_id: emp.grade_id ?? "", base_salary: Number(emp.base_salary) || 0,
      currency: emp.currency ?? defaultCurrency ?? "USD", salary_effective_date: emp.salary_effective_date ?? "",
      target_bonus_percent: Number(emp.target_bonus_percent) || 0,
      performance_rating: emp.performance_rating ?? "Meets",
      allowances: {
        housing_amount: Number(allowances?.housing_amount) || 0,
        transport_amount: Number(allowances?.transport_amount) || 0,
        mobile_amount: Number(allowances?.mobile_amount) || 0,
        food_amount: Number(allowances?.food_amount) || 0,
        shift_amount: Number(allowances?.shift_amount) || 0,
        hardship_amount: Number(allowances?.hardship_amount) || 0,
      },
      customAllowances: customAllowances.map((c) => ({ id: c.id, name: c.name, annual_amount: Number(c.annual_amount) || 0 })),
      fieldValues: { ...fieldValues },
    });
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setForm(null); };

  const save = async () => {
    if (!emp || !form || !organizationId) return;
    setSaving(true);
    try {
      const before = { base_salary: Number(emp.base_salary), grade_id: emp.grade_id, job_title: emp.job_title };
      const update: any = {
        first_name: form.first_name, last_name: form.last_name, email: form.email || null,
        phone_number: form.phone_number || null, date_of_birth: form.date_of_birth || null,
        nationality: form.nationality || null, gender: form.gender || null,
        employee_code: form.employee_code,
        department: form.department || null, job_title: form.job_title || null,
        job_family: form.job_family || null, location: form.location || null,
        cost_center: form.cost_center || null, business_unit: form.business_unit || null,
        employment_type: form.employment_type || null, employment_status: form.employment_status,
        hire_date: form.hire_date || null, contract_start_date: form.contract_start_date || null,
        contract_end_date: form.contract_end_date || null,
        manager_id: form.manager_id || null,
        grade_id: form.grade_id || null,
        base_salary: form.base_salary,
        currency: form.currency || null, salary_effective_date: form.salary_effective_date || null,
        target_bonus_percent: form.target_bonus_percent,
        performance_rating: form.performance_rating,
      };
      const { error: e1 } = await supabase.from("employees").update(update).eq("id", emp.id);
      if (e1) throw e1;

      // Salary history entry if base salary changed
      const prevSalary = Number(emp.base_salary) || 0;
      const nextSalary = Number(form.base_salary) || 0;
      if (prevSalary !== nextSalary) {
        const { data: u } = await supabase.auth.getUser();
        const pct = prevSalary > 0 ? ((nextSalary - prevSalary) / prevSalary) * 100 : null;
        await supabase.from("salary_history").insert({
          organization_id: organizationId,
          employee_id: emp.id,
          previous_salary: prevSalary,
          new_salary: nextSalary,
          change_percent: pct,
          currency: form.currency || null,
          effective_date: form.salary_effective_date || null,
          reason: "manual_edit",
          changed_by: u.user?.id ?? null,
          changed_by_email: u.user?.email ?? null,
        });
      }


      // Upsert standard allowances row
      const aPayload = {
        employee_id: emp.id,
        housing_amount: form.allowances.housing_amount,
        transport_amount: form.allowances.transport_amount,
        mobile_amount: form.allowances.mobile_amount,
        food_amount: form.allowances.food_amount,
        shift_amount: form.allowances.shift_amount,
        hardship_amount: form.allowances.hardship_amount,
        total_allowance_amount:
          form.allowances.housing_amount + form.allowances.transport_amount + form.allowances.mobile_amount +
          form.allowances.food_amount + form.allowances.shift_amount + form.allowances.hardship_amount,
      };
      if (allowances?.id) {
        await supabase.from("employee_allowances").update(aPayload).eq("id", allowances.id);
      } else {
        await supabase.from("employee_allowances").insert(aPayload);
      }

      // Diff custom allowances
      const existingIds = new Set(customAllowances.map((c) => c.id));
      const formIds = new Set(form.customAllowances.filter((c: any) => c.id).map((c: any) => c.id));
      const toDelete = [...existingIds].filter((x) => !formIds.has(x));
      if (toDelete.length) await supabase.from("employee_custom_allowances").delete().in("id", toDelete);
      for (const c of form.customAllowances) {
        if (!c.name) continue;
        if (c.id) {
          await supabase.from("employee_custom_allowances").update({ name: c.name, annual_amount: c.annual_amount }).eq("id", c.id);
        } else {
          await supabase.from("employee_custom_allowances").insert({ employee_id: emp.id, name: c.name, annual_amount: c.annual_amount });
        }
      }

      // Custom field values: upsert each
      for (const def of fieldDefs) {
        const val = form.fieldValues[def.id] ?? "";
        const existing = Object.prototype.hasOwnProperty.call(fieldValues, def.id);
        if (existing) {
          await supabase.from("employee_custom_field_values").update({ value_text: val }).eq("employee_id", emp.id).eq("field_def_id", def.id);
        } else if (val) {
          await supabase.from("employee_custom_field_values").insert({ employee_id: emp.id, field_def_id: def.id, value_text: val });
        }
      }

      await logAudit({
        organizationId, action: "update", entityType: "employee", entityId: emp.id,
        entityLabel: `${form.first_name} ${form.last_name}`, before, after: { base_salary: form.base_salary, grade_id: form.grade_id, job_title: form.job_title },
      });
      toast.success(t("save_profile"));
      setEditing(false); setForm(null);
      await reload();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const age = useMemo(() => {
    const dob = emp?.date_of_birth ? new Date(emp.date_of_birth) : null;
    if (!dob || isNaN(dob.getTime())) return null;
    const diff = Date.now() - dob.getTime();
    return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  }, [emp?.date_of_birth]);

  const yearsOfService = useMemo(() => {
    const h = emp?.hire_date ? new Date(emp.hire_date) : null;
    if (!h || isNaN(h.getTime())) return null;
    return ((Date.now() - h.getTime()) / (365.25 * 24 * 3600 * 1000)).toFixed(1);
  }, [emp?.hire_date]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">{t("loading")}</div>;
  if (!emp) return <div className="p-6">{t("not_found_short")}</div>;

  const cur = emp.currency || defaultCurrency || "USD";
  const stdAllowanceTotal = (allowances ? Number(allowances.housing_amount || 0) + Number(allowances.transport_amount || 0) + Number(allowances.mobile_amount || 0) + Number(allowances.food_amount || 0) + Number(allowances.shift_amount || 0) + Number(allowances.hardship_amount || 0) : 0);
  const customAllowanceTotal = customAllowances.reduce((s, c) => s + Number(c.annual_amount || 0), 0);
  const allowTotal = stdAllowanceTotal + customAllowanceTotal;
  const bonus = (Number(emp.base_salary) || 0) * (Number(emp.target_bonus_percent) || 0) / 100;
  const tcc = Number(emp.base_salary || 0) + bonus + allowTotal;
  const compa = grade ? compaRatio(Number(emp.base_salary), Number(grade.midpoint)) : 0;
  const penet = grade ? rangePenetration(Number(emp.base_salary), Number(grade.minimum), Number(grade.maximum)) : 0;
  const pos = grade ? rangePosition(Number(emp.base_salary), Number(grade.minimum), Number(grade.maximum)) : "in";

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="border rounded-lg bg-card p-5">
      <h3 className="font-semibold text-sm mb-4">{title}</h3>
      {children}
    </div>
  );

  const fField = (label: string, key: string, type: string = "text", opts?: string[]) => {
    if (!editing) {
      let v = (emp as any)[key];
      if (opts && v) v = v;
      return <Row label={label} value={v || "—"} />;
    }
    if (opts) {
      return (
        <div className="space-y-1.5"><Label className="text-xs">{label}</Label>
          <Select value={form[key] || ""} onValueChange={(v) => setForm({ ...form, [key]: v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      );
    }
    return (
      <div className="space-y-1.5"><Label className="text-xs">{label}</Label>
        <Input type={type} value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: type === "number" ? (+e.target.value || 0) : e.target.value })} />
      </div>
    );
  };

  const aField = (label: string, key: string) => {
    if (!editing) {
      const v = allowances ? Number((allowances as any)[key]) || 0 : 0;
      return <Row label={label} value={fmtCurrency(v, cur, locale)} />;
    }
    return (
      <div className="space-y-1.5"><Label className="text-xs">{label}</Label>
        <Input type="number" value={form.allowances[key]} onChange={(e) => setForm({ ...form, allowances: { ...form.allowances, [key]: +e.target.value || 0 } })} />
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title={emp.full_name || `${emp.first_name} ${emp.last_name}`}
        subtitle={`${emp.employee_code}${emp.job_title ? " • " + emp.job_title : ""}${emp.department ? " • " + emp.department : ""}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm"><Link to="/app/employees"><ArrowLeft className="w-4 h-4 me-1" />{t("back")}</Link></Button>
            {perms.canEdit && !editing && <Button size="sm" onClick={startEdit}><Pencil className="w-4 h-4 me-1" />{t("edit_profile")}</Button>}
            {editing && <>
              <Button size="sm" variant="outline" onClick={cancelEdit}><X className="w-4 h-4 me-1" />{t("cancel")}</Button>
              <Button size="sm" onClick={save} disabled={saving}><Save className="w-4 h-4 me-1" />{saving ? t("saving") : t("save_profile")}</Button>
            </>}
          </>
        }
      />
      <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title={t("personal_info")}>
          <div className="grid grid-cols-2 gap-3">
            {fField(t("first_name"), "first_name")}
            {fField(t("last_name"), "last_name")}
            {fField(t("email") || "Email", "email")}
            {fField(t("phone_number"), "phone_number")}
            {fField(t("date_of_birth"), "date_of_birth", "date")}
            {!editing && age != null && <Row label={t("age")} value={age} />}
            {fField(t("nationality"), "nationality")}
            {fField(t("gender"), "gender", "text", GENDERS)}
          </div>
        </Section>

        <Section title={t("employment_info")}>
          <div className="grid grid-cols-2 gap-3">
            {fField(t("code"), "employee_code")}
            {fField(t("department"), "department")}
            {fField(t("job_title"), "job_title")}
            {fField(t("job_family"), "job_family")}
            {fField(t("location"), "location")}
            {fField(t("cost_center"), "cost_center")}
            {fField(t("business_unit"), "business_unit")}
            {fField(t("employment_type"), "employment_type", "text", EMPLOYMENT_TYPES)}
            {fField(t("status"), "employment_status", "text", EMPLOYMENT_STATUSES)}
            {fField(t("hire_date") || "Hire date", "hire_date", "date")}
            {fField(t("contract_start_date"), "contract_start_date", "date")}
            {fField(t("contract_end_date"), "contract_end_date", "date")}
            {!editing && yearsOfService && <Row label={t("years_of_service")} value={yearsOfService} />}
            <div className="space-y-1.5 col-span-2"><Label className="text-xs">{t("direct_manager")}</Label>
              {editing ? (
                <Select value={form.manager_id || "__none__"} onValueChange={(v) => setForm({ ...form, manager_id: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder={t("pick_manager")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("no_manager")}</SelectItem>
                    {managers.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name} ({m.employee_code})</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-sm">{managers.find((m) => m.id === emp.manager_id)?.full_name || emp.manager_name || "—"}</div>
              )}
            </div>
          </div>
        </Section>

        <Section title={t("compensation_info")}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2"><Label className="text-xs">{t("grade")}</Label>
              {editing ? (
                <Select value={form.grade_id || "__none__"} onValueChange={(v) => setForm({ ...form, grade_id: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder={t("pick_grade")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {grades.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.grade_code} — {fmtCurrency(Number(g.midpoint), cur, locale)}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : <div className="text-sm">{grade?.grade_code ?? "—"}</div>}
            </div>
            {fField(t("base_salary"), "base_salary", "number")}
            {fField(t("currency_label"), "currency")}
            {fField(t("salary_effective_date"), "salary_effective_date", "date")}
            {fField(t("target_bonus_pct"), "target_bonus_percent", "number")}
            {fField(t("performance"), "performance_rating", "text", PERFORMANCE_RATINGS)}
            {!editing && grade && <>
              <Row label={t("compa_ratio_label")} value={compa.toFixed(2)} />
              <Row label={t("range_penetration")} value={`${(penet * 100).toFixed(0)}%`} />
              <Row label={t("position")} value={pos === "in" ? t("pos_in") : pos === "below" ? t("pos_below") : t("pos_above")} />
            </>}
          </div>
          {!editing && (
            <div className="mt-4 pt-4 border-t text-sm space-y-1">
              <Row label={t("base")} value={fmtCurrency(Number(emp.base_salary), cur, locale)} />
              <Row label={t("target_bonus_paren", { pct: emp.target_bonus_percent })} value={fmtCurrency(bonus, cur, locale)} />
              <Row label={t("estimated_allowances")} value={fmtCurrency(allowTotal, cur, locale)} />
              <div className="flex justify-between border-t pt-2 mt-2"><span className="font-medium">{t("total_cash_comp_short")}</span><span className="num font-semibold">{fmtCurrency(tcc, cur, locale)}</span></div>
            </div>
          )}
        </Section>

        <Section title={t("allowances_section")}>
          <div className="grid grid-cols-2 gap-3">
            {aField(t("housing_allowance"), "housing_amount")}
            {aField(t("transportation_allowance"), "transport_amount")}
            {aField(t("mobile_allowance"), "mobile_amount")}
            {aField(t("food_allowance"), "food_amount")}
            {aField(t("shift_allowance"), "shift_amount")}
            {aField(t("hardship_allowance"), "hardship_amount")}
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">{t("add_custom_allowance")}</h4>
              {editing && <Button size="sm" variant="outline" onClick={() => setForm({ ...form, customAllowances: [...form.customAllowances, { name: "", annual_amount: 0 }] })}><Plus className="w-3 h-3 me-1" />{t("add_custom_allowance")}</Button>}
            </div>
            <div className="space-y-2">
              {(editing ? form.customAllowances : customAllowances).map((c: any, i: number) => editing ? (
                <div key={i} className="flex gap-2 items-end">
                  <div className="flex-1"><Label className="text-xs">{t("custom_allowance_name")}</Label><Input value={c.name} onChange={(e) => { const next = [...form.customAllowances]; next[i] = { ...c, name: e.target.value }; setForm({ ...form, customAllowances: next }); }} /></div>
                  <div className="w-32"><Label className="text-xs">{t("annual_amount")}</Label><Input type="number" value={c.annual_amount} onChange={(e) => { const next = [...form.customAllowances]; next[i] = { ...c, annual_amount: +e.target.value || 0 }; setForm({ ...form, customAllowances: next }); }} /></div>
                  <Button size="icon" variant="ghost" onClick={() => { const next = [...form.customAllowances]; next.splice(i, 1); setForm({ ...form, customAllowances: next }); }}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ) : (
                <Row key={c.id} label={c.name} value={fmtCurrency(Number(c.annual_amount), cur, locale)} />
              ))}
              {!editing && customAllowances.length === 0 && <p className="text-xs text-muted-foreground">—</p>}
            </div>
            <div className="flex justify-between border-t pt-2 mt-3 text-sm"><span className="font-medium">{t("estimated_allowances")}</span><span className="num font-semibold">{fmtCurrency(allowTotal, cur, locale)}</span></div>
          </div>
        </Section>

        {fieldDefs.length > 0 && (
          <Section title={t("custom_fields")}>
            <div className="grid grid-cols-2 gap-3">
              {fieldDefs.map((def) => editing ? (
                <div key={def.id} className="space-y-1.5">
                  <Label className="text-xs">{def.label}</Label>
                  <Input type={def.field_type === "number" ? "number" : def.field_type === "date" ? "date" : "text"} value={form.fieldValues[def.id] ?? ""} onChange={(e) => setForm({ ...form, fieldValues: { ...form.fieldValues, [def.id]: e.target.value } })} />
                </div>
              ) : (
                <Row key={def.id} label={def.label} value={fieldValues[def.id] || "—"} />
              ))}
            </div>
          </Section>
        )}

        <div className="lg:col-span-2">
          <Section title={t("salary_history") || "Salary history"}>
            {salaryHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("no_salary_history") || "No salary changes recorded yet."}</p>
            ) : (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground border-b">
                    <tr>
                      <th className="text-start py-2 pe-3">{t("date") || "Date"}</th>
                      <th className="text-end py-2 px-3">{t("previous") || "Previous"}</th>
                      <th className="text-end py-2 px-3">{t("new") || "New"}</th>
                      <th className="text-end py-2 px-3">%</th>
                      <th className="text-start py-2 px-3">{t("reason") || "Reason"}</th>
                      <th className="text-start py-2 ps-3">{t("by") || "By"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryHistory.map((h) => (
                      <tr key={h.id} className="border-b last:border-0">
                        <td className="py-2 pe-3 text-muted-foreground whitespace-nowrap">{new Date(h.created_at).toLocaleDateString(locale === "ar" ? "ar" : "en")}</td>
                        <td className="py-2 px-3 text-end num">{h.previous_salary != null ? fmtCurrency(Number(h.previous_salary), h.currency || cur, locale) : "—"}</td>
                        <td className="py-2 px-3 text-end num font-medium">{fmtCurrency(Number(h.new_salary), h.currency || cur, locale)}</td>
                        <td className={`py-2 px-3 text-end num ${Number(h.change_amount) > 0 ? "text-success" : Number(h.change_amount) < 0 ? "text-destructive" : ""}`}>
                          {h.change_percent != null ? `${Number(h.change_percent) > 0 ? "+" : ""}${Number(h.change_percent).toFixed(1)}%` : "—"}
                        </td>
                        <td className="py-2 px-3 text-xs">{t(`salary_reason_${h.reason}`) || h.reason}</td>
                        <td className="py-2 ps-3 text-xs text-muted-foreground truncate max-w-[160px]">{h.changed_by_email || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}


function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between gap-4 text-sm"><dt className="text-muted-foreground">{label}</dt><dd className="text-end num">{value ?? "—"}</dd></div>;
}
