import { createFileRoute } from "@tanstack/react-router";
import { fmtDateTime } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { exportXLSX } from "@/lib/excel";
import { Download, ShieldCheck, Search } from "lucide-react";

export const Route = createFileRoute("/app/audit")({ component: AuditPage });

const ACTION_BADGE: Record<string, string> = {
  create: "bg-success/15 text-success",
  update: "bg-primary/15 text-primary",
  delete: "bg-destructive/15 text-destructive",
  archive: "bg-muted text-muted-foreground",
  bulk_update: "bg-primary/15 text-primary",
  bulk_delete: "bg-destructive/15 text-destructive",
  export: "bg-accent text-accent-foreground",
  run_cycle: "bg-warning/15 text-warning",
};

function AuditPage() {
  const { organizationId } = useAuth();
  const { t, locale } = useI18n();
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["audit_logs", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = (data ?? []).filter((r) => {
    const okSearch =
      !search ||
      r.actor_email?.toLowerCase().includes(search.toLowerCase()) ||
      r.entity_label?.toLowerCase().includes(search.toLowerCase()) ||
      r.action.toLowerCase().includes(search.toLowerCase());
    const okEntity = entityFilter === "all" || r.entity_type === entityFilter;
    return okSearch && okEntity;
  });

  const handleExport = () =>
    exportXLSX(
      "audit-logs.xlsx",
      rows.map((r) => ({
        Date: fmtDateTime(r.created_at, locale),
        Actor: r.actor_email,
        Action: r.action,
        Entity: r.entity_type,
        Label: r.entity_label,
      })),
    );

  return (
    <div>
      <PageHeader
        title={t("audit_log")}
        subtitle={t("audit_subtitle", { n: rows.length })}
        actions={
          <Button size="sm" variant="outline" onClick={handleExport} disabled={!rows.length}>
            <Download className="w-4 h-4 me-1" />
            {t("export_excel")}
          </Button>
        }
      />
      <div className="p-4 md:p-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("audit_search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all_entities")}</SelectItem>
              <SelectItem value="employee">{t("ent_employee")}</SelectItem>
              <SelectItem value="salary_structure">{t("ent_salary_structure")}</SelectItem>
              <SelectItem value="bonus_cycle">{t("ent_bonus_cycle")}</SelectItem>
              <SelectItem value="merit_cycle">{t("ent_merit_cycle")}</SelectItem>
              <SelectItem value="allowance_policy">{t("ent_allowance_policy")}</SelectItem>
              <SelectItem value="organization">{t("ent_organization")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg bg-card overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">{t("loading")}</div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center">
              <ShieldCheck className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t("no_audit_events")}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {t("audit_empty_hint")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-start px-4 py-2.5">{t("col_when")}</th>
                    <th className="text-start px-4 py-2.5">{t("col_actor")}</th>
                    <th className="text-start px-4 py-2.5">{t("col_action")}</th>
                    <th className="text-start px-4 py-2.5">{t("col_entity")}</th>
                    <th className="text-start px-4 py-2.5">{t("col_label")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-muted/20">
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDateTime(r.created_at, locale)}
                      </td>
                      <td className="px-4 py-2.5 text-xs">{r.actor_email ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            ACTION_BADGE[r.action] ?? "bg-muted"
                          }`}
                        >
                          {r.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.entity_type}</td>
                      <td className="px-4 py-2.5 text-sm">{r.entity_label ?? "—"}</td>
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
