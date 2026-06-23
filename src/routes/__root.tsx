import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import "../styles.css";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { QueryProvider } from "@/lib/query";
import { Toaster } from "@/components/ui/sonner";
import { ScrollToTop } from "@/components/scroll-to-top";

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
      { title: "Total Reward — Compensation Platform" },
      { name: "description", content: "Design salary structures, plan bonuses, run merit cycles, and manage allowances — built for Total Rewards teams." },
      { property: "og:site_name", content: "Total Reward" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Total Reward — Compensation Platform" },
      { name: "twitter:title", content: "Total Reward — Compensation Platform" },
      { property: "og:description", content: "Design salary structures, plan bonuses, run merit cycles, and manage allowances — built for Total Rewards teams." },
      { name: "twitter:description", content: "Design salary structures, plan bonuses, run merit cycles, and manage allowances — built for Total Rewards teams." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b0ab2409-6b57-439e-8616-2a3d25e196ff/id-preview-bed418b3--2acbe2f2-b7be-4735-8fa4-d80fac74d23c.lovable.app-1782236165254.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b0ab2409-6b57-439e-8616-2a3d25e196ff/id-preview-bed418b3--2acbe2f2-b7be-4735-8fa4-d80fac74d23c.lovable.app-1782236165254.png" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800;900&family=Tajawal:wght@300;400;500;700;800;900&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "Total Reward",
              url: "https://totalreward.app",
            },
            {
              "@type": "WebSite",
              name: "Total Reward",
              url: "https://totalreward.app",
            },
          ],
        }),
      },
    ],
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
            <ScrollToTop />
            <Outlet />
            <Toaster />
          </AuthProvider>
        </QueryProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
