import { Link } from "@tanstack/react-router";
import { Languages, Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";

interface LegalLayoutProps {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalLayout({ eyebrow, title, lastUpdated, children }: LegalLayoutProps) {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link to="/">
            <Logo size={28} textClassName="text-sm" />
          </Link>
          <nav className="hidden md:flex items-center gap-5 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">{t("back_home")}</Link>
            <Link to="/pricing" className="hover:text-foreground">{t("pricing") || "Pricing"}</Link>
            <Link to="/blog" className="hover:text-foreground">{t("blog")}</Link>
            <Link to="/contact" className="hover:text-foreground">{t("contact")}</Link>
          </nav>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setLocale(locale === "en" ? "ar" : "en")} aria-label={t("language")}>
              <Languages className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggle} aria-label={t("theme")}>
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">{t("sign_in")}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-4 py-12 md:py-20 prose prose-slate dark:prose-invert">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{eyebrow}</p>
          <h1 className="text-4xl font-bold tracking-tight mb-2">{title}</h1>
          <p className="text-sm text-muted-foreground mb-8">{t("last_updated")}: {lastUpdated}</p>
          {children}
        </article>
      </main>

      <footer className="border-t">
        <div className="container mx-auto px-4 py-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} {t("app_name")}</div>
          <div className="flex gap-4">
            <Link to="/" className="hover:text-foreground">{t("back_home")}</Link>
            <Link to="/privacy" className="hover:text-foreground">{t("privacy")}</Link>
            <Link to="/terms" className="hover:text-foreground">{t("terms")}</Link>
            <Link to="/dpa" className="hover:text-foreground">DPA</Link>
            <Link to="/refund" className="hover:text-foreground">{t("refund")}</Link>
            <Link to="/contact" className="hover:text-foreground">{t("contact")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
