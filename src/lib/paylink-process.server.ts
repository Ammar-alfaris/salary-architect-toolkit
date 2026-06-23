/**
 * Paylink processing core (server-only).
 *
 * Used by:
 *   - verifyPaylinkPayment (browser callback flow)
 *   - /api/public/paylink/webhook (server-to-server notification)
 *
 * Always trusts ONLY the response from Paylink's getInvoice API — never
 * the request payload. Safe to call multiple times for the same order
 * (idempotent: invoice number is allocated once, subscription is set to
 * active on every call but with the same renewal date math).
 */

import type { PaylinkGetInvoiceResponse } from "@/lib/paylink.server";

export type PaylinkProcessResult = {
  orderId: string;
  paymentStatus: "paid" | "failed" | "pending" | "cancelled";
  paidAmount: number;
  alreadyProcessed: boolean;
};

export async function processPaylinkTransaction(args: {
  transactionNo: string;
  orderId?: string;
}): Promise<PaylinkProcessResult | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { authenticate, getInvoice, mapPaylinkStatus, getCurrentPaylinkMode } =
    await import("@/lib/paylink.server");

  // 1) Find the order.
  let order: any = null;
  if (args.orderId) {
    const { data } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", args.orderId)
      .maybeSingle();
    order = data;
  }
  if (!order) {
    const { data } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("paylink_transaction_no", args.transactionNo)
      .maybeSingle();
    order = data;
  }
  if (!order) {
    console.warn(
      JSON.stringify({ scope: "paylink", step: "process.orderNotFound", transactionNo: args.transactionNo }),
    );
    return null;
  }

  // 2) Verify with Paylink.
  const mode = await getCurrentPaylinkMode();
  const token = await authenticate(mode);
  const invoice = await getInvoice(mode, args.transactionNo, token);
  const paymentStatus = mapPaylinkStatus(invoice.orderStatus);
  const paidAmount =
    typeof invoice.amount === "number" ? invoice.amount : Number(order.amount);

  // 3) Update order row.
  await supabaseAdmin
    .from("orders")
    .update({
      status: paymentStatus,
      paid_amount: paymentStatus === "paid" ? paidAmount : null,
      paid_at: paymentStatus === "paid" ? new Date().toISOString() : null,
      raw_verify_response: invoice as never,
    } as never)
    .eq("id", order.id);

  // 4) Activate subscription once.
  const alreadyProcessed = !!order.invoice_number;
  if (paymentStatus === "paid" && !alreadyProcessed) {
    // Fallback: if checkout didn't capture an email, use the org primary admin.
    let receiptEmail = (order.customer_email as string | null) ?? null;
    let receiptName = (order.customer_name as string | null) ?? null;
    if (!receiptEmail && order.organization_id) {
      try {
        const { resolveOrgPrimaryEmail } = await import("@/lib/notify.server");
        const fb = await resolveOrgPrimaryEmail(order.organization_id as string);
        receiptEmail = fb.email;
        receiptName = receiptName ?? fb.name;
      } catch {}
    }
    await activateOrderAsSubscription({
      orderId: order.id as string,
      organizationId: order.organization_id as string | null,
      subscriptionId: order.subscription_id as string | null,
      billingCycle: (order.billing_cycle as string | null) ?? "monthly",
      paidAmount,
      invoice,
      customerEmail: receiptEmail,
      customerName: receiptName,
    });
  } else if (
    (paymentStatus === "failed" || paymentStatus === "cancelled") &&
    !alreadyProcessed &&
    order.organization_id
  ) {
    try {
      const { resolveOrgPrimaryEmail, sendPaymentFailedEmail } = await import(
        "@/lib/notify.server"
      );
      const fb = await resolveOrgPrimaryEmail(order.organization_id as string);
      const to = (order.customer_email as string | null) ?? fb.email;
      if (to) {
        await sendPaymentFailedEmail({
          to,
          name: (order.customer_name as string | null) ?? fb.name,
          locale: fb.locale,
          invoiceNumber: (order.invoice_number as string | null) ?? null,
          amount: paidAmount,
          orderId: order.id as string,
        });
      }
    } catch (e) {
      console.error(JSON.stringify({
        scope: "paylink", step: "email.failedNotify",
        orderId: order.id, message: (e as Error).message,
      }));
    }
  }

  return {
    orderId: order.id as string,
    paymentStatus,
    paidAmount,
    alreadyProcessed,
  };
}

async function activateOrderAsSubscription(args: {
  orderId: string;
  organizationId: string | null;
  subscriptionId: string | null;
  billingCycle: string;
  paidAmount: number;
  invoice: PaylinkGetInvoiceResponse;
  customerEmail: string | null;
  customerName: string | null;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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

  const now = new Date();
  const renewalAt = new Date(now);
  if (args.billingCycle === "annual") renewalAt.setFullYear(renewalAt.getFullYear() + 1);
  else renewalAt.setMonth(renewalAt.getMonth() + 1);

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

  if (args.organizationId) {
    const inv: any = args.invoice ?? {};
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
    console.error(JSON.stringify({
      scope: "paylink", step: "email.failed", orderId: args.orderId, message: (e as Error).message,
    }));
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
      text: `Payment received — ${args.invoiceNumber}. Amount: ${args.currency} ${args.paidAmount.toFixed(2)}. Manage your subscription at ${base}/app/billing.`,
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
