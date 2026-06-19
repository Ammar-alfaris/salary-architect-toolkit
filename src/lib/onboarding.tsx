// Onboarding state: goal + tour progress, persisted in organizations.onboarding (jsonb).
// Uses localStorage as a resilient cache so flaky mobile networks don't trap users
// in the onboarding loop when a PATCH fails ("Load failed" TypeError on iOS Safari).
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

const cacheKey = (orgId: string) => `onboarding:${orgId}`;

function readCache(orgId: string): OnboardingState | null {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(cacheKey(orgId)) : null;
    return raw ? (JSON.parse(raw) as OnboardingState) : null;
  } catch { return null; }
}

function writeCache(orgId: string, s: OnboardingState) {
  try { if (typeof window !== "undefined") localStorage.setItem(cacheKey(orgId), JSON.stringify(s)); } catch {}
}

async function tryPersist(orgId: string, next: OnboardingState, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      const { error } = await supabase.from("organizations").update({ onboarding: next as any }).eq("id", orgId);
      if (!error) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  return false;
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { organizationId } = useAuth();
  const [state, setState] = useState<OnboardingState>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!organizationId) { setLoaded(false); return; }
    // Seed from cache immediately so we don't bounce on network failure.
    const cached = readCache(organizationId);
    if (cached) { setState(cached); setLoaded(true); }
    (async () => {
      try {
        const { data } = await supabase.from("organizations").select("onboarding").eq("id", organizationId).maybeSingle();
        const remote = (data?.onboarding as OnboardingState) ?? {};
        // Prefer remote unless cache has a goal and remote doesn't (failed write recovery).
        const merged: OnboardingState = cached?.goal && !remote.goal ? cached : remote;
        setState(merged);
        writeCache(organizationId, merged);
        // If we recovered from cache, try to re-sync the failed write.
        if (cached?.goal && !remote.goal) { tryPersist(organizationId, merged); }
      } catch {
        if (cached) setState(cached);
      } finally {
        setLoaded(true);
      }
    })();
  }, [organizationId]);

  const persist = useCallback(async (patch: Partial<OnboardingState>) => {
    if (!organizationId) return;
    const next = { ...state, ...patch };
    setState(next);
    writeCache(organizationId, next);
    // Fire-and-forget with retry; never throw to the caller so UI flows continue
    // even on flaky mobile networks.
    tryPersist(organizationId, next);
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
