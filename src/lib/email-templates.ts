// Helpers for fetching email templates from DB and rendering with variables.
import { supabase } from "@/integrations/supabase/client";

export interface EmailTemplate {
  id: string;
  key: string;
  display_name: string;
  description: string | null;
  category: string;
  subject_ar: string;
  subject_en: string;
  body_ar: string;
  body_en: string;
  variables: string[];
  is_system: boolean;
  enabled: boolean;
}

export function interpolate(tpl: string, vars: Record<string, string | number | undefined | null>) {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => {
    const v = vars[k];
    return v == null ? "" : String(v);
  });
}

export async function fetchTemplate(key: string): Promise<EmailTemplate | null> {
  const { data } = await supabase.from("email_templates").select("*").eq("key", key).maybeSingle();
  return (data as any) ?? null;
}

export async function listTemplates() {
  const { data } = await supabase.from("email_templates").select("*").order("category").order("display_name");
  return (data ?? []) as unknown as EmailTemplate[];
}

const LOGO_URL = "https://www.totalreward.app/logo.png";

export function brandedWrap(args: { subject: string; bodyHtml: string; locale: "ar" | "en" }) {
  const dir = args.locale === "ar" ? "rtl" : "ltr";
  const align = args.locale === "ar" ? "right" : "left";
  return `<!doctype html><html lang="${args.locale}" dir="${dir}"><head><meta charset="utf-8"/><title>${args.subject}</title></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Tahoma,Arial,sans-serif;color:#0f172a;direction:${dir};text-align:${align}">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="text-align:center;padding:28px 20px 12px">
      <img src="${LOGO_URL}" alt="Total Reward" style="height:42px"/>
    </div>
    <div style="padding:8px 28px 28px;font-size:15px;line-height:1.7;color:#0f172a">
      ${args.bodyHtml}
    </div>
    <div style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;text-align:center">
      © ${new Date().getFullYear()} Total Reward · totalreward.app
    </div>
  </div>
</body></html>`;
}

export interface RenderedEmail { subject: string; html: string; locale: "ar" | "en" }

export function renderTemplate(tpl: EmailTemplate, vars: Record<string, string | number | undefined | null>, locale: "ar" | "en"): RenderedEmail {
  const subject = interpolate(locale === "ar" ? tpl.subject_ar || tpl.subject_en : tpl.subject_en || tpl.subject_ar, vars);
  const body = interpolate(locale === "ar" ? tpl.body_ar || tpl.body_en : tpl.body_en || tpl.body_ar, vars);
  return { subject, html: brandedWrap({ subject, bodyHtml: body, locale }), locale };
}
