/**
 * Public endpoint for browser error reports. Bypasses auth on published sites
 * (under /api/public/*) so unauthenticated visitors can still submit errors.
 * Uses supabaseAdmin to insert under RLS (table allows anonymous INSERT).
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Schema = z.object({
  message: z.string().min(1).max(2000),
  stack: z.string().max(8000).optional().nullable(),
  level: z.enum(["error", "warning", "info"]).optional(),
  source: z.string().max(40).optional(),
  fingerprint: z.string().max(64).optional(),
  url: z.string().max(2000).optional(),
  route: z.string().max(500).optional(),
  user_agent: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const Route = createFileRoute("/api/public/errors/report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const json = await request.json();
          const parsed = Schema.safeParse(json);
          if (!parsed.success) {
            return new Response("Bad request", { status: 400 });
          }
          const ip =
            request.headers.get("cf-connecting-ip") ??
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
            null;
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("error_logs").insert({
            level: parsed.data.level ?? "error",
            source: parsed.data.source ?? "client",
            fingerprint: parsed.data.fingerprint ?? null,
            message: parsed.data.message,
            stack: parsed.data.stack ?? null,
            url: parsed.data.url ?? null,
            route: parsed.data.route ?? null,
            user_agent: parsed.data.user_agent ?? null,
            ip_address: ip,
            metadata: parsed.data.metadata ?? {},
          } as never);
          return new Response(null, { status: 204 });
        } catch {
          // Never bubble: avoid feedback loops between the reporter and itself.
          return new Response(null, { status: 204 });
        }
      },
      OPTIONS: () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),
    },
  },
});
