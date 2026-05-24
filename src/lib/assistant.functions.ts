// AI Assistant server functions — powered by Lovable AI Gateway.
// Two modes:
//  - ask: data Q&A grounded in an org compensation snapshot
//  - analyzeCv: review pasted CV text and return structured insights
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-3-flash-preview";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function callAI(messages: ChatMessage[], model = DEFAULT_MODEL): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Response("AI not configured", { status: 500 });
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages }),
  });
  if (res.status === 429) throw new Response("Rate limit exceeded. Please try again shortly.", { status: 429 });
  if (res.status === 402) throw new Response("AI credits exhausted. Add credits in workspace usage.", { status: 402 });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Response(`AI error: ${t || res.statusText}`, { status: 500 });
  }
  const json = await res.json();
  return json?.choices?.[0]?.message?.content ?? "";
}

// ─── Build a compact org snapshot (no PII names beyond aggregates) ──────────
async function buildOrgSnapshot(supabase: any, organizationId: string) {
  const { data: emps } = await supabase
    .from("employees")
    .select("department,job_title,location,base_salary,target_bonus_percent,performance_rating,gender,employment_status")
    .eq("organization_id", organizationId)
    .eq("archived", false);
  const list = (emps ?? []) as any[];
  const total = list.length;
  if (!total) return { total: 0 };

  const byDept: Record<string, { count: number; sum: number; avg?: number }> = {};
  const byLoc: Record<string, number> = {};
  const byRating: Record<string, number> = {};
  const byGender: Record<string, { count: number; sum: number; avg?: number }> = {};
  let salarySum = 0;
  let salaryMin = Infinity;
  let salaryMax = -Infinity;

  for (const e of list) {
    const s = Number(e.base_salary) || 0;
    salarySum += s;
    if (s > 0) {
      salaryMin = Math.min(salaryMin, s);
      salaryMax = Math.max(salaryMax, s);
    }
    const d = e.department ?? "Unknown";
    byDept[d] = byDept[d] || { count: 0, sum: 0 };
    byDept[d].count++; byDept[d].sum += s;
    const l = e.location ?? "Unknown";
    byLoc[l] = (byLoc[l] ?? 0) + 1;
    const r = e.performance_rating ?? "Unrated";
    byRating[r] = (byRating[r] ?? 0) + 1;
    const g = e.gender ?? "Unspecified";
    byGender[g] = byGender[g] || { count: 0, sum: 0 };
    byGender[g].count++; byGender[g].sum += s;
  }
  for (const k of Object.keys(byDept)) byDept[k].avg = Math.round(byDept[k].sum / byDept[k].count);
  for (const k of Object.keys(byGender)) byGender[k].avg = Math.round(byGender[k].sum / byGender[k].count);

  return {
    total,
    payroll_total: Math.round(salarySum),
    salary_avg: Math.round(salarySum / total),
    salary_min: salaryMin === Infinity ? 0 : salaryMin,
    salary_max: salaryMax === -Infinity ? 0 : salaryMax,
    by_department: byDept,
    by_location: byLoc,
    by_performance: byRating,
    by_gender: byGender,
  };
}

// ─── Data Q&A ───────────────────────────────────────────────────────────────
const askSchema = z.object({
  question: z.string().min(2).max(2000),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(4000),
  })).max(20).optional(),
  organizationId: z.string().uuid(),
  locale: z.enum(["en", "ar"]).default("en"),
});

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => askSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const snapshot = await buildOrgSnapshot(supabase, data.organizationId);
    const sys = [
      `You are a Total Rewards AI assistant for a CEO/CHRO audience.`,
      `Respond in ${data.locale === "ar" ? "Arabic" : "English"}, concise, with bullet points and concrete numbers.`,
      `Always ground your answers in the JSON snapshot below. If the data is insufficient, say so.`,
      `Never invent employee names. Aggregate insights only.`,
      ``,
      `ORG_SNAPSHOT = ${JSON.stringify(snapshot)}`,
    ].join("\n");
    const messages: ChatMessage[] = [
      { role: "system", content: sys },
      ...(data.history ?? []),
      { role: "user", content: data.question },
    ];
    const answer = await callAI(messages);
    return { answer, snapshot_total: snapshot.total };
  });

// ─── CV Analysis ────────────────────────────────────────────────────────────
const cvSchema = z.object({
  cvText: z.string().min(50).max(20000),
  jobTitle: z.string().max(200).optional(),
  locale: z.enum(["en", "ar"]).default("en"),
});

export const analyzeCv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => cvSchema.parse(d))
  .handler(async ({ data }) => {
    const sys = [
      `You are an HR recruitment assistant. Analyze the CV provided and produce a structured review.`,
      `Respond in ${data.locale === "ar" ? "Arabic" : "English"} using Markdown with these sections:`,
      `## Summary`,
      `## Key Strengths`,
      `## Experience Highlights`,
      `## Skills (categorized)`,
      `## Red Flags / Gaps`,
      `## Fit Score (1-10) and Rationale`,
      `## Suggested Interview Questions (5)`,
      data.jobTitle ? `Target role: ${data.jobTitle}` : "",
    ].filter(Boolean).join("\n");
    const messages: ChatMessage[] = [
      { role: "system", content: sys },
      { role: "user", content: `CV:\n\n${data.cvText}` },
    ];
    const analysis = await callAI(messages);
    return { analysis };
  });
