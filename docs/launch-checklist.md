# Launch Readiness Checklist — قائمة جاهزية الإطلاق

> Bilingual end-to-end QA checklist. Run this list in **test mode** first, then
> repeat the **payment-only** section once in **live mode** using a real card
> before announcing.
>
> قائمة فحص شاملة ثنائية اللغة. شغّلها كاملةً في **الوضع التجريبي** أولاً، ثم
> أعِد قسم **الدفع فقط** في **الوضع المباشر** ببطاقة حقيقية قبل الإعلان.

---

## 0 — Pre-flight / ما قبل الإقلاع

- [ ] DNS / Custom domain resolves on HTTPS — `totalreward.app`, `www.totalreward.app`
- [ ] `APP_BASE_URL` secret matches the production domain
- [ ] All Paylink secrets present (LIVE + TEST): `PAYLINK_LIVE_API_ID`, `PAYLINK_LIVE_SECRET_KEY`, `PAYLINK_LIVE_BASE_URL` + TEST equivalents
- [ ] `admin_settings.payment_mode` = `live` (or `test` if soft-launch)
- [ ] Email sender domain verified (DKIM/SPF/DMARC green)
- [ ] `pg_cron` jobs visible in `/admin/monitoring` and last run = success:
  - `billing-engine-daily`
  - `lifecycle-notices`
  - email queue worker
- [ ] Sentry-equivalent: `/admin/errors` reachable, anonymous report endpoint responds 204
- [ ] `robots.txt`, `sitemap.xml`, favicon, OG image all serve 200

## 1 — Critical user path / المسار الحرج للمستخدم

> Use a fresh email on each pass. Time-box: ~15 minutes per pass.

### A. Sign-up → Onboarding / التسجيل والإعداد

- [ ] `/auth` → sign up with email + password → confirmation email arrives
- [ ] First login auto-creates an organization (check `organizations`, `user_roles`)
- [ ] Onboarding wizard completes without console errors
- [ ] Language toggle EN ↔ AR persists across reloads, RTL layout flips correctly

### B. Trial → Subscription / التجربة والاشتراك

- [ ] `/app/billing` shows trial countdown
- [ ] Pick a plan → Paylink hosted checkout opens
- [ ] **Test card** `5123450000000008` exp `05/26` cvv `100` succeeds
- [ ] Webhook fires within 30s — `subscriptions.status` = `active`, `dunning_status` = `none`
- [ ] Invoice row created in `orders` with monotonic `INV-YYYY-NNNNN`
- [ ] Invoice PDF downloads and renders bilingual VAT line correctly
- [ ] Receipt email arrives with PDF attached

### C. Renewal / التجديد التلقائي

- [ ] Manually advance `renewal_at` to `now() - 1m` in DB → run cron once
- [ ] Successful renewal: new order row + `subscription.renewed` audit event
- [ ] Force a failure (invalidate `card_token`) → `dunning_status` = `past_due`, first dunning email sent
- [ ] Banner appears on `/app/billing` with "Retry now" / "Update card" buttons
- [ ] "Retry now" succeeds → `dunning_status` = `none`, recovery email sent

### D. Cancellation / الإلغاء

- [ ] User clicks Cancel → confirmation modal in current language
- [ ] `cancel_at_period_end = true`, access retained until `current_period_end`
- [ ] Audit log records `subscription.cancelled` with actor + IP
- [ ] Cancellation email arrives

## 2 — Notifications / الإشعارات

- [ ] `/admin/monitoring` Email tab: 0 failed in last 24h
- [ ] Unsubscribe link in marketing emails removes recipient from future sends
- [ ] Transactional emails ignore unsubscribe (legal requirement)

## 3 — Security & RLS / الأمان وصلاحيات الصفوف

- [ ] User from Org A cannot read Org B data (try with two browsers)
- [ ] Non-admin user gets 403 on `/admin/*`
- [ ] Service-role-only tables (`error_logs`, `audit_logs`) not reachable from anon key
- [ ] Webhook endpoints reject bad signatures with 401
- [ ] No service-role key, no `console.log` of tokens in browser network tab

## 4 — Legal & Compliance / القانوني والامتثال

- [ ] `/privacy`, `/terms`, `/dpa`, `/refund` all reachable
- [ ] Cookie consent banner appears on first visit, dismissible, choice persists
- [ ] VAT % matches the org's `tax_country` on invoices
- [ ] User data export + delete request flow documented (GDPR / PDPL)

## 5 — Performance & UX / الأداء وتجربة المستخدم

- [ ] Lighthouse mobile ≥ 80 perf / ≥ 90 a11y on landing page
- [ ] No console errors on home, `/app`, `/admin`
- [ ] All forms keyboard-navigable, focus rings visible
- [ ] Empty / loading / error states present in every list view
- [ ] 404 page styled bilingually

## 6 — Operations / التشغيل

- [ ] On-call contact and escalation documented
- [ ] Backups verified (point-in-time recovery enabled)
- [ ] `/admin/monitoring` bookmarked
- [ ] Runbook: how to rotate Paylink secret, how to suspend a tenant

---

## Sign-off / الاعتماد

| Section | Tester | Date | ✓ |
| --- | --- | --- | --- |
| 0 Pre-flight |   |   |   |
| 1 Critical path |   |   |   |
| 2 Notifications |   |   |   |
| 3 Security |   |   |   |
| 4 Legal |   |   |   |
| 5 UX |   |   |   |
| 6 Ops |   |   |   |
