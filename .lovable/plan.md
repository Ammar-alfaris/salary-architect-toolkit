
I'll address the eight issues. Here is the breakdown.

## 1. Mobile scroll on form pages
The app shell sets `<main className="flex-1 overflow-auto">` inside a `min-h-screen flex` container. On iOS Safari this can lock the inner scroll height. Fix:
- Replace `overflow-auto` with `overflow-y-auto overscroll-contain` and add `pb-24` safe-area padding to long form routes.
- Add `min-h-0` on the flex column so the main pane can scroll properly.
- Add a `<ScrollToTop />` component (listens to TanStack `useRouterState` location) mounted in `__root.tsx` so navigation always lands at the top.

## 2. Approval flow (Merit / Bonus / Allowances)
Multiple linked fixes in `src/components/apply-or-approve.tsx` + `src/lib/approvals.ts`:
- **Gate "Request approval"**: load chains for the entity and approval policy; if no chain configured, hide `Request approval` and instead show a `Set approval flow` button that links to `/app/settings#approval-chains`.
- **Prevent self-approval**: in `createRequest`, validate that the resolved chain has at least one step whose `approver_user_id` ≠ current user (or has email/role). If chain resolves to only the requester, throw a translated error and surface a toast.
- **Apply now**: ensure `onApply` is awaited; on Allowances, `applyAllowance` already inserts but disables when `employeeId` empty — show clearer toasts, refresh employee row, and bubble up errors. On Merit/Bonus, ensure `applyMerit`/`applyBonus` actually run when no `cycleId`/no-approval path (currently the ApplyOrApprove block on Merit only renders if `cycleId` exists; render the Apply button always, request-approval requires cycleId).
- **Approver review UI**: replace raw JSON `Textarea` in the Edit & approve dialog with a structured renderer:
  - For `merit_cycle`: show recommendations table (name, base, recommended %, increase, new salary) with editable % column gated by allowed fields; persist edits back into `final_payload.recommendations`.
  - For `bonus_cycle`: similar table for results (target, multipliers, calculated bonus).
  - For `salary_structure`: show side-by-side ApprovalDiff (already exists).
  - Keep "Show raw JSON" toggle for power users.
- **Mobile layout in Approvals**: `RequestCard` action row uses `flex-wrap` + `shrink-0`; wrap the card body in `min-w-0` and constrain the dialog `DialogContent` with `max-w-[95vw] sm:max-w-2xl overflow-x-hidden`. The JSON `<pre>` becomes `whitespace-pre-wrap break-all`.

## 3. Allowances "Apply now" not responding
Currently disabled silently when no employee selected. Wire it up:
- Validate employee selection BEFORE rendering Apply (toast + scroll into view if missing).
- Confirm dialog → insert into `employee_allowances` → also `update employees set ...` for related fields → invalidate React Query / refetch → success toast in current locale.

## 4. Mobile horizontal overflow (tables, tab bars)
- Add `overflow-x-hidden` on main `<div>` of pages with tables.
- Wrap every `<DataTable>` and wide table in `<div className="overflow-x-auto -mx-4 px-4">` so only the table scrolls.
- Add `min-w-0` on flex children that hold long text; use `truncate` on titles.
- `Tabs` lists get `overflow-x-auto whitespace-nowrap`.
- Add a global CSS rule in `styles.css`: `html, body { overflow-x: hidden; }` and `*, *::before, *::after { min-width: 0; }` scoped under app shell.

## 5. Support ticket creation error (`duplicate key … ticket_number_key`)
Root cause: the BEFORE INSERT trigger `trg_set_ticket_number` is missing in the live DB (functions exist but triggers list is empty). Migration:
```sql
DROP TRIGGER IF EXISTS trg_set_ticket_number ON public.support_tickets;
CREATE TRIGGER trg_set_ticket_number
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_ticket_number();
```
Also harden `set_ticket_number()` with `LOCK TABLE … IN SHARE ROW EXCLUSIVE MODE` (or use a sequence) to avoid race duplicates.

