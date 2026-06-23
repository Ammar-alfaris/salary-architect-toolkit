/**
 * Bilingual transactional email helpers (server-only).
 *
 * Centralizes every customer-facing notification so the wording, branding,
 * idempotency rules and email_send_log entries stay consistent.
 *
 * Triggers covered:
 *   - payment_receipt (called from paylink-process.server.ts)
 *   - subscription_cancelled
 *   - subscription_renewal_reminder (T-7)
 *   - payment_failed
 *   - trial_ending (T-3)
 *   - welcome (first sign-in)
 *
 * Password reset / email confirm / magic link / email change / invite are
 * delivered by the Lovable auth hook (src/routes/lovable/email/auth/webhook.ts),
 * not from here.
 */

import { brandedWrap } from "@/lib/email-templates";

export type Locale = "ar" | "en";

const FROM = "Total Reward <noreply@totalreward.app>";
const SENDER_DOMAIN = "notify.totalreward.app";
const BASE_URL =
  (process.env.APP_BASE_URL ?? "https://totalreward.app").replace(/\/$/, "");

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}


async function getOrCreateUnsubscribeToken(email: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const normalized = email.trim().toLowerCase();
  const { data: existing } = await supabaseAdmin
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", normalized)
    .maybeSingle();
  if ((existing as any)?.token) return (existing as any).token as string;
  const token = crypto.randomUUID();
  const { error } = await supabaseAdmin
    .from("email_unsubscribe_tokens")
    .insert({ email: normalized, token } as never);
  if (!error) return token;
  const { data: retry } = await supabaseAdmin
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", normalized)
    .maybeSingle();
  if ((retry as any)?.token) return (retry as any).token as string;
  throw new Error(error.message);
}

async function enqueue(args: {
  to: string;
  subject: string;
  html: string;
  messageId: string;
  label: string;
  metadata?: Record<string, unknown>;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const unsubscribeToken = await getOrCreateUnsubscribeToken(args.to);
  const { error } = await supabaseAdmin.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      to: args.to,
      from: FROM,
      sender_domain: SENDER_DOMAIN,
      subject: args.subject,
      html: args.html,
      text: htmlToText(args.html),
      unsubscribe_token: unsubscribeToken,
      message_id: args.messageId,
      label: args.label,
      purpose: "transactional",
      idempotency_key: args.messageId,
      queued_at: new Date().toISOString(),
      metadata: (args.metadata ?? {}) as Record<string, unknown>,
    } as never,
  });
  if (error) throw new Error(error.message);
  await supabaseAdmin.from("email_send_log").insert({
    message_id: args.messageId,
    template_name: args.label,
    recipient_email: args.to,
    status: "pending",
    metadata: args.metadata ?? {},
  } as never);
}

/** Resolve the best email for an organization: org primary admin user. */
export async function resolveOrgPrimaryEmail(
  organizationId: string,
): Promise<{ email: string | null; name: string | null; locale: Locale }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("locale")
    .eq("id", organizationId)
    .maybeSingle();
  const locale: Locale = (org as any)?.locale === "ar" ? "ar" : "en";

  const { data: role } = await supabaseAdmin
    .from("user_roles")
    .select("user_id, created_at")
    .eq("organization_id", organizationId)
    .eq("role", "admin")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const userId = (role as any)?.user_id as string | undefined;
  if (!userId) return { email: null, name: null, locale };
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .maybeSingle();
  return {
    email: (profile as any)?.email ?? null,
    name: (profile as any)?.full_name ?? null,
    locale,
  };
}

function fmtDate(iso: string, locale: Locale) {
  return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB");
}
function fmtAmount(n: number, currency = "SAR") {
  return `${currency} ${n.toFixed(2)}`;
}
function greet(locale: Locale, name: string | null) {
  if (locale === "ar")
    return name ? `مرحباً ${name.split(" ")[0]}،` : "مرحباً،";
  return name ? `Hi ${name.split(" ")[0]},` : "Hi,";
}

/* ───────────────────────── 1. Subscription cancelled ───────────────────────── */

