import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Lock, Database, Mail, UserCheck, FileText } from "lucide-react";

export const Route = createFileRoute("/trust")({
  component: TrustPage,
  head: () => ({
    meta: [
      { title: "Trust & Security — Total Reward" },
      {
        name: "description",
        content:
          "How Total Reward protects your compensation data: access controls, data handling, subprocessors, retention, and how to contact us about security and privacy.",
      },
      { property: "og:title", content: "Trust & Security — Total Reward" },
      {
        property: "og:description",
        content:
          "Security, privacy, and data-handling practices for the Total Reward platform.",
      },
    ],
  }),
});

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
      <div className="flex items-center gap-3 mb-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      <div className="text-sm leading-relaxed text-muted-foreground space-y-3">
        {children}
      </div>
    </section>
  );
}

function TrustPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-12 md:py-20">
        <header className="mb-10">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Trust Center
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Security &amp; privacy at Total Reward
          </h1>
          <p className="mt-4 text-base text-muted-foreground max-w-2xl">
            This page is maintained by the Total Reward team to answer common
            security and privacy questions about our compensation platform. It
            describes practices we have in place today and is intended as
            editable, informational content — not an independent certification
            or audit.
          </p>
        </header>

        <div className="grid gap-5">
          <Section icon={UserCheck} title="Access &amp; authentication">
            <p>
              Accounts use email + password sign-in and Google sign-in. Each
              user belongs to one or more organizations, and role-based access
              (admin, manager, analyst, viewer) controls what they can see and
              do inside their organization.
            </p>
            <p>
              Data is isolated per organization at the database level using
              row-level security policies, so members of one organization cannot
              read or modify another organization&rsquo;s records.
            </p>
          </Section>

          <Section icon={Shield} title="Platform &amp; hosting">
            <p>
              Total Reward is built on Lovable Cloud and runs on managed,
              reputable cloud infrastructure. Connections to the application are
              served over HTTPS, and data in transit is encrypted using
              standard TLS.
            </p>
            <p>
              Application servers run as stateless workers — sensitive state
              lives in the managed database and storage layer, not on
              individual server instances.
            </p>
          </Section>

          <Section icon={Database} title="Data we collect &amp; how it&rsquo;s used">
            <p>
              We process the information your organization uploads or enters —
              employees, salaries, allowances, structures, bonus and merit
              cycles, and similar compensation data — strictly to provide the
              service to your organization. We do not sell personal data.
            </p>
            <p>
              Account-level data (name, email, organization, role, audit logs
              of actions you take) is collected to operate and secure the
              service.
            </p>
          </Section>

          <Section icon={Lock} title="Subprocessors &amp; integrations">
            <p>
              We rely on a small set of providers to operate the service:
            </p>
            <ul className="list-disc ms-5 space-y-1">
              <li>Lovable Cloud — application hosting, database, authentication, storage.</li>
              <li>Paylink / Paddle — payment processing for subscriptions (only when you subscribe).</li>
              <li>Transactional email provider — for system emails (auth, invitations, notifications).</li>
            </ul>
            <p>
              Each provider only receives the data it needs to perform its
              specific function.
            </p>
          </Section>

          <Section icon={FileText} title="Retention &amp; deletion">
            <p>
              Customer data is retained while your organization&rsquo;s account
              is active. Admins can delete records they own from inside the
              application. To request deletion of an entire organization or
              account, contact us using the address below.
            </p>
          </Section>

          <Section icon={Mail} title="Contact &amp; reporting a security issue">
            <p>
              If you believe you have found a security vulnerability, or have a
              privacy question, please reach out through our{" "}
              <Link to="/contact" className="text-primary hover:underline">
                contact page
              </Link>
              . We appreciate responsible disclosure and will respond as
              quickly as we can.
            </p>
          </Section>
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          This page describes practices currently in place and may be updated
          as the product evolves. It does not constitute a legal agreement or
          a guarantee of any specific certification or compliance outcome.
        </p>
      </div>
    </div>
  );
}
