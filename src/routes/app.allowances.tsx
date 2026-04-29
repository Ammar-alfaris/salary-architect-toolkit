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

export const Route = createFileRoute("/app/allowances")({ component: AllowancesPage });

function AllowancesPage() {
  const { organizationId } = useAuth();
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

  const breakdown = [
    { label: "Housing", value: result.housing }, { label: "Transportation", value: result.transport },
    { label: "Mobile", value: result.mobile }, { label: "Education", value: result.education },
    { label: "Shift", value: result.shift }, { label: "Hardship", value: result.hardship },
    { label: "Custom", value: result.custom },
  ].filter((x) => x.value > 0);

  return (
    <div>
      <PageHeader
        title={t("allowances")}
        subtitle="Apply allowance policies and recommend amounts"
        actions={<Button variant="outline" size="sm" onClick={() => exportCSV("allowances.csv", breakdown)}><Download className="w-4 h-4 me-1" />{t("export_csv")}</Button>}
      />

      <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 border rounded-lg bg-card p-5 space-y-4">
          <h3 className="font-semibold text-sm">Policy & employee</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Select employee or enter manually" /></SelectTrigger>
                <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>{t("base_salary")}</Label><Input type="number" value={base} onChange={(e) => setBase(+e.target.value || 0)} /></div>
          </div>
          <h3 className="font-semibold text-sm pt-2">Allowance components</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Housing % of base</Label><Input type="number" step="1" value={housingPct} onChange={(e) => setHousingPct(+e.target.value || 0)} /></div>
            <div className="space-y-1.5"><Label>Transportation % of base</Label><Input type="number" step="1" value={transportPct} onChange={(e) => setTransportPct(+e.target.value || 0)} /></div>
            <div className="space-y-1.5"><Label>Mobile (fixed monthly)</Label><Input type="number" value={mobile} onChange={(e) => setMobile(+e.target.value || 0)} /></div>
            <div className="space-y-1.5"><Label>Education (annual)</Label><Input type="number" value={education} onChange={(e) => setEducation(+e.target.value || 0)} /></div>
            <div className="space-y-1.5"><Label>Shift %</Label><Input type="number" step="1" value={shiftPct} onChange={(e) => setShiftPct(+e.target.value || 0)} /></div>
            <div className="space-y-1.5"><Label>Hardship %</Label><Input type="number" step="1" value={hardshipPct} onChange={(e) => setHardshipPct(+e.target.value || 0)} /></div>
            <div className="space-y-1.5 md:col-span-2"><Label>Custom (annual)</Label><Input type="number" value={custom} onChange={(e) => setCustom(+e.target.value || 0)} /></div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border rounded-lg bg-card p-5">
            <div className="flex items-center gap-2 mb-2"><Wallet className="w-4 h-4 text-accent" /><h3 className="font-semibold text-sm">Total allowances</h3></div>
            <div className="text-3xl font-semibold num">{fmtCurrency(result.total, "USD", locale)}</div>
            <p className="text-xs text-muted-foreground mt-1">Annual • {fmtCurrency(monthly, "USD", locale)}/mo</p>
            <div className="mt-4 pt-4 border-t space-y-1.5 text-sm">
              {breakdown.map((b) => (
                <div key={b.label} className="flex justify-between"><span className="text-muted-foreground">{b.label}</span><span className="num font-medium">{fmtCurrency(b.value, "USD", locale)}</span></div>
              ))}
            </div>
          </div>
          <div className="border rounded-lg bg-card p-5">
            <h3 className="font-semibold text-sm">Total cash compensation</h3>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Base</span><span className="num">{fmtCurrency(base, "USD", locale)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Allowances</span><span className="num">{fmtCurrency(result.total, "USD", locale)}</span></div>
              <div className="flex justify-between border-t pt-2 mt-2"><span className="font-medium">Total</span><span className="num font-semibold">{fmtCurrency(base + result.total, "USD", locale)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
