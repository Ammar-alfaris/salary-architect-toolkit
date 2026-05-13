import { useI18n } from "@/lib/i18n";
import type { ApprovalEntity } from "@/lib/governance";
import { TrendingUp, Gift, DollarSign, Users, Percent, Building2 } from "lucide-react";

interface Props {
  entityType: ApprovalEntity;
  entityLabel?: string;
  payload: Record<string, any>;
  requestedBy?: string;
  reason?: string;
}

function num(v: any) {
  const n = typeof v === "number" ? v : parseFloat(v);
  return isFinite(n) ? n : 0;
}

function formatCurrency(value: number, locale: string = "en") {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function ApprovalSummary({ entityType, entityLabel, payload, requestedBy, reason }: Props) {
  const { t, locale } = useI18n();

  if (entityType === "merit_cycle") {
    return <MeritCycleSummary payload={payload} entityLabel={entityLabel} requestedBy={requestedBy} reason={reason} />;
  }

  if (entityType === "bonus_cycle") {
    return <BonusCycleSummary payload={payload} entityLabel={entityLabel} requestedBy={requestedBy} reason={reason} />;
  }

  if (entityType === "salary_structure") {
    return <SalaryStructureSummary payload={payload} entityLabel={entityLabel} requestedBy={requestedBy} reason={reason} />;
  }

  // Fallback for unknown entity types
  return <GenericSummary payload={payload} entityLabel={entityLabel} requestedBy={requestedBy} reason={reason} />;
}

function MeritCycleSummary({ payload, entityLabel, requestedBy, reason }: Omit<Props, "entityType">) {
  const { t, locale } = useI18n();
  const recs: any[] = Array.isArray(payload.recommendations) ? payload.recommendations : [];
  
  // Calculate summary stats
  const totalIncrease = recs.reduce((sum, r) => sum + num(r.increase), 0);
  const avgPercent = recs.length > 0 
    ? recs.reduce((sum, r) => sum + num(r.pct), 0) / recs.length 
    : 0;
  const affectedEmployees = recs.length;
  
  // Group by department if available
  const deptMap = new Map<string, { count: number; totalIncrease: number }>();
  recs.forEach(r => {
    const dept = r.dept || r.department || t("unassigned");
    const existing = deptMap.get(dept) || { count: 0, totalIncrease: 0 };
    deptMap.set(dept, { 
      count: existing.count + 1, 
      totalIncrease: existing.totalIncrease + num(r.increase) 
    });
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 pb-3 border-b">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base">{entityLabel || t("merit_cycle")}</h3>
          {requestedBy && (
            <p className="text-xs text-muted-foreground mt-0.5">{t("requested_by")}: {requestedBy}</p>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SummaryCard 
          icon={<Users className="w-4 h-4" />} 
          label={t("employees") || "Employees"} 
          value={affectedEmployees.toString()} 
        />
        <SummaryCard 
          icon={<DollarSign className="w-4 h-4" />} 
          label={t("total_increase") || "Total Increase"} 
          value={formatCurrency(totalIncrease, locale)} 
        />
        <SummaryCard 
          icon={<Percent className="w-4 h-4" />} 
          label={t("avg_increase") || "Avg Increase"} 
          value={`${avgPercent.toFixed(1)}%`} 
        />
      </div>

      {/* Reason if provided */}
      {reason && (
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">{t("approval_reason") || "Reason"}</p>
          <p className="text-sm">{reason}</p>
        </div>
      )}

      {/* Department breakdown if multiple depts */}
      {deptMap.size > 1 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("by_department") || "By Department"}
          </p>
          <div className="grid gap-2">
            {Array.from(deptMap.entries()).map(([dept, data]) => (
              <div key={dept} className="flex items-center justify-between text-sm bg-card rounded-md px-3 py-2 border">
                <span className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  {dept}
                </span>
                <span className="text-muted-foreground">
                  {data.count} {t("employees")?.toLowerCase() || "employees"} · {formatCurrency(data.totalIncrease, locale)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Employee breakdown — table on tablet+, cards on mobile */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("employee_details") || "Employee Details"}
        </p>

        {/* Mobile: stacked cards */}
        <div className="grid gap-2 sm:hidden">
          {recs.length === 0 && (
            <div className="border rounded-lg p-4 text-center text-sm text-muted-foreground">{t("no_data") || "No employee data"}</div>
          )}
          {recs.slice(0, 50).map((r, i) => (
            <div key={r.id ?? i} className="border rounded-lg p-3 bg-card space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-sm break-words">{r.name ?? r.id}</div>
                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary tabular-nums shrink-0">
                  {num(r.pct).toFixed(1)}%
                </span>
              </div>
              {(r.dept || r.department) && (
                <div className="text-xs text-muted-foreground">{r.dept || r.department}</div>
              )}
              <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                <div>
                  <div className="text-muted-foreground">{t("current_salary") || "Current"}</div>
                  <div className="font-medium tabular-nums">{formatCurrency(num(r.base), locale)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t("increase_amount") || "Increase"}</div>
                  <div className="font-medium tabular-nums text-success">+{formatCurrency(num(r.increase), locale)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t("new_salary") || "New"}</div>
                  <div className="font-semibold tabular-nums">{formatCurrency(num(r.newSalary), locale)}</div>
                </div>
              </div>
            </div>
          ))}
          {recs.length > 50 && (
            <div className="text-center text-xs text-muted-foreground py-1">
              {t("and_more", { count: recs.length - 50 }) || `And ${recs.length - 50} more...`}
            </div>
          )}
        </div>

        {/* Tablet/Desktop: table */}
        <div className="hidden sm:block border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-xs text-muted-foreground">
                  <th className="text-start px-3 py-2 font-medium">{t("employee") || "Employee"}</th>
                  <th className="text-start px-3 py-2 font-medium">{t("department") || "Dept"}</th>
                  <th className="text-end px-3 py-2 font-medium">{t("current_salary") || "Current"}</th>
                  <th className="text-end px-3 py-2 font-medium">{t("increase_percent") || "Increase %"}</th>
                  <th className="text-end px-3 py-2 font-medium">{t("increase_amount") || "Amount"}</th>
                  <th className="text-end px-3 py-2 font-medium">{t("new_salary") || "New Salary"}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recs.slice(0, 50).map((r, i) => (
                  <tr key={r.id ?? i} className="hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{r.name ?? r.id}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.dept || r.department || "—"}</td>
                    <td className="px-3 py-2 text-end tabular-nums">{formatCurrency(num(r.base), locale)}</td>
                    <td className="px-3 py-2 text-end tabular-nums text-primary font-medium">{num(r.pct).toFixed(1)}%</td>
                    <td className="px-3 py-2 text-end tabular-nums text-success">+{formatCurrency(num(r.increase), locale)}</td>
                    <td className="px-3 py-2 text-end tabular-nums font-semibold">{formatCurrency(num(r.newSalary), locale)}</td>
                  </tr>
                ))}
                {recs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                      {t("no_data") || "No employee data"}
                    </td>
                  </tr>
                )}
                {recs.length > 50 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-2 text-center text-xs text-muted-foreground bg-muted/20">
                      {t("and_more", { count: recs.length - 50 }) || `And ${recs.length - 50} more employees...`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function BonusCycleSummary({ payload, entityLabel, requestedBy, reason }: Omit<Props, "entityType">) {
  const { t, locale } = useI18n();
  const results: any[] = Array.isArray(payload.results) ? payload.results : [];
  
  const totalBonus = results.reduce((sum, r) => sum + num(r.bonus), 0);
  const avgTarget = results.length > 0 
    ? results.reduce((sum, r) => sum + num(r.target), 0) / results.length 
    : 0;
  const perfMultiplier = payload.bulkPerf ?? 1;
  const bizMultiplier = payload.bulkBiz ?? 1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 pb-3 border-b">
        <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
          <Gift className="w-5 h-5 text-success" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base">{entityLabel || t("bonus_cycle")}</h3>
          {requestedBy && (
            <p className="text-xs text-muted-foreground mt-0.5">{t("requested_by")}: {requestedBy}</p>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard 
          icon={<Users className="w-4 h-4" />} 
          label={t("employees") || "Employees"} 
          value={results.length.toString()} 
        />
        <SummaryCard 
          icon={<DollarSign className="w-4 h-4" />} 
          label={t("total_bonus") || "Total Bonus"} 
          value={formatCurrency(totalBonus, locale)} 
        />
        <SummaryCard 
          icon={<TrendingUp className="w-4 h-4" />} 
          label={t("perf_multiplier") || "Performance"} 
          value={`${perfMultiplier}x`} 
        />
        <SummaryCard 
          icon={<Building2 className="w-4 h-4" />} 
          label={t("biz_multiplier") || "Business"} 
          value={`${bizMultiplier}x`} 
        />
      </div>

      {/* Reason */}
      {reason && (
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">{t("approval_reason") || "Reason"}</p>
          <p className="text-sm">{reason}</p>
        </div>
      )}

      {/* Employee breakdown */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("bonus_details") || "Bonus Details"}
        </p>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-xs text-muted-foreground">
                  <th className="text-start px-3 py-2 font-medium">{t("employee") || "Employee"}</th>
                  <th className="text-end px-3 py-2 font-medium">{t("base_salary") || "Base"}</th>
                  <th className="text-end px-3 py-2 font-medium">{t("target_percent") || "Target %"}</th>
                  <th className="text-end px-3 py-2 font-medium">{t("calculated_bonus") || "Bonus"}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {results.slice(0, 50).map((r, i) => (
                  <tr key={r.id ?? i} className="hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{r.name ?? r.id}</td>
                    <td className="px-3 py-2 text-end tabular-nums">{formatCurrency(num(r.base), locale)}</td>
                    <td className="px-3 py-2 text-end tabular-nums">{num(r.target).toFixed(1)}%</td>
                    <td className="px-3 py-2 text-end tabular-nums font-semibold text-success">{formatCurrency(num(r.bonus), locale)}</td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                      {t("no_data") || "No bonus data"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function SalaryStructureSummary({ payload, entityLabel, requestedBy, reason }: Omit<Props, "entityType">) {
  const { t, locale } = useI18n();
  
  // Extract structure details
  const grades = Array.isArray(payload.grades) ? payload.grades : [];
  const bands = Array.isArray(payload.bands) ? payload.bands : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 pb-3 border-b">
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <Building2 className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base">{entityLabel || t("salary_structure")}</h3>
          {requestedBy && (
            <p className="text-xs text-muted-foreground mt-0.5">{t("requested_by")}: {requestedBy}</p>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard 
          icon={<Users className="w-4 h-4" />} 
          label={t("grades") || "Grades"} 
          value={grades.length.toString()} 
        />
        <SummaryCard 
          icon={<TrendingUp className="w-4 h-4" />} 
          label={t("bands") || "Bands"} 
          value={bands.length.toString()} 
        />
      </div>

      {/* Reason */}
      {reason && (
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">{t("approval_reason") || "Reason"}</p>
          <p className="text-sm">{reason}</p>
        </div>
      )}

      {/* Structure details */}
      {Object.keys(payload).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("structure_details") || "Structure Details"}
          </p>
          <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
            {Object.entries(payload).map(([key, value]) => {
              if (Array.isArray(value)) return null;
              return (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                  <span className="font-medium">{String(value)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function GenericSummary({ payload, entityLabel, requestedBy, reason }: Omit<Props, "entityType">) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 pb-3 border-b">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <DollarSign className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base">{entityLabel || t("request")}</h3>
          {requestedBy && (
            <p className="text-xs text-muted-foreground mt-0.5">{t("requested_by")}: {requestedBy}</p>
          )}
        </div>
      </div>

      {/* Reason */}
      {reason && (
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">{t("approval_reason") || "Reason"}</p>
          <p className="text-sm">{reason}</p>
        </div>
      )}

      {/* Data display */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("details") || "Details"}
        </p>
        <div className="border rounded-lg divide-y">
          {Object.entries(payload).map(([key, value]) => (
            <div key={key} className="flex justify-between items-start px-3 py-2 text-sm">
              <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
              <span className="font-medium text-end max-w-[60%] break-words">
                {typeof value === "object" 
                  ? (Array.isArray(value) ? `${value.length} items` : "Object")
                  : String(value)
                }
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card border rounded-lg p-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="font-semibold text-base tabular-nums">{value}</p>
      </div>
    </div>
  );
}
