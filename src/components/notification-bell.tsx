import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCircle2, Clock, XCircle, Inbox } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { isCurrentUserApprover } from "@/lib/approvals";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Kind = "pending_for_me" | "my_approved" | "my_rejected" | "applied";
interface Item { id: string; kind: Kind; title: string; detail: string; when: string; }

const STORAGE_KEY = "notif_last_seen_at";

export function NotificationBell() {
  const { organizationId, user } = useAuth();
  const { t, locale } = useI18n();
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem(STORAGE_KEY) || 0);
  });
  const seen = useRef<Set<string>>(new Set());

  const fmt = useCallback((s: string) => new Date(s).toLocaleString(locale === "ar" ? "ar" : "en"), [locale]);

  const buildItem = useCallback(async (r: any): Promise<Item | null> => {
    if (!user) return null;
    if (r.status === "pending") {
      const mine = await isCurrentUserApprover(r.id);
      if (!mine) return null;
      return { id: `p-${r.id}`, kind: "pending_for_me", title: t("pending_for_you") || "Needs your approval", detail: `${r.entity_label || r.entity_type}`, when: fmt(r.created_at) };
    }
    if (r.requested_by !== user.id) return null;
    if (r.status === "approved" && r.applied_at) return { id: `a-${r.id}`, kind: "applied", title: t("your_request_applied") || "Approved & applied", detail: `${r.entity_label || r.entity_type}`, when: fmt(r.applied_at) };
    if (r.status === "approved") return { id: `ap-${r.id}`, kind: "my_approved", title: t("your_request_approved") || "Approved", detail: `${r.entity_label || r.entity_type}`, when: fmt(r.reviewed_at ?? r.created_at) };
    if (r.status === "rejected") return { id: `r-${r.id}`, kind: "my_rejected", title: t("your_request_rejected") || "Rejected", detail: `${r.entity_label || r.entity_type}`, when: fmt(r.reviewed_at ?? r.created_at) };
    return null;
  }, [user, t, fmt]);

  useEffect(() => {
    if (!organizationId || !user) return;
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString();
      const { data } = await supabase.from("approval_requests").select("*")
        .eq("organization_id", organizationId)
        .or(`requested_by.eq.${user.id},status.eq.pending`)
        .gte("created_at", since).order("created_at", { ascending: false }).limit(20);
      const list: Item[] = [];
      for (const r of data ?? []) { const it = await buildItem(r); if (it) list.push(it); }
      if (cancelled) return;
      list.forEach((i) => seen.current.add(i.id));
      setItems(list);
    })();
    return () => { cancelled = true; };
  }, [organizationId, user, buildItem]);

  useEffect(() => {
    if (!organizationId || !user) return;
    const channel = supabase
      .channel(`notif_bell:${organizationId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "approval_requests", filter: `organization_id=eq.${organizationId}` }, async (payload) => {
        const r = (payload.new ?? payload.old) as any;
        if (!r) return;
        const it = await buildItem(r);
        if (!it) return;
        const isNew = !seen.current.has(it.id);
        seen.current.add(it.id);
        setItems((prev) => [it, ...prev.filter((p) => p.id !== it.id)].slice(0, 20));
        if (isNew && payload.eventType !== "DELETE") {
          toast(it.title, { description: it.detail });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [organizationId, user, buildItem]);

  const unread = items.filter((i) => {
    const ts = Date.parse(i.when);
    return !isNaN(ts) ? ts > lastSeen : true;
  }).length;

  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (o) {
      const now = Date.now();
      setLastSeen(now);
      try { localStorage.setItem(STORAGE_KEY, String(now)); } catch {}
    }
  };

  const iconFor = (k: Kind) => k === "pending_for_me" ? <Clock className="w-4 h-4 text-warning" />
    : k === "my_rejected" ? <XCircle className="w-4 h-4 text-destructive" />
    : <CheckCircle2 className="w-4 h-4 text-success" />;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("notifications")}
          className="relative inline-flex items-center justify-center min-h-11 min-w-11 rounded-md hover:bg-accent transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute top-1.5 end-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold grid place-items-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <div className="text-sm font-semibold">{t("notifications")}</div>
          <Link to="/app/approvals" onClick={() => setOpen(false)} className="text-xs text-primary hover:underline">
            {t("view_all") || "View all"}
          </Link>
        </div>
        {items.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <Inbox className="w-6 h-6 mx-auto mb-2 opacity-60" />
            {t("no_notifications") || "No notifications"}
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto divide-y">
            {items.slice(0, 8).map((n) => (
              <Link key={n.id} to="/app/approvals" onClick={() => setOpen(false)}
                className="flex items-start gap-2.5 p-3 hover:bg-muted/40 transition">
                <div className="mt-0.5 shrink-0">{iconFor(n.kind)}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium break-words">{n.title}</div>
                  <div className="text-xs text-muted-foreground break-words">{n.detail}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{n.when}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
