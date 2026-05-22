import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { en } from "./i18n/en";
import { ar } from "./i18n/ar";
import type { Dict, Locale } from "./i18n/types";

export type { Locale } from "./i18n/types";

const dictionaries: Record<Locale, Dict> = { en, ar };

interface I18nCtx {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18nCtx | null>(null);

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && (localStorage.getItem("locale") as Locale)) || "en";
    setLocaleState(stored);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") localStorage.setItem("locale", l);
  };

  const t = (key: string, vars?: Record<string, string | number>) => {
    const tpl = dictionaries[locale][key] ?? dictionaries.en[key];
    if (tpl == null) {
      if (typeof window !== "undefined" && locale === "ar") {
        // eslint-disable-next-line no-console
        console.warn(`[i18n] missing AR key: ${key}`);
      }
      return key;
    }
    return interpolate(tpl, vars);
  };
  const dir = locale === "ar" ? "rtl" : "ltr";

  return <I18nContext.Provider value={{ locale, dir, t, setLocale }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
