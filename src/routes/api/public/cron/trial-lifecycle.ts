import { createFileRoute } from "@tanstack/react-router";

/**
 * Daily lifecycle sweep — called by pg_cron.
 * Updates subscriptions.status to reflect trial → grace → restricted → dormant.
 * Auth: requires Supabase anon key in `apikey` header.
 */
export const Route = createFileRoute("/api/public/cron/trial-lifecycle")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        if (!apiKey || apiKey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Pull every trial-ish subscription and update status based on dates.
        const { data: rows, error } = await supabaseAdmin
          .from("subscriptions")
          .select("id, status, trial_end_at, grace_end_at, restricted_at, dormant_at")
          .in("status", ["trial", "trial_ending", "grace", "restricted", "dormant"])
          .not("trial_end_at", "is", null);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        const now = Date.now();
        const DAY = 24 * 60 * 60 * 1000;
        let updated = 0;

        for (const r of rows ?? []) {
          if (!r.trial_end_at) continue;
          const end = new Date(r.trial_end_at).getTime();
          const days = (now - end) / DAY;

          let next: string | null = null;
          const patch: Record<string, string | null> = {};

          if (days < -3) next = "trial";
          else if (days < 0) next = "trial_ending";
          else if (days < 7) {
            next = "grace";
            if (!r.grace_end_at) patch.grace_end_at = new Date(end + 7 * DAY).toISOString();
          } else if (days < 30) {
            next = "restricted";
            if (!r.restricted_at) patch.restricted_at = new Date().toISOString();
          } else {
            next = "dormant";
            if (!r.dormant_at) patch.dormant_at = new Date().toISOString();
          }

          if (next && next !== r.status) {
            patch.status = next;
            const { error: upErr } = await supabaseAdmin
              .from("subscriptions")
              .update(patch)
              .eq("id", r.id);
            if (!upErr) updated++;
          }
        }

        return Response.json({ ok: true, scanned: rows?.length ?? 0, updated });
      },
    },
  },
});
