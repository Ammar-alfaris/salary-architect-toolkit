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

    // Find the caller's org + most recent (trial/pending) subscription so the
    // verify step can activate the right one.
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

    // 1) Create pending order row first so we have a stable orderId.
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
      .select("id, user_id, amount, status, paylink_transaction_no, organization_id, subscription_id, plan_id, billing_cycle, invoice_number, customer_email, customer_name")
      .eq("id", data.orderId)
      .maybeSingle();
    if (orderErr || !order) {
      console.error(JSON.stringify({ scope: "paylink", step: "db.findOrder", orderId: data.orderId, message: orderErr?.message }));
      throw new Error("Order not found");
    }
    if (order.user_id !== userId) throw new Error("Forbidden");
    const transactionNo = order.paylink_transaction_no as string | null;
    if (!transactionNo) throw new Error("Order has no Paylink transaction");

    const { authenticate, getInvoice, mapPaylinkStatus, getCurrentPaylinkMode } = await import("@/lib/paylink.server");
    const mode = await getCurrentPaylinkMode();
    const token = await authenticate(mode);
    const invoice = await getInvoice(mode, transactionNo, token);
    const paymentStatus = mapPaylinkStatus(invoice.orderStatus);
    const paidAmount = typeof invoice.amount === "number" ? invoice.amount : Number(order.amount);

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

    // Activate subscription + issue invoice number, once per order.
    if (paymentStatus === "paid" && !order.invoice_number) {
      await activateOrderAsSubscription({
        orderId: order.id as string,
        organizationId: order.organization_id as string | null,
        subscriptionId: order.subscription_id as string | null,
        billingCycle: (order.billing_cycle as string | null) ?? "monthly",
        paidAmount,
        invoice,
        customerEmail: (order.customer_email as string | null) ?? null,
        customerName: (order.customer_name as string | null) ?? null,
      });
    }

    console.log(JSON.stringify({
      scope: "paylink", step: "verify.done", orderId: order.id, transactionNo, paymentStatus,
    }));

    return {
      orderId: order.id,
      paymentStatus,
      paidAmount,
      orderStatus: invoice.orderStatus,
      invoice,
    };
  });

// ── Activation helper (server-only) ──────────────────────────────────────────
async function activateOrderAsSubscription(args: {
  orderId: string;
  organizationId: string | null;
  subscriptionId: string | null;
  billingCycle: string;
  paidAmount: number;
  invoice: any;
  customerEmail: string | null;
  customerName: string | null;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 1) Allocate invoice number + compute VAT (inclusive 15%).
  const { data: numRow } = await supabaseAdmin.rpc("next_invoice_number");
  const invoiceNumber = (numRow as unknown as string) || `INV-${Date.now()}`;
  const subtotal = Math.round((args.paidAmount / 1.15) * 100) / 100;
  const vat = Math.round((args.paidAmount - subtotal) * 100) / 100;

  await supabaseAdmin.from("orders").update({
    invoice_number: invoiceNumber,
    invoice_issued_at: new Date().toISOString(),
    subtotal_amount: subtotal,
    vat_amount: vat,
  } as never).eq("id", args.orderId);

  // 2) Compute renewal date and activate the org's subscription.
  const now = new Date();
  const renewalAt = new Date(now);
  if (args.billingCycle === "annual") renewalAt.setFullYear(renewalAt.getFullYear() + 1);
  else renewalAt.setMonth(renewalAt.getMonth() + 1);

  let activatedSubId: string | null = args.subscriptionId;
  if (args.subscriptionId) {
    await supabaseAdmin.from("subscriptions").update({
      status: "active",
      payment_status: "paid",
      start_at: now.toISOString(),
      renewal_at: renewalAt.toISOString(),
      end_at: renewalAt.toISOString(),
      auto_renew: true,
      amount: args.paidAmount,
    } as never).eq("id", args.subscriptionId);
  } else if (args.organizationId) {
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("organization_id", args.organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sub?.id) {
      activatedSubId = sub.id as string;
      await supabaseAdmin.from("subscriptions").update({
        status: "active",
        payment_status: "paid",
        start_at: now.toISOString(),
        renewal_at: renewalAt.toISOString(),
        end_at: renewalAt.toISOString(),
        auto_renew: true,
        amount: args.paidAmount,
      } as never).eq("id", sub.id);
    }
  }

  // 3) Persist saved card (best-effort — fields vary across Paylink responses).
  if (args.organizationId) {
    const inv = args.invoice ?? {};
    const cardBrand = inv.cardBrand ?? inv.paymentSystem ?? inv.card?.brand ?? null;
    const cardLast4 = inv.cardLastDigits ?? inv.cardLast4 ?? inv.card?.lastDigits ?? null;
    const cardToken = inv.cardToken ?? inv.token ?? null;
    if (cardBrand || cardLast4 || cardToken) {
      await supabaseAdmin.from("payment_methods").insert({
        organization_id: args.organizationId,
        provider: "paylink",
        card_token: cardToken,
        brand: cardBrand,
        last4: cardLast4,
        is_default: true,
      } as never);
    }
  }

  // 4) Send the receipt email (best-effort — never block payment activation).
  try {
    await sendPaymentReceiptEmail({
      orderId: args.orderId,
      invoiceNumber,
      paidAmount: args.paidAmount,
      currency: "SAR",
      customerEmail: args.customerEmail,
      customerName: args.customerName,
      renewalAt: renewalAt.toISOString(),
      billingCycle: args.billingCycle,
    });
  } catch (e) {
    console.error(JSON.stringify({ scope: "paylink", step: "email.failed", orderId: args.orderId, message: (e as Error).message }));
  }
}

