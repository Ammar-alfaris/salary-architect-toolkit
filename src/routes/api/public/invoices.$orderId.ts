import { createFileRoute } from "@tanstack/react-router";

/**
 * Public, signed-URL download of an invoice PDF.
 * URL: /api/public/invoices/:orderId?token=<exp>.<hmac>
 *
 * The token is HMAC-SHA256(orderId.exp, SUPABASE_SERVICE_ROLE_KEY) and is
 * minted server-side by getInvoiceDownloadUrl (auth-checked). The route here
 * only validates the signature; without it, attackers cannot enumerate.
 */
export const Route = createFileRoute("/api/public/invoices/$orderId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token") ?? "";
        const orderId = params.orderId;
        if (!orderId || !token) return new Response("Missing token", { status: 400 });

        const { verifyInvoiceToken, generateInvoicePdf } = await import("@/lib/invoice-pdf.server");
        const valid = await verifyInvoiceToken(orderId, token);
        if (!valid) return new Response("Invalid or expired token", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("id, invoice_number, invoice_issued_at, customer_name, customer_email, customer_phone, items, subtotal_amount, vat_amount, paid_amount, amount, currency, plan_id, billing_cycle")
          .eq("id", orderId)
          .maybeSingle();
        if (!order || !order.invoice_number) {
          return new Response("Invoice not available", { status: 404 });
        }

        // Optional plan name lookup
        let planName: string | null = null;
        if (order.plan_id) {
          const { data: plan } = await supabaseAdmin
            .from("plans").select("name").eq("id", order.plan_id).maybeSingle();
          planName = (plan as any)?.name ?? null;
        }

        const total = Number(order.paid_amount ?? order.amount ?? 0);
        const subtotal = Number(order.subtotal_amount ?? (total / 1.15));
        const vat = Number(order.vat_amount ?? (total - subtotal));

        const items = Array.isArray(order.items) && (order.items as any[]).length > 0
          ? (order.items as any[]).map((i) => ({
              title: String(i.title ?? "Item"),
              qty: Number(i.qty ?? 1),
              price: Number(i.price ?? 0),
            }))
          : [{ title: planName || "Subscription", qty: 1, price: subtotal }];

        const bytes = await generateInvoicePdf({
          invoiceNumber: order.invoice_number as string,
          issuedAt: order.invoice_issued_at ? new Date(order.invoice_issued_at) : new Date(),
          customerName: (order.customer_name as string) || "Customer",
          customerEmail: order.customer_email as string | null,
          customerPhone: order.customer_phone as string | null,
          items,
          subtotal,
          vat,
          total,
          currency: (order.currency as string) || "SAR",
          planName,
          billingCycle: order.billing_cycle as string | null,
        });

        return new Response(bytes as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${order.invoice_number}.pdf"`,
            "Cache-Control": "private, no-store",
          },
        });
      },
    },
  },
});
