// Quota helpers — per-org usage vs plan limits.
import { supabase } from "@/integrations/supabase/client";

export interface OrgUsage {
  planId: string | null;
  planName: string | null;
  maxUsers: number;
  maxEmployees: number;
  usersCount: number;
  employeesCount: number;
  status: string | null;
}

export async function getOrgUsage(organizationId: string): Promise<OrgUsage> {
  const [{ data: sub }, { count: usersCount }, { count: employeesCount }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("status, plan:plans(id, name, max_users, max_employees)")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
  ]);

  const plan = (sub as any)?.plan;
  return {
    planId: plan?.id ?? null,
    planName: plan?.name ?? null,
    maxUsers: plan?.max_users ?? 3,
    maxEmployees: plan?.max_employees ?? 50,
    usersCount: usersCount ?? 0,
    employeesCount: employeesCount ?? 0,
    status: (sub as any)?.status ?? null,
  };
}

export function isUsersFull(u: OrgUsage) {
  return u.usersCount >= u.maxUsers;
}
export function isEmployeesFull(u: OrgUsage) {
  return u.employeesCount >= u.maxEmployees;
}
