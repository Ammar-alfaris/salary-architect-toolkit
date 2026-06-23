/**
 * Server-side error logger. Safe to call from server functions, server routes,
 * and cron handlers. Never throws — failure to record is silently swallowed.
 */
import type { PostgrestError } from "@supabase/supabase-js";

export interface ServerErrorInput {
  message: string;
  stack?: string | null;
  level?: "error" | "warning" | "info";
  source?: string; // e.g. 'server', 'cron:billing-engine', 'paylink-webhook'
  route?: string | null;
  url?: string | null;
  userId?: string | null;
  organizationId?: string | null;
  metadata?: Record<string, unknown>;
}

function fingerprintFor(message: string, stack?: string | null): string {
  const firstLine = (stack ?? "").split("\n").find((l) => l.trim().length > 0) ?? "";
  const raw = `${message}|${firstLine}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

export async function logServerError(input: ServerErrorInput): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("error_logs").insert({
      level: input.level ?? "error",
      source: input.source ?? "server",
      fingerprint: fingerprintFor(input.message, input.stack ?? null),
      message: String(input.message).slice(0, 2000),
      stack: input.stack ? String(input.stack).slice(0, 8000) : null,
      route: input.route ?? null,
      url: input.url ?? null,
      user_id: input.userId ?? null,
      organization_id: input.organizationId ?? null,
      metadata: input.metadata ?? {},
    } as never);
  } catch (err) {
    console.warn("[error-tracking] failed to log", err);
  }
}

/** Convenience: capture a thrown Error or Postgrest error. */
export async function captureServerError(
  err: unknown,
  context: Omit<ServerErrorInput, "message" | "stack"> = {},
): Promise<void> {
  const e = err as Error & Partial<PostgrestError>;
  await logServerError({
    ...context,
    message: e?.message ?? "Unknown server error",
    stack: e?.stack ?? null,
    metadata: { ...(context.metadata ?? {}), code: (e as any)?.code, details: (e as any)?.details },
  });
}
