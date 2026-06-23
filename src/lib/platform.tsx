import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type PlatformRole =
  | "super_admin"
  | "platform_admin"
  | "content_manager"
  | "support_manager"
  | "billing_manager"
  | "viewer";

export type AdminModule =
  | "dashboard" | "users" | "organizations" | "plans" | "subscriptions"
  | "blog" | "messages" | "tickets" | "announcements" | "audit" | "monitoring" | "settings";

const ACCESS: Record<PlatformRole, AdminModule[] | "all"> = {
  super_admin: "all",
  platform_admin: ["dashboard", "users", "organizations", "announcements", "audit", "monitoring", "settings"],
  content_manager: ["dashboard", "blog"],
  support_manager: ["dashboard", "messages", "tickets", "monitoring"],
  billing_manager: ["dashboard", "organizations", "plans", "subscriptions", "monitoring"],
  viewer: ["dashboard", "audit", "monitoring"],
};

export interface PlatformPermissions {
  role: PlatformRole | null;
  loading: boolean;
  isAdmin: boolean;
  canSee: (m: AdminModule) => boolean;
  canWrite: (m: AdminModule) => boolean;
}

export function usePlatformRole(): PlatformPermissions {
  const { user } = useAuth();
  const [role, setRole] = useState<PlatformRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("platform_admins")
      .select("role,status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        setRole((data?.role as PlatformRole) ?? null);
        setLoading(false);
      });
    return () => { alive = false; };
  }, [user]);

  const canSee = (m: AdminModule) => {
    if (!role) return false;
    const a = ACCESS[role];
    return a === "all" || a.includes(m);
  };
  const canWrite = (m: AdminModule) => {
    if (!role) return false;
    if (role === "super_admin") return true;
    if (m === "blog") return role === "content_manager";
    if (m === "messages" || m === "tickets") return role === "support_manager";
    if (m === "plans" || m === "subscriptions") return role === "billing_manager";
    if (m === "users" || m === "organizations" || m === "announcements" || m === "settings")
      return role === "platform_admin";
    return false;
  };

  return { role, loading, isAdmin: !!role, canSee, canWrite };
}
