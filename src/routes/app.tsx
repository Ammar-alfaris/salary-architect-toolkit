import { Outlet, redirect, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { OnboardingProvider, useOnboarding } from "@/lib/onboarding";
import { GuidedTour } from "@/components/guided-tour";
import { useTrialStatus } from "@/lib/use-trial-status";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        window.location.href = "/auth";
      } else {
        setAuthed(true);
      }
      setChecking(false);
    });
  }, []);

  if (checking) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  if (!authed) return null;

  return (
    <OnboardingProvider>
      <OnboardingGate>
        <SubscriptionGate>
          <AppShell>
            <Outlet />
          </AppShell>
        </SubscriptionGate>
        <GuidedTour />
      </OnboardingGate>
    </OnboardingProvider>
  );
}

// Force users with a fully-blocked subscription state to the billing page.
function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { status, loading } = useTrialStatus();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    const blocked = status === "restricted" || status === "dormant";
    if (!blocked) return;
    const allowed = ["/app/billing", "/app/help", "/app/support"];
    const onAllowed = allowed.some((p) => location.pathname === p || location.pathname.startsWith(p + "/"));
    if (!onAllowed) navigate({ to: "/app/billing" });
  }, [status, loading, location.pathname]);

  return <>{children}</>;
}

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { loaded, state } = useOnboarding();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loaded) return;
    const onOnboarding = location.pathname === "/app/onboarding";
    const needsGoal = !state.goal && !state.dismissed_at;
    if (needsGoal && !onOnboarding) navigate({ to: "/app/onboarding" });
  }, [loaded, state.goal, state.dismissed_at, location.pathname]);

  return <>{children}</>;
}
