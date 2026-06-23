اضافةً على التعديلات هذه اريد الحرض على تكامل نظام الاشعار بالايميل للمستخدم بحيث يغطي جميع الامور المتعارف عليها والتي يجب فيها اشعار العميل بالايميل وليس فقط التجديد والالغاء ، لذا قم باضافة ذلك الى الخطة مثلاً خيار اعادةتعيين كلمة المرور او غيرها من الاشعارات الضرورية

&nbsp;

## Problem confirmed

I checked your account `mikov87496@zemyai.com`:

- Subscription is **active** (Starter, renews 2026-07-23, auto-renew ON).
- Invoice `INV-2026-00002` was generated successfully.
- **But `customer_email` on the order row is empty**, so the receipt email code returned early without sending. Nothing was queued, nothing in `email_send_log`.

There are also two governance gaps you asked about:

1. No email is sent when a user cancels the subscription.
2. No email is sent before auto-renewal charges the card next month.

## Plan

### 1. Receipt email always reaches the customer

- In `createPaylinkInvoice` (`src/lib/paylink.functions.ts`): if `customerEmail` is not provided by the form, fall back to the authenticated user's email (from `auth.users` via admin client). This guarantees every order has a recipient.
- In `paylink-process.server.ts`: if `customerEmail` is still null at activation time, look up the org's primary admin email as a second fallback before giving up. Log a clear warning when both fail.
- Backfill: send the missed receipt for order `INV-2026-00002` to `mikov87496@zemyai.com` once the fix is live (one-off enqueue).

### 2. Cancellation email

- Extend `cancelSubscriptionAtPeriodEnd` in `src/lib/billing.functions.ts`:
  - After flipping `cancel_at_period_end=true` / `auto_renew=false`, enqueue a branded email (AR + EN) to the org admin: "Your subscription is canceled — access continues until `renewal_at`, no further charges will be made."
  - Log to `email_send_log` like the receipt does.

### 3. Auto-renewal notice + reminder

- Add a small SQL cron job (pg_cron, pure SQL via `pg_net`) that runs daily and calls a new public route `/api/public/cron/renewal-notices` (authenticated via `apikey` anon header).
- Route enqueues two emails per active subscription:
  - **T-7 days** before `renewal_at`: "Your subscription renews on {date}. Card on file ending {last4} will be charged {amount} {currency}. Cancel anytime before then to avoid the charge."
  - **T-0 (day of renewal succeeded)**: handled by the existing receipt flow once Paylink charges — no new template needed, just ensure renewal charge uses the same `processPaylinkTransaction` path.
- Idempotency: store a `last_renewal_notice_at` column on `subscriptions` (migration) so the same notice isn't sent twice.

### 4. Make the renewal behavior visible in the UI

- On `/app/billing`: show a clear governance block in both languages:
  - "Auto-renewal: ON/OFF, next charge on {date} for {amount}."
  - "Cancel subscription" button with a confirm dialog explaining: access stays until `renewal_at`, no further charges, confirmation email sent.

### 5. Verification after build

- Trigger the cancel path for a test sub → confirm row in `email_send_log` and inbox delivery.
- Manually invoke the renewal-notices route → confirm correct T-7 selection and idempotency.
- Re-send the missed receipt for the existing user and confirm delivery.

## Technical details

- Migration adds `subscriptions.last_renewal_notice_at timestamptz` + index on `(auto_renew, renewal_at)` for the cron scan.
- New file `src/routes/api/public/cron/renewal-notices.ts` (auth via `apikey` header per scheduled-jobs guide), loads `@/integrations/supabase/client.server` inside the handler, uses `brandedWrap` and `enqueue_email` exactly like the receipt path.
- New helper `sendCancellationEmail(...)` lives next to `sendPaymentReceiptEmail` in `paylink-process.server.ts` (renamed file is fine to keep as-is — it's already the email helper module).
- AR + EN copy uses the same brand wrapper already in `src/lib/email-templates.ts`.
- No new secrets needed; uses existing `SUPABASE_PUBLISHABLE_KEY` for cron auth.

Approve to switch to build mode and I'll implement all four changes plus backfill the missing receipt.