## 6. Navigation restructure (collapsible, grouped)
Rewrite `src/components/app-shell.tsx` nav into grouped, collapsible sections using a small `<NavGroup>` (Radix Collapsible). Groups:
- **Overview** — Dashboard
- **Compensation** — Salary Structures, Salary Matrix, Allowances
- **Cycles** — Merit, Bonus, Approvals
- **People** — Employees, Team
- **Analytics** — Compa, Penetration, Pay Equity
- **Operations** — Reports, Audit Log
- **Help** — Help & Support, Support Tickets
- **Settings**
Behavior:
- Each group has an icon + label + chevron; remembers open state in `localStorage`.
- The active route auto-expands its group.
- Mobile sheet uses identical structure but full-height with safe-area + sticky header.
Same treatment for `admin-shell.tsx` (Platform / Content / Communications / System).

## 7. Email Campaign / Send Email page
New route `src/routes/admin.emails.send.tsx` (also linked from `/admin/emails` index as "Send campaign"):
- **Template selector** populated from `email_templates` (existing helper `listTemplates`).
- **Audience selector**:
  - All users / Single user (search) / By role (admin/analyst/manager/viewer) / By organization / By plan tier.
  - Live "Recipients: N" counter via Supabase queries against `profiles` joined with `user_roles` / `subscriptions`.
- **Subject AR/EN + Body AR/EN** auto-filled from chosen template via `interpolate`; user can edit before send.
- **Preview** pane using `brandedWrap()` (existing Total Reward branded HTML wrapper) with locale toggle.
- **Send**: server function `src/lib/email-campaign.functions.ts` using `createServerFn` that:
  - resolves recipients on the server (RBAC: requires `super_admin`),
  - enqueues one row per recipient via existing `enqueue_email` RPC into `transactional_emails` queue with branded HTML,
  - logs a campaign row in a new `email_campaigns` table (id, template_key, audience_json, recipient_count, sent_by, created_at).
- Show send progress + final toast with `email_send_log` link.

## 8. Admin ticket detail not opening
Root: `admin.tickets.tsx` is a layout (`<Outlet />`) and `admin.tickets.$id.tsx` exists, but the index list links use `to="/admin/tickets/$id"` correctly. The actual blocker is RLS — `support_tickets` SELECT only allows the requester. Migration:
```sql
CREATE POLICY "Platform admins can view all tickets"
  ON public.support_tickets FOR SELECT
  USING (public.is_platform_admin(auth.uid()));
CREATE POLICY "Platform admins can update tickets"
  ON public.support_tickets FOR UPDATE
  USING (public.is_platform_admin(auth.uid()));
CREATE POLICY "Platform admins can read messages"
  ON public.ticket_messages FOR SELECT
  USING (public.is_platform_admin(auth.uid()));
CREATE POLICY "Platform admins can write messages"
  ON public.ticket_messages FOR INSERT
  WITH CHECK (public.is_platform_admin(auth.uid()));
```
Also fix `admin.tickets.$id.tsx` to surface load errors (currently silently shows "Loading…" forever) and add a "Back to tickets" link that works.

## Files to create
- `src/components/scroll-to-top.tsx`
- `src/components/nav-group.tsx`
- `src/routes/admin.emails.send.tsx`
- `src/lib/email-campaign.functions.ts`
- `supabase/migrations/<ts>_fix_tickets_and_admin_policies.sql`

## Files to modify
- `src/routes/__root.tsx` (mount ScrollToTop)
- `src/components/app-shell.tsx`, `src/components/admin/admin-shell.tsx` (grouped nav, mobile scroll fix, overflow-x-hidden)
- `src/components/apply-or-approve.tsx` (gate request-approval, self-approval block, structured edit dialog)
- `src/lib/approvals.ts` (validate chain in createRequest)
- `src/routes/app.approvals.tsx` (structured Edit & approve dialog, mobile dialog sizing)
- `src/routes/app.allowances.tsx` (Apply now wiring + validation)
- `src/routes/app.merit.tsx`, `src/routes/app.bonus.tsx` (Apply now always available; better feedback)
- `src/routes/admin.tickets.index.tsx`, `src/routes/admin.tickets.$id.tsx` (error surfacing, table overflow)
- `src/routes/admin.emails.index.tsx` (link to new Send campaign page)
- `src/styles.css` (overflow-x guards, safe-area)
- `src/lib/i18n.tsx` (new keys: set_approval_flow, no_approval_flow_yet, cannot_approve_self, send_campaign, audience, recipients, etc.)

After approval I will implement these in order: 5 + 8 (DB) → 1 + 4 (mobile) → 6 (nav) → 2 + 3 (approval/apply) → 7 (campaign).
