import { useCallback, useEffect, useRef, useState } from "react";
import { fmtDateTime } from "@/lib/format";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
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
  const seenIds = useRef<Set<string>>(new Set());

  const fmt = useCallback(
    (s: string) => fmtDateTime(s, locale),
    [locale],
  );

  const buildItem = useCallback(
    async (r: any): Promise<NotificationItem | null> => {
      if (!user) return null;
      if (r.status === "pending") {
        const mine = await isCurrentUserApprover(r.id);
        if (!mine) return null;
        return {
          id: `p-${r.id}`,
          kind: "pending_for_me",
          title: t("pending_for_you") || "A request needs your approval",
          detail: `${r.entity_label || r.entity_type} · ${r.requested_by_email ?? ""}`,
          when: fmt(r.created_at),
        };
      }
      if (r.requested_by !== user.id) return null;
      if (r.status === "approved" && r.applied_at) {
        return {
          id: `a-${r.id}`,
          kind: "applied",
          title: t("your_request_applied") || "Your request was approved and applied",
          detail: `${r.entity_label || r.entity_type} · ${r.reviewed_by_email ?? ""}`,
          when: fmt(r.applied_at),
        };
      }
      if (r.status === "approved") {
        return {
          id: `ap-${r.id}`,
          kind: "my_approved",
          title: t("your_request_approved") || "Your request was approved",
          detail: `${r.entity_label || r.entity_type} · ${t("apply_changes")}`,
          when: fmt(r.reviewed_at ?? r.created_at),
        };
      }
      if (r.status === "rejected") {
        return {
          id: `r-${r.id}`,
          kind: "my_rejected",
          title: t("your_request_rejected") || "Your request was rejected",
          detail: `${r.entity_label || r.entity_type} · ${r.reviewed_by_email ?? ""}`,
          when: fmt(r.reviewed_at ?? r.created_at),
        };
      }
      return null;
    },
    [user, t, fmt],
  );

  // Initial load
  useEffect(() => {
    if (!organizationId || !user) return;
    let cancelled = false;
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
      for (const r of data ?? []) {
        const it = await buildItem(r);
        if (it) list.push(it);
      }
      if (cancelled) return;
      list.forEach((i) => seenIds.current.add(i.id));
      setItems(list.slice(0, 5));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId, user, buildItem]);

  // Realtime subscription
  useEffect(() => {
    if (!organizationId || !user) return;
    const channel = supabase
      .channel(`approval_requests:${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "approval_requests",
          filter: `organization_id=eq.${organizationId}`,
        },
        async (payload) => {
          const r = (payload.new ?? payload.old) as any;
          if (!r) return;
          const it = await buildItem(r);
          if (!it) return;
          const isNew = !seenIds.current.has(it.id);
          seenIds.current.add(it.id);
          setItems((prev) => {
            const filtered = prev.filter((p) => p.id !== it.id);
            return [it, ...filtered].slice(0, 5);
          });
          if (isNew && payload.eventType !== "DELETE") {
            toast(it.title, { description: it.detail });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, user, buildItem]);

  if (loading || items.length === 0) return null;

  const iconFor = (k: NotificationItem["kind"]) => {
    switch (k) {
      case "pending_for_me":
        return <Clock className="w-4 h-4 text-warning" />;
      case "my_approved":
      case "applied":
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "my_rejected":
        return <XCircle className="w-4 h-4 text-destructive" />;
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