export async function sendSubscriptionCancelledEmail(args: {
  to: string;
  name: string | null;
  locale: Locale;
  endAt: string | null;
  subscriptionId: string;
}) {
  const dateStr = args.endAt ? fmtDate(args.endAt, args.locale) : "—";
  const subject =
    args.locale === "ar"
      ? "تم إلغاء اشتراكك في Total Reward"
      : "Your Total Reward subscription has been cancelled";
  const body =
    args.locale === "ar"
      ? `
    <p style="font-size:18px;font-weight:600;margin:0 0 8px 0">تم استلام طلب الإلغاء</p>
    <p>${greet(args.locale, args.name)} استلمنا طلبك لإلغاء الاشتراك.</p>
    <ul style="padding-inline-start:18px;color:#475569">
      <li>سيستمر وصولك حتى <b>${dateStr}</b>.</li>
      <li><b>لن يتم خصم أي مبلغ إضافي</b> من بطاقتك بعد هذا التاريخ.</li>
      <li>يمكنك إعادة تفعيل الاشتراك في أي وقت قبل انتهاء الفترة الحالية.</li>
    </ul>
    <p style="margin-top:18px"><a href="${BASE_URL}/app/billing" style="color:#1f4fd9">إدارة الاشتراك</a></p>
    <p style="color:#64748b;font-size:12px;margin-top:18px">إذا لم تطلب هذا الإلغاء، تواصل معنا على support@totalreward.app فوراً.</p>`
      : `
    <p style="font-size:18px;font-weight:600;margin:0 0 8px 0">Cancellation confirmed</p>
    <p>${greet(args.locale, args.name)} we received your request to cancel.</p>
    <ul style="padding-inline-start:18px;color:#475569">
      <li>You keep full access until <b>${dateStr}</b>.</li>
      <li><b>No further charges</b> will be made to your card after that date.</li>
      <li>You can resume any time before the current period ends.</li>
    </ul>
    <p style="margin-top:18px"><a href="${BASE_URL}/app/billing" style="color:#1f4fd9">Manage subscription</a></p>
    <p style="color:#64748b;font-size:12px;margin-top:18px">If you didn't request this, contact support@totalreward.app immediately.</p>`;
  await enqueue({
    to: args.to,
    subject,
    html: brandedWrap({ subject, bodyHtml: body, locale: args.locale }),
    messageId: `sub-cancelled-${args.subscriptionId}`,
    label: "subscription_cancelled",
    metadata: { subscription_id: args.subscriptionId, end_at: args.endAt },
  });
}

/* ───────────────────── 2. Renewal reminder (T-7 days) ───────────────────── */

export async function sendRenewalReminderEmail(args: {
  to: string;
  name: string | null;
  locale: Locale;
  renewalAt: string;
  amount: number;
  currency?: string;
  cardLast4: string | null;
  planName: string | null;
  subscriptionId: string;
}) {
  const dateStr = fmtDate(args.renewalAt, args.locale);
  const amount = fmtAmount(args.amount, args.currency ?? "SAR");
  const card = args.cardLast4 ? `•••• ${args.cardLast4}` : "—";
  const plan = args.planName ?? "—";
  const subject =
    args.locale === "ar"
      ? `تذكير بالتجديد: سيتم خصم ${amount} بتاريخ ${dateStr}`
      : `Renewal reminder: ${amount} will be charged on ${dateStr}`;
  const body =
    args.locale === "ar"
      ? `
    <p style="font-size:18px;font-weight:600;margin:0 0 8px 0">تجديد اشتراكك خلال 7 أيام</p>
    <p>${greet(args.locale, args.name)} هذا تذكير بأن اشتراكك سيتجدد تلقائياً.</p>
    <table role="presentation" style="width:100%;border-collapse:collapse;margin:14px 0">
      <tr><td style="padding:6px 0;color:#64748b">الباقة</td><td style="text-align:left;font-weight:600">${plan}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">تاريخ التجديد</td><td style="text-align:left;font-weight:600">${dateStr}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">المبلغ</td><td style="text-align:left;font-weight:600">${amount}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">البطاقة</td><td style="text-align:left;font-weight:600">${card}</td></tr>
    </table>
    <p>إذا لم ترغب بالتجديد، يمكنك الإلغاء الآن وسيستمر وصولك حتى تاريخ التجديد دون أي خصم.</p>
    <p style="margin:18px 0 22px 0">
      <a href="${BASE_URL}/app/billing" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600">إدارة الاشتراك</a>
    </p>`
      : `
    <p style="font-size:18px;font-weight:600;margin:0 0 8px 0">Your subscription renews in 7 days</p>
    <p>${greet(args.locale, args.name)} this is a heads-up that your subscription will renew automatically.</p>
    <table role="presentation" style="width:100%;border-collapse:collapse;margin:14px 0">
      <tr><td style="padding:6px 0;color:#64748b">Plan</td><td style="text-align:right;font-weight:600">${plan}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Renewal date</td><td style="text-align:right;font-weight:600">${dateStr}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Amount</td><td style="text-align:right;font-weight:600">${amount}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Card on file</td><td style="text-align:right;font-weight:600">${card}</td></tr>
    </table>
    <p>If you don't want to renew, cancel now — your access continues until the renewal date and no charge is made.</p>
    <p style="margin:18px 0 22px 0">
      <a href="${BASE_URL}/app/billing" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600">Manage subscription</a>
    </p>`;
  // Idempotent per renewal cycle: bucket by the renewal date.
  const dayKey = args.renewalAt.slice(0, 10);
  await enqueue({
    to: args.to,
    subject,
    html: brandedWrap({ subject, bodyHtml: body, locale: args.locale }),
    messageId: `renewal-${args.subscriptionId}-${dayKey}`,
    label: "subscription_renewal_reminder",
    metadata: {
      subscription_id: args.subscriptionId,
      renewal_at: args.renewalAt,
      amount: args.amount,
    },
  });
}

/* ───────────────────────── 3. Payment failed ───────────────────────── */

