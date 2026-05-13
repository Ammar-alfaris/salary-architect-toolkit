import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCircle2, Clock, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { isCurrentUserApprover } from "@/lib/approvals";

interface NotificationItem {
  id: string;
  kind: "pending_for_me" | "my_approved" | "my_rejected" | "applied";
  title: string;
  detail: string;
  when: string;
}

export function ApprovalNotifications() {
  const { organizationId, user } = useAuth();
  const { t, locale } = useI18n();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId || !user) return;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString();
      const { data } = await supabase
        .from("approval_requests")
        .select("*")
        .eq("organization_id", organizationId)
        .or(`requested_by.eq.${user.id},status.eq.pending`)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20);
      const list: NotificationItem[] = [];
      const fmt = (s: string) => new Date(s).toLocaleString(locale === "ar" ? "ar" : "en");
      for (const r of data ?? []) {
        if (r.status === "pending") {
          const mine = await isCurrentUserApprover(r.id);
          if (mine) {
            list.push({
              id: `p-${r.id}`,
              kind: "pending_for_me",
              title: t("pending_for_you") || "A request needs your approval",
              detail: `${r.entity_label || r.entity_type} · ${r.requested_by_email ?? ""}`,
              when: fmt(r.created_at),
            });
          }
        } else if (r.requested_by === user.id) {
          if (r.status === "approved" && r.applied_at) {
            list.push({
              id: `a-${r.id}`,
              kind: "applied",
              title: t("your_request_applied") || "Your request was approved and applied",
              detail: `${r.entity_label || r.entity_type} · ${r.reviewed_by_email ?? ""}`,
              when: fmt(r.applied_at),
            });
          } else if (r.status === "approved") {
            list.push({
              id: `ap-${r.id}`,
              kind: "my_approved",
              title: t("your_request_approved") || "Your request was approved",
              detail: `${r.entity_label || r.entity_type} · ${t("apply_changes")}`,
              when: fmt(r.reviewed_at ?? r.created_at),
            });
          } else if (r.status === "rejected") {
            list.push({
              id: `r-${r.id}`,
              kind: "my_rejected",
              title: t("your_request_rejected") || "Your request was rejected",
              detail: `${r.entity_label || r.entity_type} · ${r.reviewed_by_email ?? ""}`,
              when: fmt(r.reviewed_at ?? r.created_at),
            });
          }
        }
      }
      setItems(list.slice(0, 5));
      setLoading(false);
    })();
  }, [organizationId, user, t, locale]);

  if (loading || items.length === 0) return null;

  const iconFor = (k: NotificationItem["kind"]) => {
    switch (k) {
      case "pending_for_me": return <Clock className="w-4 h-4 text-warning" />;
      case "my_approved":
      case "applied": return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "my_rejected": return <XCircle className="w-4 h-4 text-destructive" />;
    }
  };

  return (
    <div className="border rounded-lg bg-card p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Bell className="w-3.5 h-3.5" /> {t("notifications") || "Notifications"}
      </div>
      <div className="grid gap-2">
        {items.map((n) => (
          <Link
            key={n.id}
            to="/app/approvals"
            className="flex items-start gap-3 border rounded-md p-2.5 hover:bg-muted/40 transition"
          >
            <div className="mt-0.5 shrink-0">{iconFor(n.kind)}</div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium break-words">{n.title}</div>
              <div className="text-xs text-muted-foreground break-words">{n.detail}</div>
            </div>
            <div className="text-[11px] text-muted-foreground shrink-0">{n.when}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
