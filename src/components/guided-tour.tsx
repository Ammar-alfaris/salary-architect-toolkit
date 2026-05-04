import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useOnboarding } from "@/lib/onboarding";
import { useI18n } from "@/lib/i18n";
import { TOURS } from "@/lib/tours";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";

interface Rect { top: number; left: number; width: number; height: number; }

export function GuidedTour() {
  const { state, stopTour, setStepIndex, completeStep, dismiss } = useOnboarding();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [rect, setRect] = useState<Rect | null>(null);

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

  // Track target element position
  useEffect(() => {
    if (!active || !step) { setRect(null); return; }
    let raf = 0;
    const update = () => {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (!el) { setRect(null); raf = requestAnimationFrame(update); return; }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    update();
    const onResize = () => update();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    const interval = setInterval(update, 500);
    return () => { window.removeEventListener("resize", onResize); window.removeEventListener("scroll", onResize, true); clearInterval(interval); cancelAnimationFrame(raf); };
  }, [active, step?.selector, location.pathname]);

  if (!active || !step) {
    // Still show floating help button if a goal exists but tour stopped
    if (goal && state.dismissed_at == null) {
      return <FloatingHelp />;
    }
    return null;
  }

  const next = async () => {
    await completeStep(step.id);
    if (idx + 1 >= steps.length) await stopTour();
    else await setStepIndex(idx + 1);
  };
  const prev = async () => { if (idx > 0) await setStepIndex(idx - 1); };
  const skip = async () => { await stopTour(); };

  // Tooltip position
  const pad = 8;
  const tipTop = rect ? Math.min(window.innerHeight - 220, rect.top + rect.height + pad) : 80;
  const tipLeft = rect ? Math.max(12, Math.min(window.innerWidth - 332, rect.left)) : 12;

  return (
    <>
      {/* Dim overlay with cutout */}
      <div className="fixed inset-0 z-[60] pointer-events-none" aria-hidden>
        <div className="absolute inset-0 bg-black/55" style={rect ? {
          clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 ${rect.top - 6}px, ${rect.left - 6}px ${rect.top - 6}px, ${rect.left - 6}px ${rect.top + rect.height + 6}px, ${rect.left + rect.width + 6}px ${rect.top + rect.height + 6}px, ${rect.left + rect.width + 6}px ${rect.top - 6}px, 0 ${rect.top - 6}px)`,
        } : undefined} />
        {rect && (
          <div className="absolute rounded-lg ring-2 ring-primary shadow-[0_0_0_4px_rgba(59,130,246,0.25)] animate-pulse"
               style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8 }} />
        )}
      </div>

      {/* Tooltip card */}
      <div
        className="fixed z-[61] w-[320px] rounded-xl border bg-card shadow-2xl p-4"
        style={{ top: tipTop, left: tipLeft }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="text-xs text-muted-foreground">{t("step_n_of_m", { n: idx + 1, m: steps.length })}</div>
          <button onClick={skip} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <h4 className="font-semibold text-sm mb-1">{t(step.titleKey)}</h4>
        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{t(step.bodyKey)}</p>
        <div className="flex items-center justify-between gap-2">
          <button onClick={dismiss} className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">{t("tour_skip")}</button>
          <div className="flex gap-1.5">
            {idx > 0 && <Button size="sm" variant="ghost" onClick={prev}><ChevronLeft className="w-4 h-4" /></Button>}
            <Button size="sm" onClick={next}>
              {idx + 1 >= steps.length ? t("tour_finish") : t("tour_next")}
              {idx + 1 < steps.length && <ChevronRight className="w-4 h-4 ms-1" />}
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
