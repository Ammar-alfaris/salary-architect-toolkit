import { Link } from "@tanstack/react-router";
import { Linkedin, Mail, MapPin } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Logo } from "@/components/logo";

// X (Twitter) icon — Lucide doesn't ship an updated X mark
function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

export function SiteFooter() {
  const { t, locale } = useI18n();
  const ar = locale === "ar";
  const year = new Date().getFullYear();

  const product = [
    { to: "/", label: ar ? "الرئيسية" : "Home" },
    { to: "/pricing", label: ar ? "الأسعار" : "Pricing" },
    { to: "/blog", label: ar ? "المدونة" : "Blog" },
    { to: "/contact", label: ar ? "تواصل معنا" : "Contact" },
  ] as const;

  const legal = [
    { to: "/privacy", label: t("privacy") },
    { to: "/terms", label: t("terms") },
    { to: "/refund", label: ar ? "سياسة الاسترداد" : "Refund Policy" },
    { to: "/dpa", label: ar ? "اتفاقية معالجة البيانات" : "DPA" },
    { to: "/trust", label: ar ? "مركز الثقة" : "Trust Center" },
  ] as const;

  const socials = (
    <div className="flex items-center gap-2">
      <a
        href="https://www.linkedin.com/company/total-reward-app/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="LinkedIn"
        className="h-9 w-9 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
      >
        <Linkedin className="w-4 h-4" />
      </a>
      <a
        href="https://x.com/totalrewardapp"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="X (Twitter)"
        className="h-9 w-9 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
      >
        <XIcon className="w-3.5 h-3.5" />
      </a>
    </div>
  );

  return (
    <footer className="border-t bg-card/40 mt-12">
      {/* Desktop / tablet */}
      <div className="hidden md:block container mx-auto px-6 py-12">
        <div className="grid grid-cols-12 gap-8">
          {/* Brand */}
          <div className="col-span-4">
            <Logo size={32} textClassName="text-base" />
            <p className="mt-3 text-sm text-muted-foreground max-w-xs leading-relaxed">
              {t("tagline")}
            </p>
            <div className="mt-5">{socials}</div>
          </div>

          {/* Quick Links */}
          <div className="col-span-2">
            <h3 className="text-xs font-semibold tracking-wider text-foreground uppercase mb-4">
              {ar ? "روابط سريعة" : "Quick Links"}
            </h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {product.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="hover:text-foreground transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="col-span-3">
            <h3 className="text-xs font-semibold tracking-wider text-foreground uppercase mb-4">
              {ar ? "القانوني" : "Legal"}
            </h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {legal.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="hover:text-foreground transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company / contact */}
          <div className="col-span-3">
            <h3 className="text-xs font-semibold tracking-wider text-foreground uppercase mb-4">
              {ar ? "الشركة" : "Company"}
            </h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                <span>{ar ? "الرياض، المملكة العربية السعودية" : "Riyadh, Saudi Arabia"}</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                <a href="mailto:support@totalreward.app" className="hover:text-foreground transition-colors break-all">
                  support@totalreward.app
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t flex items-center justify-between gap-4 text-xs text-muted-foreground">
          <div>© {year} {t("app_name")}. {ar ? "جميع الحقوق محفوظة." : "All rights reserved."}</div>
          <div>{ar ? "صنع في المملكة العربية السعودية" : "Made in Saudi Arabia"}</div>
        </div>
      </div>

      {/* Mobile — compact */}
      <div className="md:hidden px-5 py-8">
        <div className="flex items-center justify-between">
          <Logo size={28} textClassName="text-sm" />
          {socials}
        </div>

        <nav className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 text-sm text-muted-foreground">
          {product.map((l) => (
            <Link key={l.to} to={l.to} className="hover:text-foreground transition-colors">{l.label}</Link>
          ))}
          <Link to="/privacy" className="hover:text-foreground transition-colors">{t("privacy")}</Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">{t("terms")}</Link>
        </nav>

        <div className="mt-6 pt-4 border-t text-[11px] text-muted-foreground text-center">
          © {year} {t("app_name")} · {ar ? "جميع الحقوق محفوظة" : "All rights reserved"}
        </div>
      </div>
    </footer>
  );
}
