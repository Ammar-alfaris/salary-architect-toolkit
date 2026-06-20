import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/refund")({
  component: RefundPage,
  head: () => ({
    meta: [
      { title: "Refund Policy — Total Reward" },
      {
        name: "description",
        content:
          "Refund and cancellation policy for Total Reward subscriptions. Clear rules on eligibility, time windows, and how to request a refund.",
      },
      { property: "og:title", content: "Refund Policy — Total Reward" },
      {
        property: "og:description",
        content: "Refund and cancellation rules for Total Reward subscriptions.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://totalreward.app/refund" }],
  }),
});

function RefundPage() {
  return (
    <div className="min-h-screen bg-background">
      <article className="mx-auto max-w-3xl px-4 py-12 md:py-20 prose prose-slate dark:prose-invert">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          Legal
        </p>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Refund Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: 20 June 2026
        </p>

        <h2>1. Try before you buy</h2>
        <p>
          Every new organization gets a free trial so you can evaluate Total
          Reward before any payment is taken. We strongly encourage you to
          fully test the Service during the trial.
        </p>

        <h2>2. 14-day refund window for new subscriptions</h2>
        <p>
          If this is your organization&rsquo;s <strong>first paid
          subscription</strong>, you may request a full refund within{" "}
          <strong>14 calendar days</strong> of the initial payment, provided
          the account has not been used to run a bonus cycle, merit cycle, or
          export more than 50 employee records.
        </p>

        <h2>3. Monthly subscriptions</h2>
        <p>
          Monthly subscriptions are billed in advance and are non-refundable
          for the current period after the 14-day window. You may cancel at
          any time from <em>App → Billing</em>; access continues until the end
          of the paid period and you will not be charged again.
        </p>

        <h2>4. Annual subscriptions</h2>
        <p>
          Annual subscriptions are billed in advance. After the 14-day window,
          partial refunds may be granted on a pro-rata basis for unused full
          months, minus any applicable transaction fees, at our discretion.
        </p>

        <h2>5. Renewals</h2>
        <p>
          We send a renewal reminder before each renewal. If you do not wish
          to renew, cancel at least 24 hours before the renewal date. Refunds
          for charges processed after a missed cancellation are reviewed
          case-by-case.
        </p>

        <h2>6. Service failures</h2>
        <p>
          If a billing error, duplicate charge, or sustained service outage
          materially affects you, contact us and we will refund the affected
          period in full.
        </p>

        <h2>7. How to request a refund</h2>
        <p>
          Email{" "}
          <a href="mailto:billing@totalreward.app" className="text-primary hover:underline">
            billing@totalreward.app
          </a>{" "}
          from the email registered on your account with the invoice number
          and a brief reason. We respond within 3 business days. Approved
          refunds are returned to the original payment method via Paylink
          within 7–14 business days.
        </p>

        <h2>8. Non-refundable items</h2>
        <ul>
          <li>Add-on services already consumed (e.g. completed bonus cycles).</li>
          <li>Charges older than 60 days, unless caused by a billing error.</li>
          <li>Accounts terminated for violation of the{" "}
            <Link to="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>.</li>
        </ul>

        <h2>9. Contact</h2>
        <p>
          For any billing or refund question, email{" "}
          <a href="mailto:billing@totalreward.app" className="text-primary hover:underline">
            billing@totalreward.app
          </a>{" "}
          or use the{" "}
          <Link to="/contact" className="text-primary hover:underline">
            contact page
          </Link>
          .
        </p>
      </article>
    </div>
  );
}
