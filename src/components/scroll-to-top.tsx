import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

export function ScrollToTop() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    // Scroll window
    try { window.scrollTo({ top: 0, left: 0 }); } catch { /* noop */ }
    // Scroll any main pane
    document.querySelectorAll<HTMLElement>("main").forEach((m) => { m.scrollTop = 0; });
  }, [pathname]);
  return null;
}
