# Priority #5 — E2E Testing & Launch Readiness

## Delivered

### 1. Launch checklist — `docs/launch-checklist.md`
Bilingual (EN/AR), sign-off table, 7 sections:
- Pre-flight (DNS, secrets, cron, monitoring)
- Critical user path (sign-up → trial → subscription → renewal → cancellation)
- Notifications (deliverability, unsubscribe behavior)
- Security & RLS (cross-tenant, admin gates, webhook signatures)
- Legal & Compliance (privacy/terms/DPA, cookie consent, VAT)
- Performance & UX (Lighthouse, a11y, empty states, 404)
- Operations (backups, runbooks, on-call)

Includes specific Paylink test card and exact DB/cron commands so testers
can reproduce the dunning flow without guesswork.

### 2. Unit tests for format helpers — `src/lib/format.test.ts`
Covers SAR symbol override, percent / number formatting, bidi-isolate
wrapping on dates (regression test for the `232026/7/` RTL bug), and
invalid input fallbacks.

### 3. E2E smoke script — `tests/e2e/critical-path.spec.ts`
Playwright spec that covers the **safe** public path with no billing side
effects (landing, locale toggle, /auth, legal pages, sitemap). Runs against
`E2E_BASE_URL` (defaults to `http://localhost:8080`). Authenticated &
payment flows are intentionally left to the manual checklist because they
mutate real subscription state.

## How to use

| Task | Command |
| --- | --- |
| Unit tests | `bun run test` |
| E2E smoke (local) | `bunx playwright test tests/e2e/critical-path.spec.ts` |
| E2E smoke (prod) | `E2E_BASE_URL=https://totalreward.app bunx playwright test` |
| Manual QA | Follow `docs/launch-checklist.md`, sign the table |

## Pre-launch gate
Do not announce until:
1. All sections of `docs/launch-checklist.md` are signed in **test mode**.
2. Section 1B (subscription) is signed once in **live mode** with a real card.
3. `bun run test` is green.
4. `/admin/monitoring` shows last cron runs green and 0 email failures in 24h.
