import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ItemSchema = z.object({
  title: z.string().min(1).max(200),
  price: z.number().positive(),
  qty: z.number().int().positive(),
  description: z.string().max(500).optional(),
});

const CreateInvoiceSchema = z.object({
  productKey: z.string().min(1).max(100),
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(6).max(20),
  customerEmail: z.string().trim().email().max(255).optional(),
  amount: z.number().positive().max(1_000_000),
  currency: z.string().length(3).optional(),
  items: z.array(ItemSchema).min(1).max(50),
});

export const createPaylinkInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => CreateInvoiceSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const appBaseUrl = process.env.APP_BASE_URL;
    if (!appBaseUrl) throw new Error("APP_BASE_URL not configured");

    // 1) Create pending order row first so we have a stable orderId.
    const { data: order, error: insertErr } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        product_key: data.productKey,
        amount: data.amount,
        currency: data.currency ?? "SAR",
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        customer_email: data.customerEmail ?? null,
        items: data.items as never,
        status: "pending",
      })
      .select("id")
      .single();
    if (insertErr || !order) {
      console.error(JSON.stringify({ scope: "paylink", step: "db.insertOrder", message: insertErr?.message }));
      throw new Error("Could not create order");
    }
    const orderId = order.id as string;

    try {
      const { authenticate, addInvoice } = await import("@/lib/paylink.server");
      const token = await authenticate();
      const callBackUrl = `${appBaseUrl.replace(/\/$/, "")}/payment/paylink/callback?orderId=${orderId}`;
      const invoice = await addInvoice(
        {
          amount: data.amount,
          callBackUrl,
          clientName: data.customerName,
          clientMobile: data.customerPhone,
          clientEmail: data.customerEmail,
          orderNumber: orderId,
          products: data.items,
          currency: data.currency ?? "SAR",
        },
        token,
      );

      // 2) Persist Paylink identifiers + raw response with the admin client
      // so writes succeed regardless of RLS (UPDATE is server-only).
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("orders")
        .update({
          paylink_transaction_no: invoice.transactionNo,
          paylink_invoice_id: invoice.invoiceId != null ? String(invoice.invoiceId) : null,
          paylink_payment_url: invoice.url,
          raw_create_response: invoice as never,
        } as never)
        .eq("id", orderId);

      return {
        success: true as const,
        orderId,
        transactionNumber: invoice.transactionNo,
        paymentUrl: invoice.url,
      };
    } catch (err) {
      const message = (err as Error).message ?? "Paylink error";
      console.error(JSON.stringify({ scope: "paylink", step: "createInvoice.failed", orderId, message }));
      // Mark order as failed so the user can retry cleanly.
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("orders")
          .update({ status: "failed" } as never)
          .eq("id", orderId);
      } catch {/* ignore */}
      throw new Error(message);
    }
  });

const VerifySchema = z.object({
  orderId: z.string().uuid(),
});

export const verifyPaylinkPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => VerifySchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // RLS scopes to the caller, so this also enforces ownership.
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, user_id, amount, status, paylink_transaction_no")
      .eq("id", data.orderId)
      .maybeSingle();
    if (orderErr || !order) {
      console.error(JSON.stringify({ scope: "paylink", step: "db.findOrder", orderId: data.orderId, message: orderErr?.message }));
      throw new Error("Order not found");
    }
    if (order.user_id !== userId) throw new Error("Forbidden");
    const transactionNo = order.paylink_transaction_no as string | null;
    if (!transactionNo) {
      throw new Error("Order has no Paylink transaction");
    }

    const { authenticate, getInvoice, mapPaylinkStatus } = await import("@/lib/paylink.server");
    const token = await authenticate();
    const invoice = await getInvoice(transactionNo, token);
    const paymentStatus = mapPaylinkStatus(invoice.orderStatus);
    const paidAmount =
      typeof invoice.amount === "number" ? invoice.amount : null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("orders")
      .update({
        status: paymentStatus,
        paid_amount: paymentStatus === "paid" ? paidAmount : null,
        paid_at: paymentStatus === "paid" ? new Date().toISOString() : null,
        raw_verify_response: invoice as never,
      } as never)
      .eq("id", order.id);

    console.log(JSON.stringify({
      scope: "paylink",
      step: "verify.done",
      orderId: order.id,
      transactionNo,
      paymentStatus,
    }));

    return {
      orderId: order.id,
      paymentStatus,
      paidAmount,
      orderStatus: invoice.orderStatus,
      invoice,
    };
  });
