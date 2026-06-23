import { Outlet, createFileRoute, Link, redirect } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/admin-shell";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { verifyPlatformAdmin } from "@/lib/platform-admin.functions";
import { isRedirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    try {
      await verifyPlatformAdmin();
    } catch (err) {
      if (isRedirect(err)) throw err;
      // 401 = not signed in → /auth, 403 = signed in but not admin → show denial UI
      if (err instanceof Response && err.status === 401) {
        throw redirect({ to: "/auth" });
      }
      return { adminDenied: true as const };
    }
    return { adminDenied: false as const };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { adminDenied } = Route.useRouteContext();

  if (adminDenied) {
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
  }

  return <AdminShell><Outlet /></AdminShell>;
}
