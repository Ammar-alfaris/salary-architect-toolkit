# Fix email sending, recipient picker, and team invitations

## Root causes (verified from DB + code)

1. **"Queued but never sent"** — `email_send_log` shows every campaign send fails with:
   `Email API error: 400 Missing run_id or idempotency_key — App emails can omit run_id by providing idempotency_key with purpose=transactional`.
   `src/lib/email-campaign.functions.ts` enqueues a payload missing `purpose`, `idempotency_key`, `from`, and `sender_domain`. The queue processor forwards exactly what was enqueued, so Lovable's email API rejects every send.
2. **No recipient picker** — `admin.emails.send.tsx` only renders an `<Input type="email">` for "Single recipient".
3. **Invitations not emailed** — `app.team.tsx` only inserts a row into `pending_invitations`. Nothing ever calls Supabase Auth's invite API or queues an email, so the invitee never receives anything.
4. **Org linking on accept already exists** — the `handle_new_user` trigger (migration `20260502144422`) already attaches a new signup to the inviter's org + role when `lower(email)` matches a pending invite. So once we actually send an invite email and the user signs up via that link, they land in the right org. No DB change needed.

## Changes

### 1. Fix transactional send payload (`src/lib/email-campaign.functions.ts`)
Add the fields the auth hook already sets correctly:
- `purpose: "transactional"`
- `idempotency_key: messageId` (reuse the generated `message-id`)
- `from: "<SITE_NAME> <noreply@totalreward.app>"`
- `sender_domain: "notify.totalreward.app"`
- `queued_at: new Date().toISOString()` (for TTL)

Constants will live alongside the function (matching the auth-hook values). After this fix, the existing queue processor + `email_send_log` already record `pending → sent / failed / dlq` correctly.

### 2. Recipient picker + delivery status UI (`src/routes/admin.emails.send.tsx`)
- When `audience === "single"`, fetch `profiles (id, email, full_name)` once and render a searchable `Command`/`Combobox` (shadcn `Command` inside `Popover`) with free-text fallback so admins can either pick an existing user or type a new address.
- After `sendFn` returns, store the `message_id`s and poll `email_send_log` (filter by `message_id IN (...)`) every 3s for up to ~60s. Render a small status table under the composer: `recipient · status (pending/sent/failed/dlq) · error_message`. Stop polling when all rows are terminal.
- Add an i18n string set (EN/AR) for the new labels (`pick_recipient`, `delivery_status`, `status_pending/sent/failed/dlq`).

### 3. Real invitation emails (`src/routes/app.team.tsx` + new server fn)
- Create `src/lib/invitations.functions.ts` with `sendTeamInvitation` (`createServerFn`, POST):
  - Inputs: `organizationId`, `email`, `role`.
  - Uses `supabaseAdmin` (service role) to:
    1. Verify the caller is an admin of `organizationId` via the request's bearer token (reuse `requireSupabaseAuth` middleware) — refuse otherwise.
    2. Upsert `pending_invitations` row (so cancellation/resend stays idempotent on `(org, email)`).
    3. Call `supabase.auth.admin.inviteUserByEmail(email, { redirectTo: "https://totalreward.app/auth?invited=1", data: { invited_org: organizationId, invited_role: role } })`. This triggers the auth-email-hook with `email_action_type=invite`, which already renders `InviteEmail` and queues it through the working auth pipeline.
- `app.team.tsx → handleInvite` calls this server fn instead of inserting directly. Still shows the row in "Pending invitations". Show toast with success/failure from server.
- Add a "Resend" button next to each pending invite that re-calls the same server fn.

### 4. Acceptance flow
No SQL change required — the existing `handle_new_user` trigger attaches the new auth user to the org + role from `pending_invitations` on first signup. We only need to make sure the invited user lands on `/auth` with the correct email pre-filled:
- Light tweak in `src/routes/auth.tsx`: read `?invited=1` and `?email=` from the URL on mount, default the form to **Sign up** mode and pre-fill email. Supabase appends the invite token automatically; once the user sets a password, the trigger fires and they're routed into the inviting org's dashboard.

## Out of scope
- No new database tables / RLS changes.
- No change to the auth email templates themselves (they already work — the auth pipeline shows `signup/recovery` rows as `sent` in the log).
- No replacement of the queue processor; only the enqueue payload is fixed.
