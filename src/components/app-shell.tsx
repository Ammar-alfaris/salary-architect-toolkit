import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Layers, Grid3x3, Gift, TrendingUp, Wallet, Users, FileBarChart,
  Settings as SettingsIcon, ShieldCheck, LogOut, Moon, Sun, Languages, Search,
  Menu, BarChart3, Activity, Scale, CheckSquare, UsersRound, LifeBuoy, ChevronDown, Sparkles, CreditCard,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet, SheetContent,
} from "@/components/ui/sheet";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/logo";
import { TrialBanner } from "@/components/trial-banner";
import { NotificationBell } from "@/components/notification-bell";

type NavItem = { to: string; icon: any; key: string };
type NavGroup = { id: string; key: string; icon: any; items: NavItem[] };

const GROUPS: NavGroup[] = [
  { id: "overview", key: "nav_overview", icon: LayoutDashboard, items: [
    { to: "/app", icon: LayoutDashboard, key: "dashboard" },
  ]},
  { id: "compensation", key: "nav_compensation", icon: Layers, items: [
    { to: "/app/structures", icon: Layers, key: "salary_structures" },
    { to: "/app/matrix", icon: Grid3x3, key: "salary_matrix" },
    { to: "/app/allowances", icon: Wallet, key: "allowances" },
  ]},
  { id: "cycles", key: "nav_cycles", icon: TrendingUp, items: [
    { to: "/app/merit", icon: TrendingUp, key: "merit_increase" },
    { to: "/app/bonus", icon: Gift, key: "bonus" },
    { to: "/app/approvals", icon: CheckSquare, key: "approvals" },
  ]},
  { id: "people", key: "nav_people", icon: Users, items: [
    { to: "/app/employees", icon: Users, key: "employees" },
    { to: "/app/team", icon: UsersRound, key: "team" },
  ]},
  { id: "analytics", key: "nav_analytics", icon: BarChart3, items: [
    { to: "/app/analytics/compa", icon: BarChart3, key: "compa_analytics" },
    { to: "/app/analytics/penetration", icon: Activity, key: "penetration_analytics" },
    { to: "/app/analytics/equity", icon: Scale, key: "pay_equity" },
  ]},
  { id: "ops", key: "nav_operations", icon: FileBarChart, items: [
    { to: "/app/reports", icon: FileBarChart, key: "reports" },
    { to: "/app/audit", icon: ShieldCheck, key: "audit_log" },
  ]},
  { id: "help", key: "nav_help", icon: LifeBuoy, items: [
    { to: "/app/help", icon: LifeBuoy, key: "help_support" },
    { to: "/app/support", icon: LifeBuoy, key: "support_tickets" },
  ]},
  { id: "settings", key: "nav_settings", icon: SettingsIcon, items: [
    { to: "/app/settings", icon: SettingsIcon, key: "settings" },
    { to: "/app/billing", icon: CreditCard, key: "billing_title" },
  ]},
];

function useOpenGroups(activePath: string) {
  const initial = useMemo(() => {
    const o: Record<string, boolean> = {};
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem("nav_open_groups") : null;
      if (raw) Object.assign(o, JSON.parse(raw));
    } catch { /* noop */ }
    GROUPS.forEach((g) => {
      if (g.items.some((i) => activePath === i.to || (i.to !== "/app" && activePath.startsWith(i.to)))) {
        o[g.id] = true;
      }
      if (o[g.id] === undefined) o[g.id] = g.id === "overview" || g.id === "compensation";
    });
    return o;
  }, [activePath]);
  const [open, setOpen] = useState<Record<string, boolean>>(initial);
  useEffect(() => { setOpen(initial); }, [initial]);
  const toggle = (id: string) => setOpen((p) => {
    const next = { ...p, [id]: !p[id] };
    try { window.localStorage.setItem("nav_open_groups", JSON.stringify(next)); } catch { /* noop */ }
    return next;
  });
  return { open, toggle };
}

