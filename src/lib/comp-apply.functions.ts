// Server-side application of sensitive compensation changes.
// Centralizes role checks + Zod validation for:
//  - applying an individual salary change
//  - finalizing a merit cycle (bulk salary updates + cycle close)
//  - finalizing a bonus cycle (bulk bonus results + cycle close)
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MERIT_REC = z.object({
  id: z.string().uuid(),
  base: z.number().nonnegative(),
  pct: z.number().min(-100).max(500),
  increase: z.number(),
  newSalary: z.number().nonnegative(),
});

const BONUS_REC = z.object({
  id: z.string().uuid(),
  base: z.number().nonnegative(),
  target: z.number().min(0).max(500),
  bonus: z.number().nonnegative(),
});

async function ensureAdminOrManager(ctx: { supabase: any; userId: string }, organizationId: string) {
  const { data, error } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("organization_id", organizationId);
  if (error) throw new Response(error.message, { status: 500 });
  const roles = (data ?? []).map((r: any) => r.role);
  if (!roles.some((r: string) => r === "admin" || r === "manager")) {
    throw new Response("Forbidden: admin or manager role required", { status: 403 });
  }
}

// ─── Individual salary change ──────────────────────────────────────────────
export const applySalaryChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      organizationId: z.string().uuid(),
      employeeId: z.string().uuid(),
      newSalary: z.number().positive().max(100_000_000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdminOrManager(context, data.organizationId);
    // Make sure employee belongs to this org (RLS would block otherwise, but
    // a server-side check returns a clean error).
    const { data: emp, error: empErr } = await context.supabase
      .from("employees")
      .select("id, organization_id, base_salary")
      .eq("id", data.employeeId)
      .maybeSingle();
    if (empErr) throw new Response(empErr.message, { status: 500 });
    if (!emp || emp.organization_id !== data.organizationId) {
      throw new Response("Employee not found in this organization", { status: 404 });
    }
    const { error } = await context.supabase
      .from("employees")
      .update({ base_salary: data.newSalary })
      .eq("id", data.employeeId);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true, previous: Number(emp.base_salary), next: data.newSalary };
  });

// ─── Merit cycle finalization ──────────────────────────────────────────────
export const applyMeritCycle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      organizationId: z.string().uuid(),
      cycleId: z.string().uuid(),
      recommendations: z.array(MERIT_REC).max(10000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdminOrManager(context, data.organizationId);

    const { data: cycle, error: cErr } = await context.supabase
      .from("merit_cycles")
      .select("id, organization_id, status")
      .eq("id", data.cycleId)
      .maybeSingle();
    if (cErr) throw new Response(cErr.message, { status: 500 });
    if (!cycle || cycle.organization_id !== data.organizationId) {
      throw new Response("Merit cycle not found", { status: 404 });
    }
    if (cycle.status === "closed") {
      throw new Response("Merit cycle already closed", { status: 409 });
    }

    if (data.recommendations.length) {
      const rows = data.recommendations.map((r) => ({
        merit_cycle_id: data.cycleId,
        employee_id: r.id,
        current_salary: r.base,
        recommended_increase_percent: r.pct,
        increase_amount: r.increase,
        new_salary: r.newSalary,
      }));
      const { error: insErr } = await context.supabase.from("merit_results").insert(rows as never);
      if (insErr) throw new Response(insErr.message, { status: 500 });

      for (const r of data.recommendations) {
        const { error: upErr } = await context.supabase
          .from("employees")
          .update({ base_salary: r.newSalary })
          .eq("id", r.id)
          .eq("organization_id", data.organizationId);
        if (upErr) throw new Response(upErr.message, { status: 500 });
      }
    }

    const { data: u } = await context.supabase.auth.getUser();
    const { error: closeErr } = await context.supabase
      .from("merit_cycles")
      .update({
        status: "closed",
        approved_at: new Date().toISOString(),
        approved_by: context.userId,
        approved_by_email: u.user?.email ?? null,
        finalized_at: new Date().toISOString(),
      })
      .eq("id", data.cycleId);
    if (closeErr) throw new Response(closeErr.message, { status: 500 });

    return { ok: true, applied: data.recommendations.length };
  });

// ─── Bonus cycle finalization ──────────────────────────────────────────────
export const applyBonusCycle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      organizationId: z.string().uuid(),
      cycleId: z.string().uuid(),
      results: z.array(BONUS_REC).max(10000),
      bulkPerf: z.number().min(0).max(10).optional(),
      bulkBiz: z.number().min(0).max(10).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdminOrManager(context, data.organizationId);

    const { data: cycle, error: cErr } = await context.supabase
      .from("bonus_cycles")
      .select("id, organization_id, status")
      .eq("id", data.cycleId)
      .maybeSingle();
    if (cErr) throw new Response(cErr.message, { status: 500 });
    if (!cycle || cycle.organization_id !== data.organizationId) {
      throw new Response("Bonus cycle not found", { status: 404 });
    }
    if (cycle.status === "closed") {
      throw new Response("Bonus cycle already closed", { status: 409 });
    }

    if (data.results.length) {
      const rows = data.results.map((r) => ({
        bonus_cycle_id: data.cycleId,
        employee_id: r.id,
        base_salary: r.base,
        target_bonus_percent: r.target,
        performance_multiplier: data.bulkPerf ?? 1,
        business_multiplier: data.bulkBiz ?? 1,
        individual_modifier: 1,
        calculated_bonus: r.bonus,
        proration_factor: 1,
      }));
      const { error: insErr } = await context.supabase.from("bonus_results").insert(rows as never);
      if (insErr) throw new Response(insErr.message, { status: 500 });
    }

    const { data: u } = await context.supabase.auth.getUser();
    const { error: closeErr } = await context.supabase
      .from("bonus_cycles")
      .update({
        status: "closed",
        approved_at: new Date().toISOString(),
        approved_by: context.userId,
        approved_by_email: u.user?.email ?? null,
        finalized_at: new Date().toISOString(),
      })
      .eq("id", data.cycleId);
    if (closeErr) throw new Response(closeErr.message, { status: 500 });

    return { ok: true, applied: data.results.length };
  });