async function sendPaymentReceiptEmail(args: {
  orderId: string;
  invoiceNumber: string;
  paidAmount: number;
  currency: string;
  customerEmail: string | null;
  customerName: string | null;
  renewalAt: string;
  billingCycle: string;
}) {
  if (!args.customerEmail) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { signInvoiceToken } = await import("@/lib/invoice-pdf.server");
  const { brandedWrap } = await import("@/lib/email-templates");

  const base = process.env.APP_BASE_URL?.replace(/\/$/, "") ?? "https://totalreward.app";
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
  const token = await signInvoiceToken(args.orderId, exp);
  const downloadUrl = `${base}/api/public/invoices/${args.orderId}?token=${encodeURIComponent(token)}`;
  const renewalNice = new Date(args.renewalAt).toLocaleDateString("en-GB");
  const amountNice = `${args.currency} ${args.paidAmount.toFixed(2)}`;
  const cycle = args.billingCycle === "annual" ? "Annual" : "Monthly";
  const hello = args.customerName ? `Hi ${args.customerName.split(" ")[0]},` : "Hi,";

  const body = `
    <p style="font-size:18px;font-weight:600;margin:0 0 8px 0">Payment received 🎉</p>
    <p style="margin:0 0 14px 0;color:#475569">${hello} we received your payment and your subscription is now active.</p>
    <table role="presentation" style="width:100%;border-collapse:collapse;margin:14px 0">
      <tr><td style="padding:6px 0;color:#64748b">Invoice</td><td style="text-align:right;font-weight:600">${args.invoiceNumber}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Amount paid</td><td style="text-align:right;font-weight:600">${amountNice}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Billing cycle</td><td style="text-align:right;font-weight:600">${cycle}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Next renewal</td><td style="text-align:right;font-weight:600">${renewalNice}</td></tr>
    </table>
    <p style="margin:18px 0 22px 0">
      <a href="${downloadUrl}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600">Download invoice (PDF)</a>
    </p>
    <p style="margin:0 0 6px 0"><a href="${base}/app/billing" style="color:#1f4fd9">Manage your subscription</a></p>
    <p style="color:#64748b;font-size:12px;margin-top:18px">If you didn't make this payment, contact support@totalreward.app immediately.</p>
  `;

  const subject = `Payment received — ${args.invoiceNumber}`;
  const html = brandedWrap({ subject, bodyHtml: body, locale: "en" });
  const messageId = `receipt-${args.orderId}`;

  const { error } = await supabaseAdmin.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      to: args.customerEmail,
      from: "Total Reward <noreply@totalreward.app>",
      sender_domain: "notify.totalreward.app",
      subject,
      html,
      message_id: messageId,
      label: "payment_receipt",
      purpose: "transactional",
      idempotency_key: messageId,
      queued_at: new Date().toISOString(),
      metadata: { invoice_number: args.invoiceNumber, amount: args.paidAmount },
    },
  });
  if (error) throw new Error(error.message);

  await supabaseAdmin.from("email_send_log").insert({
    message_id: messageId,
    template_name: "payment_receipt",
    recipient_email: args.customerEmail,
    status: "pending",
    metadata: { invoice_number: args.invoiceNumber, order_id: args.orderId },
  });
}