function NavList({ path, onNavigate }: { path: string; onNavigate?: () => void }) {
  const { t } = useI18n();
  const { open, toggle } = useOpenGroups(path);
  return (
    <div className="space-y-1">
      {GROUPS.map((g) => {
        const GIcon = g.icon;
        if (g.items.length === 1) {
          const it = g.items[0];
          const Icon = it.icon;
          const active = path === it.to || (it.to !== "/app" && path.startsWith(it.to));
          return (
            <Link key={it.to} to={it.to} onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50"
              }`}>
              <Icon className="w-4 h-4 shrink-0" /><span className="truncate">{t(it.key)}</span>
            </Link>
          );
        }
        const isOpen = !!open[g.id];
        const groupActive = g.items.some((i) => path === i.to || (i.to !== "/app" && path.startsWith(i.to)));
        return (
          <div key={g.id}>
            <button type="button" onClick={() => toggle(g.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs uppercase tracking-wider transition-colors ${
                groupActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
              }`}>
              <GIcon className="w-3.5 h-3.5 shrink-0 opacity-70" />
              <span className="flex-1 text-start truncate">{t(g.key)}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
            </button>
            {isOpen && (
              <div className="ms-4 mt-0.5 space-y-0.5 border-s border-sidebar-border/40 ps-2">
                {g.items.map((it) => {
                  const Icon = it.icon;
                  const active = path === it.to || (it.to !== "/app" && path.startsWith(it.to));
                  return (
                    <Link key={it.to} to={it.to} onClick={onNavigate}
                      className={`flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors ${
                        active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50"
                      }`}>
                      <Icon className="w-4 h-4 shrink-0" /><span className="truncate">{t(it.key)}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SidebarContent({ path, onNavigate }: { path: string; onNavigate?: () => void }) {
  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border shrink-0">
        <Logo size={28} textClassName="text-sm" />
      </div>
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <NavList path={path} onNavigate={onNavigate} />
      </nav>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = (user?.email ?? "U").slice(0, 2).toUpperCase();
  const handleSignOut = async () => { await signOut(); navigate({ to: "/" }); };

  return (
    <div className="min-h-screen flex w-full bg-background overflow-x-hidden">
      {/* Desktop sidebar — visible on large screens only */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-e border-sidebar-border">
        <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
          <Logo size={28} textClassName="text-sm" />
        </div>
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          <NavList path={path} />
        </nav>
      </aside>

      {/* Mobile / Tablet drawer — shown via hamburger on screens < lg */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="p-0 w-72 max-w-[85vw] bg-sidebar text-sidebar-foreground border-e border-sidebar-border [&>button]:hidden"
        >
          <SidebarContent path={path} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="h-14 border-b bg-card flex items-center gap-1 px-2 lg:px-5 shrink-0">
          {/* Hamburger button — visible on mobile & tablet (< lg) */}
          <button
            className="lg:hidden p-2 -ms-1 rounded-md hover:bg-accent transition-colors"
            onClick={() => setMobileOpen(true)}
            aria-label={t("open_menu")}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="lg:hidden flex items-center min-w-0">
            <Logo size={24} textClassName="text-sm truncate" />
          </div>

          <div className="hidden sm:flex items-center gap-2 flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input placeholder={t("search_placeholder")} className="h-9 border-0 bg-muted/50 focus-visible:ring-1" />
          </div>
          <div className="flex-1 sm:hidden" />

          <Button variant="ghost" size="icon" className="shrink-0 min-h-11 min-w-11" onClick={() => setLocale(locale === "en" ? "ar" : "en")} aria-label={t("language")}>
            <Languages className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="shrink-0 min-h-11 min-w-11" onClick={toggle} aria-label={t("theme")}>
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ms-1 inline-flex items-center justify-center min-h-11 min-w-11 rounded-full" aria-label={t("profile")}>
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground truncate">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate({ to: "/app/settings" })}>
                <SettingsIcon className="w-4 h-4 me-2" /> {t("settings")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate({ to: "/app/billing" })}>
                <CreditCard className="w-4 h-4 me-2" /> {t("billing_title")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate({ to: "/app/help" })}>
                <LifeBuoy className="w-4 h-4 me-2" /> {t("help_support")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleSignOut}>
                <LogOut className="w-4 h-4 me-2" /> {t("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <TrialBanner />
        <main className="app-main flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:flex-wrap md:items-end md:justify-between gap-3 px-4 md:px-6 py-4 border-b bg-card/40">
      <div className="min-w-0">
        <h1 className="text-lg md:text-xl font-semibold tracking-tight truncate">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 [&>*]:flex-shrink-0">{actions}</div>}
    </div>
  );
}
