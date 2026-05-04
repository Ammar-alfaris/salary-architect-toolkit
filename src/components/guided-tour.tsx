import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useOnboarding } from "@/lib/onboarding";
import { useI18n } from "@/lib/i18n";
import { TOURS } from "@/lib/tours";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";

interface Rect { top: number; left: number; width: number; height: number; }

function rectsEqual(a: Rect | null, b: Rect | null) {
  if (!a || !b) return a === b;
  return Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5
    && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;
}

export function GuidedTour() {
  const { state, stopTour, setStepIndex, completeStep, dismiss } = useOnboarding();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [rect, setRect] = useState<Rect | null>(null);
  const lastRectRef = useRef<Rect | null>(null);
  const scrolledForStepRef = useRef<string | null>(null);

  const goal = state.goal;
  const active = !!state.tour_active && !!goal;
  const steps = goal ? TOURS[goal] : [];
  const idx = state.current_step_index ?? 0;
  const step = steps[idx];

  // Navigate to the step's route if needed
  useEffect(() => {
    if (!active || !step) return;
    if (location.pathname !== step.route) {
      navigate({ to: step.route as any });
    }
  }, [active, step?.route, location.pathname]);

  // Track target element position — stable, no flicker.
  useEffect(() => {
    if (!active || !step) { setRect(null); lastRectRef.current = null; return; }

    let targetEl: HTMLElement | null = null;
    let ro: ResizeObserver | null = null;
    let mo: MutationObserver | null = null;
    let rafId = 0;

    const measure = () => {
      if (!targetEl || !targetEl.isConnected) return;
      const r = targetEl.getBoundingClientRect();
      const next: Rect = { top: r.top, left: r.left, width: r.width, height: r.height };
      if (!rectsEqual(lastRectRef.current, next)) {
        lastRectRef.current = next;
        setRect(next);
      }
    };

    const scheduleMeasure = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => { rafId = 0; measure(); });
    };

    const attach = (el: HTMLElement) => {
      targetEl = el;
      // Scroll into view ONCE per step (key cause of jitter previously).
      if (scrolledForStepRef.current !== step.id) {
        scrolledForStepRef.current = step.id;
        try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch {}
      }
      ro = new ResizeObserver(scheduleMeasure);
      ro.observe(el);
      // Measure once on the next frame (after potential scroll)
      setTimeout(measure, 50);
    };

    const tryFind = () => {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (el) { attach(el); return true; }
      return false;
    };

    if (!tryFind()) {
      // Wait for the element to appear in the DOM, then attach.
      mo = new MutationObserver(() => {
        if (tryFind()) { mo?.disconnect(); mo = null; }
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }

    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("scroll", scheduleMeasure, true);

    return () => {
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("scroll", scheduleMeasure, true);
      if (rafId) cancelAnimationFrame(rafId);
      ro?.disconnect();
      mo?.disconnect();
      targetEl = null;
    };
  }, [active, step?.id, step?.selector]);

  // Action-driven advancement
  const advance = async () => {
    if (!step) return;
    await completeStep(step.id);
    if (idx + 1 >= steps.length) await stopTour();
    else await setStepIndex(idx + 1);
  };

  // Click trigger: listen on the highlighted element.
  useEffect(() => {
    if (!active || !step) return;
    const adv = step.advanceOn;
    if (!adv || adv.type !== "click") return;
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) return;
    const onClick = () => { setTimeout(() => { advance(); }, 150); };
    el.addEventListener("click", onClick, { once: true });
    return () => el.removeEventListener("click", onClick);
  }, [active, step?.id, rect]);

  // Event trigger: listen on window.
  useEffect(() => {
    if (!active || !step) return;
    const adv = step.advanceOn;
    if (!adv || adv.type !== "event") return;
    const handler = () => advance();
    window.addEventListener(adv.name, handler);
    return () => window.removeEventListener(adv.name, handler);
  }, [active, step?.id]);

  // Route trigger
  useEffect(() => {
    if (!active || !step) return;
    const adv = step.advanceOn;
    if (!adv || adv.type !== "route") return;
    if (location.pathname === adv.pathname) advance();
  }, [active, step?.id, location.pathname]);

  if (!active || !step) {
    if (goal && state.dismissed_at == null) return <FloatingHelp />;
    return null;
  }

  const prev = async () => { if (idx > 0) await setStepIndex(idx - 1); };
  const skip = async () => { await stopTour(); };
  const isLast = idx + 1 >= steps.length;

  // Tooltip position — mobile-aware, never overlaps the highlighted target.
  const pad = 12;
  const vw = typeof window !== "undefined" ? window.innerWidth : 800;
  const vh = typeof window !== "undefined" ? window.innerHeight : 600;
  const isMobile = vw < 480;
  const tipW = isMobile ? Math.min(vw - 24, 360) : 320;
  const tipH = 240; // estimate; card is fixed-ish height
  let tipTop = 12, tipLeft = 12;
  if (rect) {
    const spaceBelow = vh - (rect.top + rect.height) - pad;
    const spaceAbove = rect.top - pad;
    if (isMobile) {
      // Pin to whichever edge is farther from the target so we never cover it.
      tipTop = spaceBelow >= spaceAbove ? Math.min(vh - tipH - 12, rect.top + rect.height + pad) : Math.max(12, rect.top - tipH - pad);
      tipLeft = Math.max(12, (vw - tipW) / 2);
    } else {
      if (spaceBelow >= tipH) tipTop = rect.top + rect.height + pad;
      else if (spaceAbove >= tipH) tipTop = rect.top - tipH - pad;
      else tipTop = Math.max(12, vh - tipH - 12);
      tipLeft = Math.max(12, Math.min(vw - tipW - 12, rect.left));
    }
  } else {
    tipLeft = isMobile ? Math.max(12, (vw - tipW) / 2) : 12;
  }

  const hintKey = step.advanceOn?.type === "click" ? "tour_hint_click_target" : step.advanceOn ? "tour_hint_do_action" : "";

  return (
    <>
      {/* Dim overlay with cutout */}
      <div className="fixed inset-0 z-[60] pointer-events-none" aria-hidden>
        <div className="absolute inset-0 bg-black/55 transition-[clip-path] duration-200" style={rect ? {
          clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 ${rect.top - 6}px, ${rect.left - 6}px ${rect.top - 6}px, ${rect.left - 6}px ${rect.top + rect.height + 6}px, ${rect.left + rect.width + 6}px ${rect.top + rect.height + 6}px, ${rect.left + rect.width + 6}px ${rect.top - 6}px, 0 ${rect.top - 6}px)`,
        } : undefined} />
        {rect && (
          <div className="absolute rounded-lg ring-2 ring-primary shadow-[0_0_0_4px_rgba(59,130,246,0.25)] transition-[top,left,width,height] duration-200 pointer-events-none"
               style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8 }} />
        )}
      </div>

      {/* Tooltip card */}
      <div
        className="fixed z-[61] rounded-xl border bg-card shadow-2xl p-4 transition-[top,left] duration-200"
        style={{ top: tipTop, left: tipLeft, width: tipW }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="text-xs text-muted-foreground">{t("step_n_of_m", { n: idx + 1, m: steps.length })}</div>
          <button onClick={skip} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <h4 className="font-semibold text-sm mb-1">{t(step.titleKey)}</h4>
        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{t(step.bodyKey)}</p>

        {hintKey && (
          <div className="text-xs text-primary bg-primary/10 rounded-md px-2 py-1.5 mb-3">
            {t(hintKey)}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <button onClick={skip} className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">{t("tour_skip")}</button>
          <div className="flex gap-1.5">
            <Button size="sm" variant="ghost" onClick={prev} disabled={idx === 0}><ChevronLeft className="w-4 h-4 rtl:rotate-180" /></Button>
            <Button size="sm" onClick={advance}>
              {isLast ? t("tour_finish") : t("tour_next")}
              {!isLast && <ChevronRight className="w-4 h-4 ms-1 rtl:rotate-180" />}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function FloatingHelp() {
  const { startTour } = useOnboarding();
  const { t } = useI18n();
  return (
    <button
      onClick={startTour}
      className="fixed bottom-4 end-4 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition flex items-center justify-center"
      title={t("resume_tour")}
      aria-label={t("resume_tour")}
    >
      <HelpCircle className="w-6 h-6" />
    </button>
  );
}
