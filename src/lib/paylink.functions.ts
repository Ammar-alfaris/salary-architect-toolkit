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

    const { data: role } = await supabase
      .from("user_roles")
      .select("organization_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    const organizationId = (role?.organization_id as string | undefined) ?? null;

    let subscriptionId: string | null = null;
    let planId: string | null = null;
    let billingCycle: string | null = null;
    if (organizationId) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("id, plan_id, billing_cycle")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      subscriptionId = (sub?.id as string | undefined) ?? null;
      planId = (sub?.plan_id as string | undefined) ?? null;
      billingCycle = (sub?.billing_cycle as string | undefined) ?? null;
    }

    const { data: order, error: insertErr } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        organization_id: organizationId,
        subscription_id: subscriptionId,
        plan_id: planId,
        billing_cycle: billingCycle,
        product_key: data.productKey,
        amount: data.amount,
        currency: data.currency ?? "SAR",
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        customer_email: data.customerEmail ?? null,
        items: data.items as never,
        status: "pending",
      } as never)
      .select("id")
      .single();
    if (insertErr || !order) {
      console.error(JSON.stringify({ scope: "paylink", step: "db.insertOrder", message: insertErr?.message }));
      throw new Error("Could not create order");
    }
    const orderId = order.id as string;

    try {
      const { authenticate, addInvoice, getCurrentPaylinkMode } = await import("@/lib/paylink.server");
      const mode = await getCurrentPaylinkMode();
      const token = await authenticate(mode);
      const callBackUrl = `${appBaseUrl.replace(/\/$/, "")}/payment/paylink/callback?orderId=${orderId}`;
      const paylinkOrderNumber = `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
      const invoice = await addInvoice(
        mode,
        {
          amount: data.amount,
          callBackUrl,
          clientName: data.customerName,
          clientMobile: data.customerPhone,
          clientEmail: data.customerEmail,
          orderNumber: paylinkOrderNumber,
          products: data.items,
          currency: data.currency ?? "SAR",
          displayPending: true,
          // IMPORTANT: do NOT pass supportedCardBrands. Restricting brands
          // here triggers Paylink's "local banks only" rejection on cards
          // that Apple Pay tokenises successfully. Leaving it unset lets
          // Paylink fall back to every brand enabled on the merchant
          // account (mada + visa + master + amex when configured).
          supportedCardBrands: undefined,
        },
        token,
      );

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
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("orders").update({ status: "failed" } as never).eq("id", orderId);
      } catch { /* ignore */ }
      throw new Error(message);
    }
  });

const VerifySchema = z.object({ orderId: z.string().uuid() });

export const verifyPaylinkPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => VerifySchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, user_id, paylink_transaction_no")
      .eq("id", data.orderId)
      .maybeSingle();
    if (orderErr || !order) {
      console.error(JSON.stringify({ scope: "paylink", step: "db.findOrder", orderId: data.orderId, message: orderErr?.message }));
      throw new Error("Order not found");
    }
    if (order.user_id !== userId) throw new Error("Forbidden");
    const transactionNo = order.paylink_transaction_no as string | null;
    if (!transactionNo) throw new Error("Order has no Paylink transaction");

    const { processPaylinkTransaction } = await import("@/lib/paylink-process.server");
    const result = await processPaylinkTransaction({
      transactionNo,
      orderId: order.id as string,
    });
    if (!result) throw new Error("Could not verify order");

    console.log(JSON.stringify({
      scope: "paylink", step: "verify.done",
      orderId: result.orderId, transactionNo,
      paymentStatus: result.paymentStatus,
    }));

    return {
      orderId: result.orderId,
      paymentStatus: result.paymentStatus,
      paidAmount: result.paidAmount,
      orderStatus: result.paymentStatus,
    };
  });
