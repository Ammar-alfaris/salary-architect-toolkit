import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { QueryProvider } from "@/lib/query";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
        <div className="mt-6 flex gap-2 justify-center">
          <Link to="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-accent">Home</Link>
          <Link to="/app" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">Dashboard</Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "RewardArchitect — Compensation, structured." },
      { name: "description", content: "Design salary structures, plan bonuses, run merit cycles, and manage allowances — built for Total Rewards teams." },
      { property: "og:title", content: "RewardArchitect — Compensation, structured." },
      { property: "og:description", content: "Design salary structures, plan bonuses, run merit cycles, and manage allowances — built for Total Rewards teams." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "RewardArchitect — Compensation, structured." },
      { name: "twitter:description", content: "Design salary structures, plan bonuses, run merit cycles, and manage allowances — built for Total Rewards teams." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/32426e65-0f5a-4aaa-ae2c-aeb3c29aa583/id-preview-9ff3d0b2--2acbe2f2-b7be-4735-8fa4-d80fac74d23c.lovable.app-1777532312790.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/32426e65-0f5a-4aaa-ae2c-aeb3c29aa583/id-preview-9ff3d0b2--2acbe2f2-b7be-4735-8fa4-d80fac74d23c.lovable.app-1777532312790.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <QueryProvider>
          <AuthProvider>
            <Outlet />
            <Toaster />
          </AuthProvider>
        </QueryProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
