import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { autoAssignGrades } from "@/lib/auto-assign";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { generateGrades } from "@/lib/comp";
import { fmtCurrency } from "@/lib/format";
import { logAudit } from "@/lib/audit";
import { usePermissions } from "@/lib/rbac";
import { exportXLSX } from "@/lib/excel";
import { toast } from "sonner";
import { Plus, Layers, Trash2, Eye, FileSpreadsheet, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/app/structures")({ component: StructuresPage });

function StructuresPage() {
  const { organizationId, user } = useAuth();
  const { t, locale } = useI18n();
  const perms = usePermissions();
  const [structures, setStructures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // Builder form state
  const [name, setName] = useState(t("default_structure_name"));
  const [currency, setCurrency] = useState("USD");
  const [country, setCountry] = useState("");
  const [gradeCount, setGradeCount] = useState(10);
  const [startingMidpoint, setStartingMidpoint] = useState(30000);
  const [progressionPercent, setProgressionPercent] = useState(12);
  const [spreadPercent, setSpreadPercent] = useState(40);
  const [rounding, setRounding] = useState(100);

  const refresh = async () => {
    if (!organizationId) return;
    const { data } = await supabase.from("salary_structures").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false });
    setStructures(data ?? []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [organizationId]);

  const preview = generateGrades({ gradeCount, startingMidpoint, progressionPercent, spreadPercent, rounding });

  const handleGenerate = async () => {
    if (!organizationId || !user) return;
    if (!perms.canEdit) return toast.error(t("insufficient_permissions"));
    const { data: structure, error } = await supabase.from("salary_structures").insert({
      organization_id: organizationId,
      name, currency, country: country || null,
      grade_count: gradeCount,
      starting_midpoint: startingMidpoint,
      progression_type: "fixed",
      default_progression_percent: progressionPercent,
      spread_type: "fixed",
      default_spread_percent: spreadPercent,
      rounding_rule: rounding,
      created_by: user.id,
    }).select().single();
    if (error) return toast.error(error.message);

    const grades = preview.map((g) => ({
      salary_structure_id: structure.id,
      grade_code: g.grade_code,
      grade_name: g.grade_name,
      sequence: g.sequence,
      midpoint: g.midpoint,
      minimum: g.minimum,
      maximum: g.maximum,
      spread_percent: g.spread_percent,
      progression_percent: g.progression_percent,
    }));
    const { error: gErr } = await supabase.from("salary_grades").insert(grades);
    if (gErr) return toast.error(gErr.message);
    toast.success(t("created_with_grades", { name, n: grades.length }));
    await logAudit({
      organizationId,
      action: "create",
      entityType: "salary_structure",
      entityId: structure.id,
      entityLabel: name,
      after: { currency, gradeCount, startingMidpoint, progressionPercent, spreadPercent, rounding },
    });
    setOpen(false);
    refresh();
  };

  const handleArchive = async (s: any) => {
    if (!perms.canDelete) return toast.error(t("admin_only"));
    await supabase.from("salary_structures").update({ archived: true }).eq("id", s.id);
    if (organizationId) {
      await logAudit({ organizationId, action: "archive", entityType: "salary_structure", entityId: s.id, entityLabel: s.name });
    }
    refresh();
  };

  const handleDelete = async (s: any) => {
    if (!perms.canDelete) return toast.error(t("admin_only"));
    await supabase.from("salary_grades").delete().eq("salary_structure_id", s.id);
    const { error } = await supabase.from("salary_structures").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    if (organizationId) {
      await logAudit({ organizationId, action: "delete", entityType: "salary_structure", entityId: s.id, entityLabel: s.name });
    }
    toast.success(t("settings_saved"));
    refresh();
  };

  const handleExportAll = async () => {
    if (!organizationId) return;
    const { data: gs } = await supabase
      .from("salary_grades")
      .select("*, salary_structures!inner(name, organization_id, currency)")
      .eq("salary_structures.organization_id", organizationId);
    const rows = (gs ?? []).map((g: any) => ({
      Structure: g.salary_structures?.name,
      Currency: g.salary_structures?.currency,
      Grade: g.grade_code,
      Sequence: g.sequence,
      Min: Number(g.minimum),
      Mid: Number(g.midpoint),
      Max: Number(g.maximum),
      SpreadPct: Number(g.spread_percent),
    }));
    exportXLSX("salary-structures.xlsx", rows, "Grades");
    await logAudit({ organizationId, action: "export", entityType: "salary_structure", entityLabel: `${rows.length} grades` });
  };

  return (
    <div>
      <PageHeader
        title={t("salary_structures")}
        subtitle={t("structures_subtitle")}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={handleExportAll} disabled={!structures.length}>
              <FileSpreadsheet className="w-4 h-4 me-1" />{t("excel")}
            </Button>
            {perms.canEdit && (
              <Button size="sm" onClick={() => setOpen(!open)}>
                <Plus className="w-4 h-4 me-1" />{open ? t("cancel") : t("create_structure")}
              </Button>
            )}
          </>
        }
      />

      <div className="p-4 md:p-6 space-y-4">
        {open && (
          <div className="border rounded-lg bg-card p-5 space-y-5">
            <h3 className="font-semibold text-sm">{t("structure_basics")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>{t("structure_name_label")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-1.5">
                <Label>{t("currency")}</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["USD", "EUR", "GBP", "AED", "SAR", "EGP", "JOD", "KWD"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>{t("country_optional")}</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} /></div>
            </div>

            <h3 className="font-semibold text-sm pt-2">{t("midpoint_logic")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1.5"><Label>{t("number_of_grades")}</Label><Input type="number" min={2} max={30} value={gradeCount} onChange={(e) => setGradeCount(+e.target.value || 0)} /></div>
              <div className="space-y-1.5"><Label>{t("starting_midpoint")}</Label><Input type="number" value={startingMidpoint} onChange={(e) => setStartingMidpoint(+e.target.value || 0)} /></div>
              <div className="space-y-1.5"><Label>{t("progression_per_grade")}</Label><Input type="number" step="0.5" value={progressionPercent} onChange={(e) => setProgressionPercent(+e.target.value || 0)} /></div>
              <div className="space-y-1.5"><Label>{t("spread_min_max")}</Label><Input type="number" step="1" value={spreadPercent} onChange={(e) => setSpreadPercent(+e.target.value || 0)} /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label>{t("rounding")}</Label>
                <Select value={String(rounding)} onValueChange={(v) => setRounding(+v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1, 10, 50, 100, 500, 1000].map((r) => <SelectItem key={r} value={String(r)}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">{t("preview")}</h3>
                <p className="text-xs text-muted-foreground">{t("formula_helper", { n: rounding })}</p>
              </div>
              <div className="overflow-x-auto rounded border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr><th className="text-start px-3 py-2">{t("grade")}</th><th className="text-end px-3 py-2 num">{t("minimum")}</th><th className="text-end px-3 py-2 num">{t("midpoint")}</th><th className="text-end px-3 py-2 num">{t("maximum")}</th><th className="text-end px-3 py-2 num">{t("spread")}</th></tr>
                  </thead>
                  <tbody>
                    {preview.map((g) => (
                      <tr key={g.sequence} className="border-t">
                        <td className="px-3 py-2 font-medium">{g.grade_code}</td>
                        <td className="px-3 py-2 text-end num">{fmtCurrency(g.minimum, currency, locale)}</td>
                        <td className="px-3 py-2 text-end num font-medium">{fmtCurrency(g.midpoint, currency, locale)}</td>
                        <td className="px-3 py-2 text-end num">{fmtCurrency(g.maximum, currency, locale)}</td>
                        <td className="px-3 py-2 text-end num text-muted-foreground">{g.spread_percent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>{t("cancel")}</Button>
              <Button onClick={handleGenerate}>{t("generate_and_save")}</Button>
            </div>
          </div>
        )}

        <div className="border rounded-lg bg-card overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">{t("loading")}</div>
          ) : structures.length === 0 ? (
            <div className="p-12 text-center">
              <Layers className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t("no_structures_msg")}</p>
              <Button size="sm" className="mt-3" onClick={() => setOpen(true)}><Plus className="w-4 h-4 me-1" />{t("create_structure")}</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr><th className="text-start px-4 py-2.5">{t("name")}</th><th className="text-start px-4 py-2.5">{t("currency")}</th><th className="text-end px-4 py-2.5">{t("grades")}</th><th className="text-end px-4 py-2.5">{t("start_mid")}</th><th className="text-end px-4 py-2.5">{t("effective")}</th><th className="text-end px-4 py-2.5">{t("status")}</th><th className="px-4 py-2.5"></th></tr>
                </thead>
                <tbody>
                  {structures.map((s) => (
                    <tr key={s.id} className="border-t hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-medium">{s.name}</td>
                      <td className="px-4 py-2.5">{s.currency}</td>
                      <td className="px-4 py-2.5 text-end num">{s.grade_count}</td>
                      <td className="px-4 py-2.5 text-end num">{fmtCurrency(Number(s.starting_midpoint), s.currency, locale)}</td>
                      <td className="px-4 py-2.5 text-end text-muted-foreground">{new Date(s.effective_date).toLocaleDateString(locale === "ar" ? "ar" : "en-US")}</td>
                      <td className="px-4 py-2.5 text-end"><span className={`text-xs px-2 py-0.5 rounded-full ${s.archived ? "bg-muted" : "bg-success/15 text-success"}`}>{s.archived ? t("archived") : t("active")}</span></td>
                      <td className="px-4 py-2.5 text-end">
                        <div className="flex gap-1 justify-end">
                          <Button asChild size="icon" variant="ghost"><Link to="/app/matrix"><Eye className="w-4 h-4" /></Link></Button>
                          {!s.archived && perms.canDelete && <Button size="icon" variant="ghost" onClick={() => handleArchive(s)} title={t("archived")}><Trash2 className="w-4 h-4" /></Button>}
                          {perms.canDelete && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" title={t("delete_permanent")}><X className="w-4 h-4" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t("delete_structure_confirm")}</AlertDialogTitle>
                                  <AlertDialogDescription>{t("delete_structure_warn")}</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(s)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("delete_permanent")}</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
