import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/admin/data-table";
import { fmtDateTime } from "@/lib/format";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Mail, Clock, Activity } from "lucide-react";

export const Route = createFileRoute("/admin/monitoring")({ component: MonitoringPage });

interface EmailLog {
  id: string;
  message_id: string | null;
  template_name: string | null;
  recipient_email: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}
interface CronJob {
  jobid: number; jobname: string; schedule: string; active: boolean; command: string;
}
interface CronRun {
  jobid: number; jobname: string | null; runid: number;
  status: string; return_message: string | null;
  start_time: string; end_time: string | null;
}

function MonitoringPage() {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [runs, setRuns] = useState<CronRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"24h" | "7d" | "30d">("7d");

  const load = async () => {
    setLoading(true);
    const sinceMs = range === "24h" ? 86_400_000 : range === "7d" ? 7 * 86_400_000 : 30 * 86_400_000;
    const since = new Date(Date.now() - sinceMs).toISOString();
    const [{ data: e }, { data: j }, { data: r }] = await Promise.all([
      supabase.from("email_send_log")
        .select("id,message_id,template_name,recipient_email,status,error_message,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500),
      (supabase.rpc as any)("admin_list_cron_jobs"),
      (supabase.rpc as any)("admin_list_cron_runs", { _limit: 100 }),
    ]);
    setEmails((e as any) || []);
    setJobs((j as any) || []);
    setRuns((r as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [range]);

  // Deduplicate emails by message_id → keep latest status
  const dedupedEmails = useMemo(() => {
    const map = new Map<string, EmailLog>();
    for (const row of emails) {
      const key = row.message_id ?? `_no_msgid_${row.id}`;
      if (!map.has(key)) map.set(key, row); // emails ordered DESC, first wins
    }
    return Array.from(map.values());
  }, [emails]);

  const stats = useMemo(() => {
    const total = dedupedEmails.length;
    const sent = dedupedEmails.filter((r) => r.status === "sent").length;
    const failed = dedupedEmails.filter((r) => ["dlq", "failed", "bounced"].includes(r.status)).length;
    const suppressed = dedupedEmails.filter((r) => ["suppressed", "complained"].includes(r.status)).length;
    const pending = dedupedEmails.filter((r) => r.status === "pending").length;
    return { total, sent, failed, suppressed, pending };
  }, [dedupedEmails]);

  const cronStats = useMemo(() => {
    const recent = runs.slice(0, 50);
    const success = recent.filter((r) => r.status === "succeeded").length;
    const failed = recent.filter((r) => r.status === "failed").length;
    return { success, failed, total: recent.length, active: jobs.filter((j) => j.active).length };
  }, [runs, jobs]);

  const emailColumns: Column<EmailLog>[] = [
    { key: "created_at", header: "When", sortable: true,
      cell: (r) => <span className="text-xs tabular-nums">{fmtDateTime(r.created_at)}</span> },
    { key: "template_name", header: "Template",
      cell: (r) => <span className="text-xs font-mono">{r.template_name || "—"}</span> },
    { key: "recipient_email", header: "Recipient",
      cell: (r) => <span className="text-xs">{r.recipient_email || "—"}</span> },
    { key: "status", header: "Status", cell: (r) => <EmailStatusBadge status={r.status} /> },
    { key: "error_message", header: "Error",
      cell: (r) => r.error_message
        ? <span className="text-xs text-destructive line-clamp-1 max-w-xs">{r.error_message}</span>
        : <span className="text-xs text-muted-foreground">—</span> },
  ];

  const runColumns: Column<CronRun>[] = [
    { key: "start_time", header: "Started", sortable: true,
      cell: (r) => <span className="text-xs tabular-nums">{fmtDateTime(r.start_time)}</span> },
    { key: "jobname", header: "Job",
      cell: (r) => <span className="text-xs font-mono">{r.jobname || `#${r.jobid}`}</span> },
    { key: "status", header: "Result", cell: (r) => <CronStatusBadge status={r.status} /> },
    { key: "return_message", header: "Message",
      cell: (r) => <span className="text-xs line-clamp-1 max-w-md">{r.return_message || "—"}</span> },
  ];

  return (
    <div>
      <AdminPageHeader
        title="System monitoring"
        subtitle="Email delivery health and scheduled job execution"
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

      <div className="p-4 md:p-6 space-y-6">
        {/* Email stats */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold tracking-tight">Email delivery</h2>
            <span className="text-xs text-muted-foreground">(deduplicated by message_id)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Sent" value={stats.sent} tone="success" />
            <StatCard label="Failed" value={stats.failed} tone="danger" />
            <StatCard label="Suppressed" value={stats.suppressed} tone="warning" />
            <StatCard label="Pending" value={stats.pending} tone="muted" />
          </div>
          <DataTable rows={dedupedEmails} columns={emailColumns} loading={loading}
            searchable searchKeys={["template_name", "recipient_email", "status", "error_message"]} />
        </section>

        {/* Cron jobs */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold tracking-tight">Scheduled jobs (cron)</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <StatCard label="Active jobs" value={cronStats.active} />
            <StatCard label="Recent runs" value={cronStats.total} />
            <StatCard label="Succeeded" value={cronStats.success} tone="success" />
            <StatCard label="Failed" value={cronStats.failed} tone="danger" />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs font-medium text-muted-foreground mb-2">Registered jobs</div>
                <div className="space-y-2">
                  {jobs.length === 0 && <div className="text-xs text-muted-foreground">No cron jobs found.</div>}
                  {jobs.map((j) => (
                    <div key={j.jobid} className="flex items-start gap-3 text-xs border-b pb-2 last:border-0">
                      <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${j.active ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="font-mono font-medium truncate">{j.jobname}</div>
                        <div className="text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span className="font-mono">{j.schedule}</span>
                          {!j.active && <Badge variant="outline" className="text-[10px]">paused</Badge>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-xs font-medium text-muted-foreground mb-2">Recent runs</div>
                <DataTable rows={runs.slice(0, 50)} columns={runColumns} loading={loading} />
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "success" | "danger" | "warning" | "muted" }) {
  const color =
    tone === "success" ? "text-emerald-600 dark:text-emerald-400"
    : tone === "danger" ? "text-destructive"
    : tone === "warning" ? "text-amber-600 dark:text-amber-400"
    : tone === "muted" ? "text-muted-foreground"
    : "text-foreground";
  return (
    <Card><CardContent className="p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
    </CardContent></Card>
  );
}

function EmailStatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: any }> = {
    sent: { cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
    pending: { cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20", icon: Clock },
    dlq: { cls: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
    failed: { cls: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
    bounced: { cls: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
    suppressed: { cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20", icon: AlertCircle },
    complained: { cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20", icon: AlertCircle },
  };
  const m = map[status] || { cls: "bg-muted text-muted-foreground border-muted", icon: AlertCircle };
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${m.cls}`}>
      <Icon className="w-3 h-3" />{status}
    </span>
  );
}

function CronStatusBadge({ status }: { status: string }) {
  const ok = status === "succeeded";
  const cls = ok
    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
    : status === "failed"
    ? "bg-destructive/10 text-destructive border-destructive/20"
    : "bg-muted text-muted-foreground border-muted";
  return <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border ${cls}`}>{status}</span>;
}
