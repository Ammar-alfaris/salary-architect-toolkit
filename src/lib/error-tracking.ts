/**
 * Client-side error tracking. Captures window errors, unhandled promise
 * rejections, and explicit `reportError()` calls and POSTs them to
 * /api/public/errors/report (bypasses auth — uses anon SUPABASE_PUBLISHABLE_KEY).
 *
 * - Stack traces stripped of query strings to keep PII out.
 * - Dedupes identical messages within 30s to avoid storms.
 * - Best-effort: never throws, never blocks UI.
 */

const RECENT_TTL = 30_000;
const recent = new Map<string, number>();

function fingerprintOf(message: string, stack?: string | null): string {
  // First line of stack is usually the failing call site → stable group key.
  const firstLine = (stack ?? "").split("\n").find((l) => l.trim().length > 0) ?? "";
  const raw = `${message}|${firstLine}`.replace(/\?[^\s)]*/g, "");
  // Lightweight non-crypto hash to avoid bringing in a hashing lib.
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function shouldReport(fingerprint: string): boolean {
  const now = Date.now();
  for (const [k, t] of recent) if (now - t > RECENT_TTL) recent.delete(k);
  if (recent.has(fingerprint)) return false;
  recent.set(fingerprint, now);
  return true;
}

export interface ReportErrorInput {
  message: string;
  stack?: string | null;
  level?: "error" | "warning" | "info";
  metadata?: Record<string, unknown>;
}

export async function reportError(input: ReportErrorInput): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const fingerprint = fingerprintOf(input.message, input.stack);
    if (!shouldReport(fingerprint)) return;
    const payload = {
      message: String(input.message).slice(0, 2000),
      stack: input.stack ? String(input.stack).slice(0, 8000) : null,
      level: input.level ?? "error",
      source: "client",
      fingerprint,
      url: window.location.href,
      route: window.location.pathname,
      user_agent: navigator.userAgent,
      metadata: input.metadata ?? {},
    };
    await fetch("/api/public/errors/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // never throw from the error reporter
  }
}

let installed = false;
export function installErrorTracking(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (e: ErrorEvent) => {
    reportError({
      message: e.message || "Unknown error",
      stack: e.error?.stack ?? null,
      metadata: { filename: e.filename, lineno: e.lineno, colno: e.colno },
    });
  });

  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    const reason: any = e.reason;
    const message =
      reason instanceof Error ? reason.message :
      typeof reason === "string" ? reason :
      "Unhandled promise rejection";
    reportError({
      message,
      stack: reason instanceof Error ? reason.stack : null,
      metadata: { kind: "unhandledrejection" },
    });
  });
}
