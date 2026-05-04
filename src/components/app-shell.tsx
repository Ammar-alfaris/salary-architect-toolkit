import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Layers, Grid3x3, Gift, TrendingUp, Wallet, Users, FileBarChart, Settings as SettingsIcon, ShieldCheck, LogOut, Moon, Sun, Languages, Search, Bell, Menu, BarChart3, Activity, Scale, CheckSquare, UsersRound, LifeBuoy,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { Logo } from "@/components/logo";

const nav = [
  { to: "/app", icon: LayoutDashboard, key: "dashboard" },
  { to: "/app/structures", icon: Layers, key: "salary_structures" },
  { to: "/app/matrix", icon: Grid3x3, key: "salary_matrix" },
  { to: "/app/bonus", icon: Gift, key: "bonus" },
  { to: "/app/merit", icon: TrendingUp, key: "merit_increase" },
  { to: "/app/allowances", icon: Wallet, key: "allowances" },
  { to: "/app/employees", icon: Users, key: "employees" },
  { to: "/app/analytics/compa", icon: BarChart3, key: "compa_analytics" },
  { to: "/app/analytics/penetration", icon: Activity, key: "penetration_analytics" },
  { to: "/app/analytics/equity", icon: Scale, key: "pay_equity" },
  { to: "/app/approvals", icon: CheckSquare, key: "approvals" },
  { to: "/app/reports", icon: FileBarChart, key: "reports" },
  { to: "/app/audit", icon: ShieldCheck, key: "audit_log" },
  { to: "/app/team", icon: UsersRound, key: "team" },
  { to: "/app/help", icon: LifeBuoy, key: "help_support" },
  { to: "/app/settings", icon: SettingsIcon, key: "settings" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = (user?.email ?? "U").slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-e border-sidebar-border">
        <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
          <Logo size={28} textClassName="text-sm" />
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = path === item.to || (item.to !== "/app" && path.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{t(item.key)}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-60 bg-sidebar text-sidebar-foreground border-e border-sidebar-border">
            <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
              <Logo size={28} textClassName="text-sm" />
            </div>
            <nav className="px-2 py-3 space-y-0.5">
              {nav.map((item) => {
                const Icon = item.icon;
                const active = path === item.to || (item.to !== "/app" && path.startsWith(item.to));
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm ${
                      active ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{t(item.key)}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-card flex items-center gap-1 px-2 md:px-5">
          <button
            className="md:hidden p-2 -ms-1"
            onClick={() => setMobileOpen(true)}
            aria-label={t("open_menu")}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="md:hidden flex items-center">
            <Logo size={24} textClassName="text-sm truncate" />
          </div>
          <div className="hidden sm:flex items-center gap-2 flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input placeholder={t("search_placeholder")} className="h-9 border-0 bg-muted/50 focus-visible:ring-1" />
          </div>
          <div className="flex-1 sm:hidden" />
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setLocale(locale === "en" ? "ar" : "en")} aria-label={t("language")}>
            <Languages className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="shrink-0" onClick={toggle} aria-label={t("theme")}>
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex shrink-0" aria-label={t("notifications")}>
            <Bell className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ms-1">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleSignOut}>
                <LogOut className="w-4 h-4 me-2" /> {t("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:flex-wrap md:items-end md:justify-between gap-3 px-4 md:px-6 py-4 border-b bg-card/40">
      <div className="min-w-0">
        <h1 className="text-lg md:text-xl font-semibold tracking-tight truncate">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 [&>*]:flex-shrink-0">{actions}</div>}
    </div>
  );
}
