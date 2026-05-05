import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard, Users, Building2, Package, CreditCard, FileText, Inbox,
  LifeBuoy, Megaphone, ScrollText, Settings as SettingsIcon, LogOut, Moon, Sun,
  Languages, Search, Bell, Menu, ShieldCheck, ArrowLeft, Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { usePlatformRole, type AdminModule } from "@/lib/platform";

const NAV: { to: string; icon: any; label: string; module: AdminModule }[] = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", module: "dashboard" },
  { to: "/admin/users", icon: Users, label: "Users", module: "users" },
  { to: "/admin/organizations", icon: Building2, label: "Organizations", module: "organizations" },
  { to: "/admin/plans", icon: Package, label: "Packages", module: "plans" },
  { to: "/admin/subscriptions", icon: CreditCard, label: "Subscriptions", module: "subscriptions" },
  { to: "/admin/blog", icon: FileText, label: "Blog", module: "blog" },
  { to: "/admin/messages", icon: Inbox, label: "Messages", module: "messages" },
  { to: "/admin/tickets", icon: LifeBuoy, label: "Support Tickets", module: "tickets" },
  { to: "/admin/emails", icon: Mail, label: "Email Templates", module: "settings" },
  { to: "/admin/announcements", icon: Megaphone, label: "Announcements", module: "announcements" },
  { to: "/admin/audit", icon: ScrollText, label: "Audit Logs", module: "audit" },
  { to: "/admin/settings", icon: SettingsIcon, label: "Settings", module: "settings" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { locale, setLocale } = useI18n();
  const { role, canSee } = usePlatformRole();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = NAV.filter((n) => canSee(n.module));
  const initials = (user?.email ?? "A").slice(0, 2).toUpperCase();

  const handleSignOut = async () => { await signOut(); navigate({ to: "/" }); };

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-slate-900 text-slate-100 border-e border-slate-800">
        <div className="h-14 flex items-center gap-2 px-4 border-b border-slate-800">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm tracking-tight text-white">Super Admin</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Console</div>
          </div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {items.map((it) => {
            const Icon = it.icon;
            const active = path === it.to || (it.to !== "/admin" && path.startsWith(it.to));
            return (
              <Link key={it.to} to={it.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active ? "bg-slate-800 text-white font-medium" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}>
                <Icon className="w-4 h-4 shrink-0" />
                <span>{it.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <Link to="/app" className="flex items-center gap-2 text-xs text-slate-400 hover:text-white">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to tenant app
          </Link>
        </div>
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-60 bg-slate-900 text-slate-100 border-e border-slate-800">
            <div className="h-14 flex items-center gap-2 px-4 border-b border-slate-800">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span className="font-semibold text-sm text-white">Super Admin</span>
            </div>
            <nav className="px-2 py-3 space-y-0.5">
              {items.map((it) => {
                const Icon = it.icon;
                return (
                  <Link key={it.to} to={it.to} onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800 hover:text-white">
                    <Icon className="w-4 h-4" /><span>{it.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-card flex items-center gap-2 px-2 md:px-5">
          <button className="md:hidden p-2" onClick={() => setMobileOpen(true)} aria-label="Menu">
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden sm:flex items-center gap-2 flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search across platform…" className="h-9 border-0 bg-muted/50 focus-visible:ring-1" />
          </div>
          <div className="flex-1 sm:hidden" />
          {role && (
            <Badge variant="outline" className="hidden sm:inline-flex font-mono text-[10px]">
              {role.replace("_", " ")}
            </Badge>
          )}
          <Button variant="ghost" size="icon" onClick={() => setLocale(locale === "en" ? "ar" : "en")}>
            <Languages className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggle}>
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex"><Bell className="w-4 h-4" /></Button>
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
                <LogOut className="w-4 h-4 me-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

export function AdminPageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 px-4 md:px-6 py-4 border-b bg-card/40">
      <div className="min-w-0">
        <h1 className="text-lg md:text-xl font-semibold tracking-tight truncate">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
