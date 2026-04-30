import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type AppRole = "admin" | "analyst" | "manager" | "viewer";

const RANK: Record<AppRole, number> = { admin: 4, analyst: 3, manager: 2, viewer: 1 };

export interface Permissions {
  role: AppRole | null;
  loading: boolean;
  /** create / edit / delete structures, employees, cycles */
  canEdit: boolean;
  /** archive / delete sensitive entities */
  canDelete: boolean;
  /** manage users, org settings */
  canAdmin: boolean;
  /** view masked salary numbers? viewer sees masked */
  canViewSalary: boolean;
  has: (min: AppRole) => boolean;
}

export function usePermissions(): Permissions {
  const { user, organizationId } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!user || !organizationId) {
      setRole(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .then(({ data }) => {
        if (!alive) return;
        const roles = (data ?? []).map((r) => r.role as AppRole);
        // pick highest-ranked role
        const top = roles.sort((a, b) => RANK[b] - RANK[a])[0] ?? null;
        setRole(top);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user, organizationId]);

  const has = (min: AppRole) => !!role && RANK[role] >= RANK[min];

  return {
    role,
    loading,
    canEdit: has("analyst"),
    canDelete: has("admin"),
    canAdmin: has("admin"),
    canViewSalary: has("manager"),
    has,
  };
}

export function maskSalary(value: number, allowed: boolean): string | number {
  return allowed ? value : "•••••";
}
