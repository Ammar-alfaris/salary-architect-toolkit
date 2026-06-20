import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — Total Reward" },
      {
        name: "description",
        content:
          "How Total Reward collects, uses, stores, and protects your compensation data. Read our privacy commitments and your rights as a data subject.",
      },
      { property: "og:title", content: "Privacy Policy — Total Reward" },
      {
        property: "og:description",
        content: "How Total Reward handles personal and compensation data.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://totalreward.app/privacy" }],
  }),
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <article className="mx-auto max-w-3xl px-4 py-12 md:py-20 prose prose-slate dark:prose-invert">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          Legal
        </p>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: 20 June 2026
        </p>

        <h2>1. Who we are</h2>
        <p>
          Total Reward (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is a compensation
          management platform operated for HR teams in Saudi Arabia, the GCC
          and the wider Arabic-speaking market. This policy explains how we
          collect, use, and protect personal data when you use{" "}
          <Link to="/" className="text-primary hover:underline">
            totalreward.app
          </Link>
          .
        </p>

        <h2>2. Data we collect</h2>
        <ul>
          <li>
            <strong>Account data</strong>: name, work email, organization,
            role, and authentication metadata.
          </li>
          <li>
            <strong>Compensation data</strong> you upload: employee records,
            salaries, allowances, bonus and merit data, salary structures.
          </li>
          <li>
            <strong>Billing data</strong>: customer name, mobile number, email,
            invoice records, and payment status. Card details are processed
            directly by Paylink — we never store full card numbers.
          </li>
          <li>
            <strong>Usage data</strong>: audit logs of actions you perform
            inside the application (who changed what, when).
          </li>
        </ul>

        <h2>3. How we use the data</h2>
        <ul>
          <li>To operate the service and the features you request.</li>
          <li>To protect the security and integrity of your organization&rsquo;s data.</li>
          <li>To bill subscriptions and issue tax-compliant invoices (15% KSA VAT).</li>
          <li>To send transactional emails (auth, receipts, important account events).</li>
          <li>To respond to your support requests.</li>
        </ul>
        <p>
          We do <strong>not</strong> sell personal data. We do not use customer
          compensation data for advertising or to train third-party AI models.
        </p>

        <h2>4. Legal basis</h2>
        <p>
          We process data under the contract you (or your organization) have
          with us, our legitimate interest in operating the service, and our
          legal obligations (tax, accounting). Where required, we rely on your
          consent.
        </p>

        <h2>5. Subprocessors</h2>
        <ul>
          <li>Lovable Cloud — application hosting, database, authentication.</li>
          <li>Paylink — payment processing for subscriptions.</li>
          <li>Transactional email provider — for system emails.</li>
        </ul>
        <p>
          Each subprocessor receives only the data needed to perform its
          function.
        </p>

        <h2>6. Data location &amp; transfers</h2>
        <p>
          Application data is stored with our managed cloud provider. Payment
          data is processed by Paylink within the Kingdom of Saudi Arabia. We
          take reasonable steps to ensure adequate protection when data crosses
          borders.
        </p>

        <h2>7. Retention</h2>
        <p>
          We retain customer data while your organization&rsquo;s account is
          active. After cancellation, customer data is retained for up to 90
          days (to allow account recovery) and then deleted, unless retention
          is required by law (e.g. tax invoices kept for the legally required
          period).
        </p>

        <h2>8. Security</h2>
        <p>
          All connections use HTTPS/TLS. Data is isolated per organization at
          the database level via row-level security. Access to production data
          is limited to authorized personnel and logged.
        </p>

        <h2>9. Your rights</h2>
        <p>
          You may request access, correction, or deletion of your personal
          data, or object to certain processing. For organization-level data,
          please ask your organization administrator first. To contact us,
          email{" "}
          <a href="mailto:privacy@totalreward.app" className="text-primary hover:underline">
            privacy@totalreward.app
          </a>{" "}
          or use the{" "}
          <Link to="/contact" className="text-primary hover:underline">
            contact page
          </Link>
          .
        </p>

        <h2>10. Cookies</h2>
        <p>
          We use only the cookies necessary to keep you signed in and to
          remember your locale and theme preferences. We do not use
          advertising cookies.
        </p>

        <h2>11. Changes</h2>
        <p>
          We may update this policy. Material changes will be communicated by
          email or via a banner in the application.
        </p>

        <h2>12. Contact</h2>
        <p>
          For privacy questions, email{" "}
          <a href="mailto:privacy@totalreward.app" className="text-primary hover:underline">
            privacy@totalreward.app
          </a>
          .
        </p>
      </article>
    </div>
  );
}
