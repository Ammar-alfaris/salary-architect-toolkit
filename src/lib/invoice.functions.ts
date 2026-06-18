import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const DownloadSchema = z.object({ orderId: z.string().uuid() });

/**
 * Returns a temporary signed download URL for an invoice PDF.
 * Authorization: caller must own the order, or be a member of the order's organization.
 */
export const getInvoiceDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => DownloadSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order } = await supabase
      .from("orders")
      .select("id, user_id, organization_id, invoice_number")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Invoice not found");
    if (!order.invoice_number) throw new Error("Invoice not issued yet");

    const ownsOrder = order.user_id === userId;
    let allowed = ownsOrder;
    if (!allowed && order.organization_id) {
      const { data: member } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("user_id", userId)
        .eq("organization_id", order.organization_id)
        .maybeSingle();
      allowed = Boolean(member);
    }
    if (!allowed) throw new Error("Forbidden");

    const { signInvoiceToken } = await import("@/lib/invoice-pdf.server");
    const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30; // 30 days
    const token = await signInvoiceToken(order.id as string, exp);
    const base = process.env.APP_BASE_URL?.replace(/\/$/, "") ?? "";
    return {
      url: `${base}/api/public/invoices/${order.id}?token=${encodeURIComponent(token)}`,
      invoiceNumber: order.invoice_number,
    };
  });

/** List paid invoices for the current user's organization. */
export const listMyInvoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: role } = await supabase
      .from("user_roles")
      .select("organization_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    const orgId = role?.organization_id;
    if (!orgId) return { invoices: [] };

    const { data } = await supabase
      .from("orders")
      .select("id, invoice_number, invoice_issued_at, paid_amount, amount, currency, status, billing_cycle")
      .eq("organization_id", orgId)
      .not("invoice_number", "is", null)
      .order("invoice_issued_at", { ascending: false })
      .limit(50);
    return { invoices: data ?? [] };
  });

/** Returns the saved default card for the current user's organization (if any). */
export const getDefaultPaymentMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: role } = await supabase
      .from("user_roles")
      .select("organization_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    const orgId = role?.organization_id;
    if (!orgId) return { method: null };
    const { data } = await supabase
      .from("payment_methods")
      .select("brand, last4, exp_month, exp_year, is_default, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { method: data ?? null };
  });
