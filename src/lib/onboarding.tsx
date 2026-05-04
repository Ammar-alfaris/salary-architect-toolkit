// Onboarding state: goal + tour progress, persisted in organizations.onboarding (jsonb).
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { TourGoal } from "@/lib/tours";

export interface OnboardingState {
  goal?: TourGoal;
  completed_steps?: string[];
  dismissed_at?: string | null;
  current_step_index?: number;
  tour_active?: boolean;
}

interface Ctx {
  loaded: boolean;
  state: OnboardingState;
  setGoal: (g: TourGoal) => Promise<void>;
  startTour: () => Promise<void>;
  stopTour: () => Promise<void>;
  setStepIndex: (i: number) => Promise<void>;
  completeStep: (id: string) => Promise<void>;
  dismiss: () => Promise<void>;
  reset: () => Promise<void>;
}

const OnboardingContext = createContext<Ctx | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { organizationId } = useAuth();
  const [state, setState] = useState<OnboardingState>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!organizationId) { setLoaded(false); return; }
    (async () => {
      const { data } = await supabase.from("organizations").select("onboarding").eq("id", organizationId).maybeSingle();
      setState((data?.onboarding as OnboardingState) ?? {});
      setLoaded(true);
    })();
  }, [organizationId]);

  const persist = useCallback(async (patch: Partial<OnboardingState>) => {
    if (!organizationId) return;
    const next = { ...state, ...patch };
    setState(next);
    await supabase.from("organizations").update({ onboarding: next as any }).eq("id", organizationId);
  }, [organizationId, state]);

  const value: Ctx = {
    loaded,
    state,
    setGoal: (g) => persist({ goal: g, current_step_index: 0, tour_active: true, dismissed_at: null }),
    startTour: () => persist({ tour_active: true, current_step_index: state.current_step_index ?? 0 }),
    stopTour: () => persist({ tour_active: false }),
    setStepIndex: (i) => persist({ current_step_index: i }),
    completeStep: (id) => persist({ completed_steps: Array.from(new Set([...(state.completed_steps ?? []), id])) }),
    dismiss: () => persist({ dismissed_at: new Date().toISOString(), tour_active: false }),
    reset: () => persist({ goal: undefined, completed_steps: [], current_step_index: 0, tour_active: false, dismissed_at: null }),
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used inside OnboardingProvider");
  return ctx;
}
