## Goal

Finish the remaining Approval Flow polish:

1. Always expose a clear way to reach the Approval Chains setup from any action toolbar (next to "Apply now").
2. Replace the raw JSON `Textarea` in the "Edit and approve" dialog with a structured, human-readable editor.

## 1. New "Set up approval chain" button next to Apply now

File: `src/components/apply-or-approve.tsx`

- Render a third button next to `Apply now` / `Request approval`:
  - Label: `t("setup_approval_chain")` (already exists, e.g. "تعيين سلسلة موافقات" / "Set up approval chain").
  - Icon: `Settings` from lucide.
  - `variant="outline"`, `size="sm"`.
  - Uses `<Link to="/app/settings" search={{ tab: "approvals" }}>` so it deep-links straight into the Approvals tab in Settings.
- Show this button to users who can manage settings (`perms.canAdmin` OR `perms.has("manager")`). For non-admins keep current behavior (no button).
- Keep the existing fallback button that shows when `requireApproval && chains.length === 0` — but unify it to point to the same deep link (`/app/settings?tab=approvals`) using `search`.

## 2. Deep-link the Settings → Approvals tab

File: `src/routes/app.settings.tsx`

- Add `validateSearch` to the route to accept `tab?: "general" | "approvals" | ...`.
- Use `Route.useSearch()` to initialize the `Tabs` `value`/`defaultValue` from the URL, and update URL on tab change with `useNavigate({ from: Route.fullPath })` + `search: { tab }` (replace: true).
- This lets the new button land directly on the chain editor without extra clicks.

## 3. Structured "Edit and approve" UI (replace raw JSON)

File: `src/routes/app.approvals.tsx`

Replace the `Textarea` JSON editor (lines ~196-201) with a structured renderer that mirrors how the payload is consumed by `applyApproved`:

- Build a small helper `PayloadEditor({ entityType, payload, onChange })`:
  - For `merit_cycle`: render a table of `recommendations` rows with editable numeric inputs:
    columns: Employee (read-only `id`/name), Current base (read-only), Increase % (input), Increase amount (auto = base × pct), New salary (auto). Editing % recomputes amount + new salary.
  - For `bonus_cycle`: render a table of `results` rows with: Employee, Base, Target %, Calculated bonus (input). Plus two top-level fields `bulkPerf`, `bulkBiz` as small numeric inputs.
  - For `salary_structure` and any unknown type: fall back to a read-only key/value list using the existing `ApprovalDiff` component (before vs. proposed) plus per-key text inputs for primitive scalar values.
- Maintain edits in component state as a typed object (not a string), and pass it directly into `recordDecision({ edits, finalPayload })`. No `JSON.parse` needed → no "Invalid JSON" failure mode.
- Keep the `decision_note` textarea unchanged.
- Dialog stays mobile-safe (`max-w-[95vw]`, `overflow-x-hidden`, inner table wrapped in `overflow-x-auto`).

## 4. i18n

File: `src/lib/i18n.tsx`

Confirm/add keys (most exist already from previous work):
- `setup_approval_chain` — AR: "تعيين سلسلة موافقات", EN: "Set up approval chain"
- `edit_payload_help` — short helper line for the structured editor (AR + EN)
- Column headers used by `PayloadEditor` (`employee`, `current_base`, `increase_percent`, `increase_amount`, `new_salary`, `target_percent`, `calculated_bonus`) — reuse existing keys where present, add only the missing ones.

## Out of scope

- No DB / RLS changes.
- No new routes.
- Self-approval blocking, chain validation, and mobile overflow fixes from the previous round are kept as-is.

## Acceptance

- On any action page (Merit / Bonus / Allowances / Structures), an admin/manager sees three buttons: `Apply now`, `Request approval` (or "Set up approval chain" when no valid chain), AND a persistent `Set up approval chain` link button that opens `/app/settings?tab=approvals` directly on the Approvals tab.
- Approving with edits no longer shows raw JSON; the reviewer sees a clean table with editable numeric fields and saves a real object.
