import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

async function getOrCreateUnsubscribeToken(supabase: any, email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const { data: existing, error: existingError } = await supabase
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingError) throw existingError;
  if ((existing as { token?: string } | null)?.token) return (existing as { token: string }).token;

  const token = crypto.randomUUID();
  const { error: insertError } = await supabase.from("email_unsubscribe_tokens").insert({
    email: normalizedEmail,
    token,
  });

  if (!insertError) return token;

  const { data: retryExisting, error: retryError } = await supabase
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (retryError) throw retryError;
  if ((retryExisting as { token?: string } | null)?.token) return (retryExisting as { token: string }).token;

  throw insertError;
}

const RecipientSchema = z.object({
  email: z.string().email(),
  name: z.string().nullable().optional(),
});

const InputSchema = z.object({
  templateKey: z.string(),
  subject: z.string(),
  html: z.string(),
  text: z.string().optional(),
  locale: z.enum(["ar", "en"]),
  recipients: z.array(RecipientSchema).min(1).max(2000),
});

export const sendEmailCampaign = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceKey) {
      throw new Error("Email service is not configured");
    }
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const SITE_NAME = "RewardArchitect";
    const SENDER_DOMAIN = "notify.totalreward.app";
    const FROM_DOMAIN = "totalreward.app";

    let queued = 0;
    const errors: string[] = [];
    const messageIds: string[] = [];
    for (const r of data.recipients) {
      const messageId = `campaign-${data.templateKey}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const unsubscribeToken = await getOrCreateUnsubscribeToken(supabase, r.email);
      const payload = {
        to: r.email,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: data.subject,
        html: data.html,
        text: data.text || data.html.replace(/<[^>]+>/g, " "),
        message_id: messageId,
        label: data.templateKey,
        purpose: "transactional",
        idempotency_key: messageId,
        unsubscribe_token: unsubscribeToken,
        queued_at: new Date().toISOString(),
        metadata: { recipient_name: r.name ?? null, locale: data.locale },
      };
      const { error: enqErr } = await supabase.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload,
      });
      if (enqErr) {
        errors.push(`${r.email}: ${enqErr.message}`);
        continue;
      }
      await supabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: data.templateKey,
        recipient_email: r.email,
        status: "pending",
        metadata: { campaign: true, locale: data.locale },
      });
      messageIds.push(messageId);
      queued++;
    }
    return { queued, failed: errors.length, errors: errors.slice(0, 10), messageIds };
  });
