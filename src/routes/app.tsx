import { Outlet, redirect, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { OnboardingProvider, useOnboarding } from "@/lib/onboarding";
import { GuidedTour } from "@/components/guided-tour";

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
        <AppShell>
          <Outlet />
        </AppShell>
        <GuidedTour />
      </OnboardingGate>
    </OnboardingProvider>
  );
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
