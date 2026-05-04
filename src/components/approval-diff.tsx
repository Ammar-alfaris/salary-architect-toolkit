import { diffPayloads } from "@/lib/approvals";
import { useI18n } from "@/lib/i18n";

export function ApprovalDiff({ before, after }: { before: Record<string, unknown>; after: Record<string, unknown> }) {
  const { t } = useI18n();
  const rows = diffPayloads(before ?? {}, after ?? {});
  const fmt = (v: unknown) => {
    if (v == null) return "—";
    if (typeof v === "object") return <code className="text-xs">{JSON.stringify(v)}</code>;
    return String(v);
  };
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="text-start px-3 py-2">{t("field")}</th>
            <th className="text-start px-3 py-2">{t("original")}</th>
            <th className="text-start px-3 py-2">{t("after_review")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className={`border-t ${r.changed ? "bg-warning/10" : ""}`}>
              <td className="px-3 py-2 font-medium">{r.key}</td>
              <td className="px-3 py-2 text-muted-foreground">{fmt(r.before)}</td>
              <td className={`px-3 py-2 ${r.changed ? "font-semibold text-warning-foreground" : ""}`}>{fmt(r.after)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
