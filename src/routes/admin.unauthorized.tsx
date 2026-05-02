import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/unauthorized")({ component: Unauthorized });

function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="max-w-md text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="w-7 h-7 text-destructive" />
        </div>
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-sm text-muted-foreground">You don't have permission to view this admin area.</p>
        <div className="flex justify-center gap-2">
          <Button asChild variant="outline"><Link to="/admin">Admin home</Link></Button>
          <Button asChild><Link to="/auth">Sign in</Link></Button>
        </div>
      </div>
    </div>
  );
}
