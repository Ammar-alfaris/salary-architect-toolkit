## Root causes found

1. **Cannot open/edit email templates · Cannot open ticket detail**
   `src/routes/admin.emails.tsx` and `src/routes/admin.tickets.tsx` have child routes (`admin.emails.$key.tsx`, `admin.tickets.$id.tsx`) but their components render a full page **without `<Outlet />`**. In TanStack Start, when a parent route has children, its component MUST render `<Outlet />` or the child route matches but nothing appears. This is exactly why clicking a template or a ticket "does nothing" — the URL changes but the parent keeps rendering its own list.

   Fix: split each into a layout + index pattern:
   - `admin.emails.tsx` → tiny layout exporting `<Outlet />` only.
   - Move current list UI to `admin.emails.index.tsx`.
   - Same for `admin.tickets.tsx` → `admin.tickets.index.tsx`.

2. **Only one user shows up although there are 5 in the database**
   DB has 5 profiles + 5 user_roles. RLS policies (`Platform admins view all profiles`, `Platform admins view all user_roles`, `Platform admins view all organizations`) are present, so the super admin should see them. The likely cause is a stale browser session before those policies were added. We will:
   - Add a small diagnostic `console.error` if the profiles query returns fewer rows than expected.
   - Re-verify RLS via the linter and add a safety policy if missing.
   - Force a re-fetch + clearer empty-state.

3. **Missing super-admin abilities** (currently placeholders)
   - Reset password (admin-triggered)
   - Suspend / re-activate user
   - Change user role inside an organization
   - Promote user to platform admin (super_admin can manage `platform_admins`)
   - Change the recipient email for ticket notifications (already field `admin_settings.support_email`, but no UI control yet)
   - Test email send from a template

## Changes

### A. Routing fix (the biggest user-visible bug)
- Replace `src/routes/admin.emails.tsx` content with a layout: `() => <Outlet />`.
- Create `src/routes/admin.emails.index.tsx` containing today's list + "New template" dialog.
- Replace `src/routes/admin.tickets.tsx` with a layout: `() => <Outlet />`.
- Create `src/routes/admin.tickets.index.tsx` containing today's list/filters.

### B. Users page upgrades (`src/routes/admin.users.tsx`)
- Add row-level actions for super_admin:
  - "Send password reset" → `supabase.auth.resetPasswordForEmail(email)`.
  - "Change role" select inside the side sheet (writes to `user_roles`).
  - "Make platform admin" / "Revoke" toggle (writes to `platform_admins`, gated by `has_platform_role(_, 'super_admin')`).
- Better empty-state + log when query returns 0/1 rows so we can debug RLS in the field.

### C. Email templates editor
- Add **"Send test email"** button in `admin.emails.$key.tsx` that posts to a new server function which renders the template and enqueues via the existing email queue.
- Keep current AR/EN editor and live preview.

### D. Tickets
- In `admin.tickets.$id.tsx` keep current reply/internal-note flow and on status change to `in_progress` / `resolved` / `closed`, enqueue a notification email to the requester using the corresponding template (`ticket_status_in_progress`, `ticket_status_resolved`, `ticket_status_closed`). Templates already exist; we'll wire them.
- New ticket created → email super-admin notification address (from `admin_settings.support_email`).

### E. Settings
- In `src/routes/admin.settings.tsx` expose a **"Ticket notifications email"** input bound to `admin_settings.support_email`, editable only by `super_admin`.

### F. Auth flow stays on our domain
- Keep custom auth email templates already scaffolded under `src/routes/lovable/email/auth/*` and `src/lib/email-templates/*`. No changes needed to authentication paths — they already use our `notify.totalreward.app` sender after DNS verifies.

### G. RLS verification
- Run `supabase--linter` after changes and fix any new warning.
- No schema changes expected; if the user-list RLS is somehow missing in the Live DB, re-apply the `Platform admins view all profiles/user_roles/organizations` policies via migration (idempotent with `IF NOT EXISTS`).

## Files touched

- `src/routes/admin.emails.tsx` (becomes layout)
- `src/routes/admin.emails.index.tsx` (new — list)
- `src/routes/admin.emails.$key.tsx` (add Test send)
- `src/routes/admin.tickets.tsx` (becomes layout)
- `src/routes/admin.tickets.index.tsx` (new — list)
- `src/routes/admin.tickets.$id.tsx` (auto status emails)
- `src/routes/admin.users.tsx` (real actions)
- `src/routes/admin.settings.tsx` (support email field)
- One small migration only if RLS policies are missing in Live.

After this, the Super Admin console will: list every user, open every email template, open and reply to every ticket, change ticket status with automatic branded emails, manage platform admins, and configure the notification recipient — all under your domain `totalreward.app` / `notify.totalreward.app`.