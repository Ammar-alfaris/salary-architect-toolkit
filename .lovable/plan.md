# Super Admin Console — Implementation Plan

A platform-level admin area separate from the existing tenant app (`/app/*`). Lives under `/admin/*` with its own shell, sidebar, and route guard. Only `super_admin` (and scoped sub-roles) can access.

---

## 1. Architecture

- **Route prefix:** `/admin/*` (new), independent from `/app/*`.
- **Layout:** `src/routes/admin.tsx` — guard + `AdminShell` (sidebar + topbar + outlet). Redirects non-super-admins to `/app` or `/admin/unauthorized`.
- **Reuses:** existing shadcn/ui, `lib/auth`, `lib/i18n`, `lib/audit`, `lib/format`, dark mode, Recharts.
- **New shared components** (`src/components/admin/`):
  - `AdminShell` (sidebar + header + breadcrumbs)
  - `DataTable` (sort/filter/paginate/bulk-select/row actions)
  - `FilterBar`, `StatusBadge`, `EmptyState`, `ConfirmDialog`, `DetailsDrawer`, `KpiCard`
- **Hooks:** `usePlatformRole()`, `useAuditLog()` (extends existing `lib/audit.ts`).
- **Forms:** React Hook Form + Zod (already available pattern).

```text
src/routes/
  admin.tsx                       (guard + shell layout)
  admin.index.tsx                 (dashboard)
  admin.users.tsx
  admin.organizations.tsx
  admin.organizations.$id.tsx
  admin.plans.tsx
  admin.subscriptions.tsx
  admin.blog.tsx
  admin.blog.$id.tsx              (post editor)
  admin.messages.tsx
  admin.tickets.tsx
  admin.tickets.$id.tsx
  admin.announcements.tsx
  admin.audit.tsx
  admin.settings.tsx
  admin.unauthorized.tsx
```

---

## 2. Database (single migration)

New `platform_role` enum: `super_admin | platform_admin | content_manager | support_manager | billing_manager | viewer`.

New tables (all RLS-protected; only `super_admin` writes; module-scoped read for sub-roles):

| Table | Notes |
|---|---|
| `platform_admins` | `(user_id, role platform_role, status, last_login_at)` — separate from tenant `user_roles`. |
| `plans` | name, slug, monthly_price, annual_price, currency, trial_days, max_users, max_employees, features jsonb, is_recommended, is_visible, status, sort_order. |
| `subscriptions` | organization_id → organizations, plan_id, billing_cycle, status, trial_start/end, start/end, renewal_at, amount, payment_status, auto_renew. |
| `blog_categories` | name, slug, description. |
| `blog_posts` | title, slug, excerpt, content (markdown/html), category_id, author_id, seo_title, seo_description, featured_image_url, featured_image_alt, status (draft/scheduled/published), publish_at, is_featured. |
| `contact_messages` | name, email, subject, message, source_form, status, priority, assigned_to. |
| `support_tickets` | organization_id, requester_name/email, subject, description, category, priority, status, assigned_to. |
| `ticket_messages` | ticket_id, sender_type, sender_id, message, is_internal. |
| `announcements` | title, body, type, audience, start_at, end_at, is_active, created_by. |
| `admin_settings` | singleton row; platform_name, support_email, default_trial_days, default_plan_id, maintenance_mode, timezone, default_locale. |

**Reuse existing:** `organizations`, `profiles`, `audit_logs` (already supports arbitrary entity_type — extend `AuditEntity` union).

**RLS pattern:** new SECURITY DEFINER `is_platform_admin(uid)` and `has_platform_role(uid, role)` to avoid recursion. Policies:
- `super_admin` → full read/write on all admin tables.
- Sub-roles (e.g. `content_manager`) → read/write only their module (blog).
- Tenants never see platform tables.

**Public read:** `blog_posts WHERE status='published'` and `plans WHERE is_visible` get a public SELECT policy so the marketing site can read them.

---

## 3. Pages — what each delivers

**Dashboard (`/admin`)** — KPI cards (users, orgs, active subs, trials, MRR placeholder, open tickets, unread msgs, published posts), recent signups table, latest tickets, recent messages, subscription status pie, accounts-by-plan bar, audit feed, quick action buttons.

