import { createFileRoute } from "@tanstack/react-router";

/**
 * Paylink server-to-server notification webhook.
 *
 * URL to configure in Paylink dashboard:
 *   https://totalreward.app/api/public/paylink/webhook
 *
 * Paylink will POST a JSON payload after invoice status changes. We do NOT
 * trust the payload contents — we only use it to extract the transactionNo,
 * then call getInvoice() ourselves to confirm the real status.
 *
 * Always returns 200 (except on completely unparseable requests) so Paylink
 * does not retry forever. Activation is idempotent — safe to receive the
 * same notification multiple times.
 */

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function extractTransactionNo(payload: any): string | null {
  if (!payload || typeof payload !== "object") return null;
  const candidates = [
    payload.transactionNo,
    payload.transaction_no,
    payload.transactionNumber,
    payload.transaction_number,
    payload.gatewayOrderRequestNumber,
    payload?.data?.transactionNo,
    payload?.invoice?.transactionNo,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
    if (typeof c === "number") return String(c);
  }
  return null;
}

export const Route = createFileRoute("/api/public/paylink/webhook")({
  server: {
    handlers: {
      GET: async () =>
        json({
          ok: true,
          message: "Paylink webhook endpoint. Send POST with the notification body.",
        }),
      POST: async ({ request }) => {
        let raw = "";
        let payload: any = null;
        try {
          raw = await request.text();
          payload = raw ? JSON.parse(raw) : {};
        } catch {
          console.warn(JSON.stringify({ scope: "paylink.webhook", step: "badJson", raw: raw.slice(0, 200) }));
          return json({ ok: false, error: "Invalid JSON" }, 400);
        }

        const transactionNo = extractTransactionNo(payload);
        if (!transactionNo) {
          console.warn(JSON.stringify({
            scope: "paylink.webhook",
            step: "noTransactionNo",
            keys: payload && typeof payload === "object" ? Object.keys(payload) : [],
          }));
          // Acknowledge so Paylink does not keep retrying garbage.
          return json({ ok: true, ignored: "no transactionNo" });
        }

        try {
          const { processPaylinkTransaction } = await import("@/lib/paylink-process.server");
          const result = await processPaylinkTransaction({ transactionNo });
          console.log(JSON.stringify({
            scope: "paylink.webhook",
            step: "processed",
            transactionNo,
            result,
          }));
          return json({ ok: true, ...result });
        } catch (err) {
          console.error(JSON.stringify({
            scope: "paylink.webhook",
            step: "failed",
            transactionNo,
            message: (err as Error).message,
          }));
          // Still return 200 — we will rely on the browser callback or a
          // manual sync to recover. Returning 500 would cause infinite retries.
          return json({ ok: false, error: "processing_failed" });
        }
      },
    },
  },
});
