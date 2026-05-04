import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { calculateAllowances, exportCSV } from "@/lib/comp";
import { fmtCurrency } from "@/lib/format";
import { Wallet, Download } from "lucide-react";
import { ApplyOrApprove } from "@/components/apply-or-approve";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";

export const Route = createFileRoute("/app/allowances")({ component: AllowancesPage });

function AllowancesPage() {
  const { organizationId, defaultCurrency } = useAuth();
  const { t, locale } = useI18n();
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [base, setBase] = useState(60000);
  const [housingPct, setHousingPct] = useState(25);
  const [transportPct, setTransportPct] = useState(10);
  const [mobile, setMobile] = useState(50);
  const [education, setEducation] = useState(0);
  const [shiftPct, setShiftPct] = useState(0);
  const [hardshipPct, setHardshipPct] = useState(0);
  const [custom, setCustom] = useState(0);

  useEffect(() => {
    if (!organizationId) return;
    supabase.from("employees").select("*").eq("organization_id", organizationId).eq("archived", false).then(({ data }) => setEmployees(data ?? []));
  }, [organizationId]);

  useEffect(() => {
    const e = employees.find((x) => x.id === employeeId);
    if (e) setBase(Number(e.base_salary));
  }, [employeeId, employees]);

  const result = calculateAllowances({
    baseSalary: base, housingPercent: housingPct, transportPercent: transportPct,
    mobileAmount: mobile, educationAmount: education, shiftPercent: shiftPct,
    hardshipPercent: hardshipPct, customAmount: custom,
  });

  const monthly = result.total / 12;

  const applyAllowance = async () => {
    if (!employeeId || !organizationId) { toast.error(t("select_employee_or_manual")); return; }
    if (!confirm(t("apply_allowance_confirm"))) return;
    try {
      await supabase.from("employee_allowances").insert({
        employee_id: employeeId,
        housing_amount: result.housing,
        transport_amount: result.transport,
        mobile_amount: result.mobile,
        education_amount: result.education,
        shift_amount: result.shift,
        hardship_amount: result.hardship,
        custom_amount: result.custom,
        total_allowance_amount: result.total,
      } as never);
      await logAudit({ organizationId, action: "update", entityType: "employee" as any, entityId: employeeId, entityLabel: "Allowance change", metadata: { total: result.total } });
      toast.success(t("apply_allowance_done"));
    } catch (e: any) { toast.error(e.message); }
  };


  const breakdown = [
    { label: t("housing"), value: result.housing }, { label: t("transportation"), value: result.transport },
    { label: t("mobile"), value: result.mobile }, { label: t("education"), value: result.education },
    { label: t("shift"), value: result.shift }, { label: t("hardship"), value: result.hardship },
    { label: t("custom"), value: result.custom },
  ].filter((x) => x.value > 0);

  return (
    <div>
      <PageHeader
        title={t("allowances")}
        subtitle={t("allowances_subtitle")}
        actions={<Button variant="outline" size="sm" onClick={() => exportCSV("allowances.csv", breakdown)}><Download className="w-4 h-4 me-1" />{t("export_csv")}</Button>}
      />

      <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 border rounded-lg bg-card p-5 space-y-4">
          <h3 className="font-semibold text-sm">{t("policy_and_employee")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("employee")}</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger><SelectValue placeholder={t("select_employee_or_manual")} /></SelectTrigger>
                <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>{t("base_salary")}</Label><Input type="number" value={base} onChange={(e) => setBase(+e.target.value || 0)} /></div>
          </div>
          <h3 className="font-semibold text-sm pt-2">{t("allowance_components")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t("housing_pct_base")}</Label><Input type="number" step="1" value={housingPct} onChange={(e) => setHousingPct(+e.target.value || 0)} /></div>
            <div className="space-y-1.5"><Label>{t("transportation_pct_base")}</Label><Input type="number" step="1" value={transportPct} onChange={(e) => setTransportPct(+e.target.value || 0)} /></div>
            <div className="space-y-1.5"><Label>{t("mobile_fixed_monthly")}</Label><Input type="number" value={mobile} onChange={(e) => setMobile(+e.target.value || 0)} /></div>
            <div className="space-y-1.5"><Label>{t("education_annual")}</Label><Input type="number" value={education} onChange={(e) => setEducation(+e.target.value || 0)} /></div>
            <div className="space-y-1.5"><Label>{t("shift_pct")}</Label><Input type="number" step="1" value={shiftPct} onChange={(e) => setShiftPct(+e.target.value || 0)} /></div>
            <div className="space-y-1.5"><Label>{t("hardship_pct")}</Label><Input type="number" step="1" value={hardshipPct} onChange={(e) => setHardshipPct(+e.target.value || 0)} /></div>
            <div className="space-y-1.5 md:col-span-2"><Label>{t("custom_annual")}</Label><Input type="number" value={custom} onChange={(e) => setCustom(+e.target.value || 0)} /></div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border rounded-lg bg-card p-5">
            <div className="flex items-center gap-2 mb-2"><Wallet className="w-4 h-4 text-accent" /><h3 className="font-semibold text-sm">{t("total_allowances")}</h3></div>
            <div className="text-3xl font-semibold num">{fmtCurrency(result.total, defaultCurrency, locale)}</div>
            <p className="text-xs text-muted-foreground mt-1">{t("annual")} • {fmtCurrency(monthly, defaultCurrency, locale)}{t("monthly_equiv_short")}</p>
            <div className="mt-4 pt-4 border-t space-y-1.5 text-sm">
              {breakdown.map((b) => (
                <div key={b.label} className="flex justify-between"><span className="text-muted-foreground">{b.label}</span><span className="num font-medium">{fmtCurrency(b.value, defaultCurrency, locale)}</span></div>
              ))}
            </div>
          </div>
          <div className="border rounded-lg bg-card p-5">
            <h3 className="font-semibold text-sm">{t("total_cash_compensation")}</h3>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t("base")}</span><span className="num">{fmtCurrency(base, defaultCurrency, locale)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("allowances")}</span><span className="num">{fmtCurrency(result.total, defaultCurrency, locale)}</span></div>
              <div className="flex justify-between border-t pt-2 mt-2"><span className="font-medium">{t("total")}</span><span className="num font-semibold">{fmtCurrency(base + result.total, defaultCurrency, locale)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
