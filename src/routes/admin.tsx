import { Outlet, createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/admin-shell";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

function AdminLayout() {
  const [state, setState] = useState<"checking" | "ok" | "noauth" | "noaccess">("checking");

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) { window.location.href = "/auth"; return; }
      const { data } = await supabase
        .from("platform_admins")
        .select("role")
        .eq("user_id", s.session.user.id)
        .eq("status", "active")
        .maybeSingle();
      setState(data ? "ok" : "noaccess");
    })();
  }, []);

  if (state === "checking")
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading admin console…</div>;

  if (state === "noaccess")
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold">Access denied</h1>
          <p className="text-sm text-muted-foreground">
            Your account does not have permission to access the Super Admin Console.
          </p>
          <div className="flex gap-2 justify-center">
            <Button asChild variant="outline"><Link to="/app">Go to app</Link></Button>
            <Button asChild><Link to="/">Home</Link></Button>
          </div>
        </div>
      </div>
    );

  return <AdminShell><Outlet /></AdminShell>;
}
