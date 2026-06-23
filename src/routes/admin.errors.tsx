import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtDateTime } from "@/lib/format";
import { AlertOctagon, AlertTriangle, Info, Globe, Server, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/admin/errors")({ component: ErrorsPage });

interface ErrorGroup {
  fingerprint: string;
  message: string;
  source: string;
  level: string;
  count: number;
  last_seen: string;
  first_seen: string;
  affected_users: number;
}
interface ErrorRow {
  id: string;
  occurred_at: string;
  level: string;
  source: string;
  fingerprint: string | null;
  message: string;
  stack: string | null;
  url: string | null;
  route: string | null;
  user_agent: string | null;
  ip_address: string | null;
  user_id: string | null;
  metadata: any;
}

function ErrorsPage() {
  const [groups, setGroups] = useState<ErrorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"24h" | "7d" | "30d">("7d");
  const [selected, setSelected] = useState<ErrorGroup | null>(null);
  const [events, setEvents] = useState<ErrorRow[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const load = async () => {
    setLoading(true);
    const ms = range === "24h" ? 86_400_000 : range === "7d" ? 7 * 86_400_000 : 30 * 86_400_000;
    const since = new Date(Date.now() - ms).toISOString();
    const { data } = await (supabase.rpc as any)("admin_error_groups", { _since: since });
    setGroups((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [range]);

  const openGroup = async (g: ErrorGroup) => {
    setSelected(g);
    setLoadingEvents(true);
    const { data } = await supabase
      .from("error_logs")
      .select("*")
      .eq("fingerprint", g.fingerprint)
      .order("occurred_at", { ascending: false })
      .limit(50);
    setEvents((data as any) || []);
    setLoadingEvents(false);
  };

  const stats = useMemo(() => {
    const total = groups.reduce((s, g) => s + Number(g.count || 0), 0);
    const clientCount = groups.filter((g) => g.source === "client").reduce((s, g) => s + Number(g.count || 0), 0);
    const serverCount = groups.filter((g) => g.source !== "client").reduce((s, g) => s + Number(g.count || 0), 0);
    const users = groups.reduce((s, g) => s + Number(g.affected_users || 0), 0);
    return { total, clientCount, serverCount, users, uniqueGroups: groups.length };
  }, [groups]);

  return (
    <div>
      <AdminPageHeader
        title="Error tracking"
        subtitle="Client & server exceptions, grouped by fingerprint"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border overflow-hidden text-xs">
              {(["24h", "7d", "30d"] as const).map((r) => (
                <button key={r} onClick={() => setRange(r)}
                  className={`px-3 py-1.5 ${range === r ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>
                  {r}
                </button>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 me-1 ${loading ? "animate-spin" : ""}`} />Refresh
            </Button>
          </div>
        }
      />

      <div className="p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Unique issues" value={stats.uniqueGroups} />
          <Stat label="Total events" value={stats.total} />
          <Stat label="Client" value={stats.clientCount} tone="warning" />
          <Stat label="Server" value={stats.serverCount} tone="danger" />
          <Stat label="Affected users" value={stats.users} />
        </div>

        <div className="space-y-2">
          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!loading && groups.length === 0 && (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
              No errors recorded in this window. 🎉
            </CardContent></Card>
          )}
          {groups.map((g) => (
            <Card key={g.fingerprint} className="cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => openGroup(g)}>
              <CardContent className="p-3 flex items-start gap-3">
                <LevelIcon level={g.level} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <SourceBadge source={g.source} />
                    <Badge variant="outline" className="text-[10px] font-mono">{g.fingerprint.slice(0, 8)}</Badge>
                    <span className="text-xs text-muted-foreground ms-auto">{fmtDateTime(g.last_seen)}</span>
                  </div>
                  <div className="text-sm font-medium truncate">{g.message}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    <strong className="tabular-nums">{g.count}</strong> events ·
                    <strong className="tabular-nums ms-1">{g.affected_users}</strong> users ·
                    first seen {fmtDateTime(g.first_seen)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{selected?.message}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <SourceBadge source={selected.source} />
                <Badge variant="outline" className="font-mono">{selected.fingerprint.slice(0, 12)}</Badge>
                <span className="text-muted-foreground">{selected.count} events · {selected.affected_users} users</span>
              </div>
              {loadingEvents && <div className="text-sm text-muted-foreground">Loading events…</div>}
              {events.map((ev) => (
                <div key={ev.id} className="border rounded p-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="tabular-nums">{fmtDateTime(ev.occurred_at)}</span>
                    {ev.ip_address && <span className="font-mono">{ev.ip_address}</span>}
                  </div>
                  {ev.url && <div className="font-mono break-all text-[11px]">{ev.url}</div>}
                  {ev.user_agent && <div className="text-muted-foreground line-clamp-1">{ev.user_agent}</div>}
                  {ev.stack && (
                    <pre className="bg-muted/50 p-2 rounded text-[10px] overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {ev.stack}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warning" | "danger" }) {
  const cls = tone === "danger" ? "text-destructive" : tone === "warning" ? "text-amber-600 dark:text-amber-400" : "text-foreground";
  return (
    <Card><CardContent className="p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums ${cls}`}>{value}</div>
    </CardContent></Card>
  );
}

function LevelIcon({ level }: { level: string }) {
  if (level === "warning") return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
  if (level === "info") return <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />;
  return <AlertOctagon className="w-4 h-4 text-destructive shrink-0 mt-0.5" />;
}

function SourceBadge({ source }: { source: string }) {
  const isClient = source === "client";
  const Icon = isClient ? Globe : Server;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${
      isClient
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
        : "bg-destructive/10 text-destructive border-destructive/20"
    }`}>
      <Icon className="w-3 h-3" />{source}
    </span>
  );
}
