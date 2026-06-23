/**
 * Cookie consent banner — PDPL (Saudi) / GDPR compliant.
 *
 * Categories:
 *   - necessary  (always on — auth, security, language, theme)
 *   - analytics  (anonymous usage analytics)
 *   - marketing  (ads / retargeting; not in use today but exposed for future)
 *
 * The user's choice is stored in localStorage under `tr-cookie-consent-v1`
 * with the shape: { necessary: true, analytics: bool, marketing: bool, ts: ISO }.
 *
 * Other code can read consent via `getCookieConsent()` and gate trackers
 * (Sentry, GA, Hotjar, …) on `consent.analytics === true`, etc.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";

const STORAGE_KEY = "tr-cookie-consent-v1";

export interface CookieConsent {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  ts: string;
}

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsent;
    if (!parsed?.ts) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveConsent(c: Omit<CookieConsent, "necessary" | "ts">) {
  const value: CookieConsent = {
    necessary: true,
    analytics: !!c.analytics,
    marketing: !!c.marketing,
    ts: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("cookie-consent-changed", { detail: value }));
}

export function CookieConsentBanner() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const [open, setOpen] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = getCookieConsent();
    if (!existing) setOpen(true);
  }, []);

  if (!open) return null;

  const t = (en: string, ar: string) => (isAr ? ar : en);

  const acceptAll = () => {
    saveConsent({ analytics: true, marketing: true });
    setOpen(false);
  };
  const rejectAll = () => {
    saveConsent({ analytics: false, marketing: false });
    setOpen(false);
  };
  const savePrefs = () => {
    saveConsent({ analytics, marketing });
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-label={t("Cookie preferences", "تفضيلات ملفات تعريف الارتباط")}
      dir={isAr ? "rtl" : "ltr"}
      className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-3 sm:px-4 sm:pb-4"
    >
      <div className="mx-auto max-w-3xl rounded-xl border bg-card text-card-foreground shadow-lg ring-1 ring-black/5">
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-sm sm:text-base font-semibold">
                {t("We value your privacy", "نحن نحترم خصوصيتك")}
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {t(
                  "We use strictly necessary cookies to run the platform. With your consent, we'd also like to use analytics cookies to improve the product. You can change your choice anytime.",
                  "نستخدم ملفات تعريف ارتباط ضرورية لتشغيل المنصة. وبموافقتك، نودّ أيضاً استخدام ملفات تحليلية لتحسين المنتج. يمكنك تغيير اختيارك في أي وقت.",
                )}{" "}
                <Link to="/privacy" className="underline hover:text-foreground">
                  {t("Privacy", "الخصوصية")}
                </Link>{" "}
                ·{" "}
                <Link to="/dpa" className="underline hover:text-foreground">
                  DPA
                </Link>
              </p>
            </div>
          </div>

          {showCustomize && (
            <div className="mt-4 space-y-3 rounded-lg border bg-muted/30 p-3">
              <Row
                title={t("Strictly necessary", "ضرورية تماماً")}
                desc={t(
                  "Required for sign-in, security, language and theme. Always on.",
                  "مطلوبة لتسجيل الدخول والأمان واللغة والمظهر. مفعّلة دائماً.",
                )}
              >
                <Switch checked disabled aria-label="necessary" />
              </Row>
              <Row
                title={t("Analytics", "تحليلية")}
                desc={t(
                  "Anonymous usage statistics to help us improve the product.",
                  "إحصاءات استخدام مجهولة الهوية لمساعدتنا في تحسين المنتج.",
                )}
              >
                <Switch checked={analytics} onCheckedChange={setAnalytics} aria-label="analytics" />
              </Row>
              <Row
                title={t("Marketing", "تسويقية")}
                desc={t(
                  "Used for advertising and retargeting. Off by default.",
                  "للإعلانات وإعادة الاستهداف. مغلقة افتراضياً.",
                )}
              >
                <Switch checked={marketing} onCheckedChange={setMarketing} aria-label="marketing" />
              </Row>
            </div>
          )}

          <div className="mt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
            {!showCustomize ? (
              <Button variant="ghost" size="sm" onClick={() => setShowCustomize(true)}>
                {t("Customize", "تخصيص")}
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={savePrefs}>
                {t("Save preferences", "حفظ التفضيلات")}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={rejectAll}>
              {t("Reject all", "رفض الكل")}
            </Button>
            <Button size="sm" onClick={acceptAll}>
              {t("Accept all", "قبول الكل")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</div>
      </div>
      <div className="pt-0.5 shrink-0">{children}</div>
    </div>
  );
}