export async function sendPaymentFailedEmail(args: {
  to: string;
  name: string | null;
  locale: Locale;
  invoiceNumber: string | null;
  amount: number;
  orderId: string;
}) {
  const subject =
    args.locale === "ar" ? "فشلت محاولة الدفع" : "Payment attempt failed";
  const amount = fmtAmount(args.amount, "SAR");
  const body =
    args.locale === "ar"
      ? `
    <p style="font-size:18px;font-weight:600;margin:0 0 8px 0">لم نتمكن من إتمام الدفع</p>
    <p>${greet(args.locale, args.name)} حاولنا تحصيل ${amount} ولم تنجح العملية.</p>
    <p>الرجاء التحقق من بيانات البطاقة أو استخدام بطاقة أخرى لإكمال الاشتراك.</p>
    <p style="margin:18px 0 22px 0">
      <a href="${BASE_URL}/app/billing" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600">إعادة المحاولة</a>
    </p>`
      : `
    <p style="font-size:18px;font-weight:600;margin:0 0 8px 0">We couldn't process your payment</p>
    <p>${greet(args.locale, args.name)} we tried to charge ${amount} but the attempt failed.</p>
    <p>Please check your card details or try a different card to keep your subscription active.</p>
    <p style="margin:18px 0 22px 0">
      <a href="${BASE_URL}/app/billing" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600">Retry payment</a>
    </p>`;
  await enqueue({
    to: args.to,
    subject,
    html: brandedWrap({ subject, bodyHtml: body, locale: args.locale }),
    messageId: `pay-failed-${args.orderId}`,
    label: "payment_failed",
    metadata: { order_id: args.orderId, invoice_number: args.invoiceNumber },
  });
}

/* ───────────────────────── 4. Trial ending (T-3) ───────────────────────── */

export async function sendTrialEndingEmail(args: {
  to: string;
  name: string | null;
  locale: Locale;
  trialEndAt: string;
  subscriptionId: string;
}) {
  const dateStr = fmtDate(args.trialEndAt, args.locale);
  const subject =
    args.locale === "ar"
      ? "تنتهي فترتك التجريبية قريباً"
      : "Your free trial is ending soon";
  const body =
    args.locale === "ar"
      ? `
    <p style="font-size:18px;font-weight:600;margin:0 0 8px 0">تنتهي الفترة التجريبية في ${dateStr}</p>
    <p>${greet(args.locale, args.name)} للحفاظ على وصولك دون انقطاع، فعّل اشتراكاً مدفوعاً قبل ${dateStr}.</p>
    <p style="margin:18px 0 22px 0">
      <a href="${BASE_URL}/app/billing" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600">تفعيل الاشتراك</a>
    </p>`
      : `
    <p style="font-size:18px;font-weight:600;margin:0 0 8px 0">Your trial ends on ${dateStr}</p>
    <p>${greet(args.locale, args.name)} to keep access without interruption, activate a paid plan before ${dateStr}.</p>
    <p style="margin:18px 0 22px 0">
      <a href="${BASE_URL}/app/billing" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600">Activate subscription</a>
    </p>`;
  await enqueue({
    to: args.to,
    subject,
    html: brandedWrap({ subject, bodyHtml: body, locale: args.locale }),
    messageId: `trial-ending-${args.subscriptionId}`,
    label: "trial_ending",
    metadata: { subscription_id: args.subscriptionId, trial_end_at: args.trialEndAt },
  });
}

/* ───────────────────────── 5. Welcome email ───────────────────────── */

export async function sendWelcomeEmail(args: {
  to: string;
  name: string | null;
  locale: Locale;
  userId: string;
}) {
  const subject =
    args.locale === "ar" ? "مرحباً بك في Total Reward" : "Welcome to Total Reward";
  const body =
    args.locale === "ar"
      ? `
    <p style="font-size:18px;font-weight:600;margin:0 0 8px 0">أهلاً بك 👋</p>
    <p>${greet(args.locale, args.name)} يسعدنا انضمامك. فترتك التجريبية بدأت — استكشف الأدوات وأنشئ أول هيكل رواتب الآن.</p>
    <p style="margin:18px 0 22px 0">
      <a href="${BASE_URL}/app" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600">ابدأ الآن</a>
    </p>
    <p>إذا احتجت أي مساعدة، راسلنا على support@totalreward.app.</p>`
      : `
    <p style="font-size:18px;font-weight:600;margin:0 0 8px 0">Welcome 👋</p>
    <p>${greet(args.locale, args.name)} glad to have you. Your free trial has started — explore the tools and build your first salary structure now.</p>
    <p style="margin:18px 0 22px 0">
      <a href="${BASE_URL}/app" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600">Open the app</a>
    </p>
    <p>Need anything? Email support@totalreward.app.</p>`;
  await enqueue({
    to: args.to,
    subject,
    html: brandedWrap({ subject, bodyHtml: body, locale: args.locale }),
    messageId: `welcome-${args.userId}`,
    label: "welcome",
    metadata: { user_id: args.userId },
  });
}