**Users** — DataTable across all `profiles` joined with `user_roles` + `subscriptions`. Filters (search, role, org, status, plan, dates). Row actions (view, edit, change role, activate/suspend, impersonate-placeholder). Bulk activate/deactivate/role-assign/export. Details drawer.

**Organizations** — Table from `organizations` + computed user count + subscription. Detail route `/admin/organizations/$id` with profile, subscription, users, usage, tickets, internal notes. Actions: edit, change plan, suspend, extend trial.

**Plans** — Card+table view of `plans`. Form with all fields incl. feature toggles (salary builder, matrix, bonus, merit, allowances, registry, reports, AR support, API, priority support, multi-admin). Add/edit/duplicate/archive/reorder.

**Subscriptions** — Table of all subscriptions with filters (status, plan, cycle, renewal window, trial-ending, suspended). Actions: change plan, cancel, extend trial, mark paid. Detail panel with history + notes.

**Blog CMS** — Tabs: All / Drafts / Scheduled / Published / Categories / Tags / SEO. Editor route with title, slug, excerpt, cover URL, **markdown textarea with live preview** (lightweight — no heavy WYSIWYG dep), category, tags, SEO fields, status, schedule, author. Save draft / preview / publish / schedule / unpublish / delete / duplicate.

**Messages** — Inbox table from `contact_messages`. Statuses: new/read/in_progress/replied/closed/spam. Detail panel + internal notes timeline. Actions: assign, mark read, **convert to ticket**, mark spam, archive.

**Tickets** — List + detail. Detail = conversation thread (`ticket_messages`) + internal notes panel + customer card + status/priority/assignment controls + tags. Statuses: new/open/pending_customer/in_progress/resolved/closed. Priorities: low/med/high/urgent.

**Announcements** — Form + table. Types (maintenance/feature/billing/general/warning), audience (all/trial/paid/specific orgs/admins), schedule window, active toggle.

**Audit Logs** — Reuses existing `audit_logs` table; admin view shows platform-wide entries with filters (actor, action, date, entity).

**Settings** — Tabs (general/branding/auth/support/blog/subscription/notifications/security) backed by `admin_settings` singleton.

**Unauthorized** — Friendly admin 404/403 with return-to-dashboard / login.

---

## 4. RBAC enforcement

- **Route guard** in `admin.tsx`: queries `platform_admins` for current user; if none → redirect `/admin/unauthorized`.
- **Sidebar:** items filtered by role (e.g. `content_manager` sees only Blog + Dashboard).
- **Per-action:** `usePlatformRole().can('write_plans')` helper gates buttons.
- **DB layer:** RLS is the source of truth — UI gating is UX only.

---

## 5. UI/UX

- Dense enterprise tables, sticky headers, horizontal scroll on overflow.
- Status badges with semantic colors (success/warning/error/info).
- Sidebar collapsible to icon-only; sticky topbar with global search, notifications, theme toggle, profile menu.
- Dark mode mandatory (already supported via `lib/theme`).
- Tabular-nums for counts/prices/dates.
- Mobile: sidebar collapses to drawer, tables become stacked cards on `<md`.
- i18n: English + Arabic (RTL aware) for labels — content (blog posts, messages) stays in original language.

---

## 6. Bootstrapping the first super admin

Migration includes a one-time helper: insert a row into `platform_admins` for the user whose email matches a value the user provides post-deploy (or auto-promote the first existing admin of the oldest organization). I'll ask for the super-admin email at implementation time if not obvious.

---

## 7. Out of scope (explicitly placeholders, per your spec)

Email sending, real password reset trigger, real impersonation, real payment capture, file uploads for blog cover (URL field only), rich WYSIWYG (markdown instead), SLA computation, IP capture for audit. All marked as `placeholder` in UI per your brief.

---

## 8. Delivery order

1. Migration (enum, tables, RLS, helper functions, seed admin_settings row).
2. Admin shell + guard + sidebar + dashboard skeleton.
3. Shared `DataTable`, `FilterBar`, `StatusBadge`, `DetailsDrawer`, `ConfirmDialog`.
4. Users → Organizations → Plans → Subscriptions.
5. Blog CMS (list + editor).
6. Messages → Tickets (with convert-to-ticket flow).
7. Announcements → Audit → Settings → Unauthorized.
8. Wire dashboard KPIs to live queries.
9. Pass: dark mode, RTL, mobile, audit logging on every mutation.

Approve to proceed.