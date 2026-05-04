# Governance & Apply/Approve Workflow

Today, Merit / Bonus / Structures rely on a single `ApprovalBar` that submits a flat request and locks the entity. There is no "Apply directly", no multi-step chain, no reviewer edits, no email notification, and approved values never flow back into `employees` or `employee_allowances`. This plan adds all of the above.

## 1. Database (one migration)

**Org policy** — extend `organizations.approval_settings` JSON with:
```
{ require_approval_for: ["merit_cycle","bonus_cycle","allowance_change","salary_structure"],
  default_chain_id: uuid | null,
  notify_via_email: true }
```

**New tables**
- `approval_chains` — `id, organization_id, name, applies_to text[] (entity types), is_default bool, created_by, created_at`.
- `approval_chain_steps` — `id, chain_id, step_order, name, approver_user_id uuid?, approver_email text?, approver_label text?, approver_role text?` (either an internal user OR a free-text manual entry).
- Extend `approval_requests` with: `chain_id uuid?`, `current_step int default 0`, `proposed_payload jsonb` (the values being requested), `final_payload jsonb` (after reviewer edits), `applied_at timestamptz?`, `applied_by uuid?`.
- `approval_step_decisions` — `id, request_id, step_order, decided_by, decided_by_email, decision (approved|rejected|edited|sent_back), note text, edits jsonb, created_at`.

RLS: members of the org can read; only org admins can write chains; approvers (matched by `auth.uid()` or by email match on the current step) can insert decisions.

## 2. Apply vs Request — UX on Merit, Bonus, Allowances

Replace the single "Save" / "Submit for approval" pattern with **two primary buttons**:

- **Apply now** — visible when the user has `admin` org-role OR `require_approval_for` does not include this entity type. Persists the changes immediately:
  - Merit: writes `merit_results`, then `UPDATE employees SET base_salary = new_salary` for each row in scope (single employee or all). Snapshots a version.
  - Bonus: writes `bonus_results`, snapshots a version, optionally exports CSV for finance.
  - Allowances: upserts `employee_allowances` and (optionally) updates total cash on the employee.
- **Request approval** — opens a dialog to pick a chain (or use default) + reason, posts an `approval_requests` row with `proposed_payload`, sets `current_step=1`, emails the first approver.

Per-employee exception (bonus): row-level "Apply" button writes a single `bonus_results` row + snapshot, independent of the cycle.

## 3. Approval chain runtime

`/app/approvals` upgraded:
- Approvers see only requests where the current step's `approver_user_id = me` or `approver_email = my email`.
- Three actions per step: **Approve**, **Edit & approve**, **Send back**, **Reject**.
- "Edit & approve" loads the proposed payload into an editable form (same component as the source page, read-only context except editable numbers). Edits are recorded in `approval_step_decisions.edits` (field-level diff). Updates `final_payload`.
- On approval: increment `current_step`. If past last step, set `status='approved'` and email the requester ("Ready to apply"). If sent back, set status `pending` with `current_step=0` and notify the requester.

## 4. Diff & "Apply" on the requester side

When the requester opens an approved request:
- Renders a **diff view**: original vs final payload, changed cells highlighted (amber), with reviewer notes per step shown inline.
- Two buttons: **Apply changes** (writes to employees / employee_allowances / cycles, sets `applied_at`, snapshots a version, audit-logs `approval_applied`) or **Send back to approver** (creates a fresh request referencing the prior one).

## 5. Custom approval-chain editor

New page `/app/settings` → "Approvals" tab (or extend `app.settings.tsx`):
- List org chains, mark default per entity type.
- Chain editor: drag-to-reorder steps. Each step picks **Internal user** (Select from `user_roles` joined with `profiles`) **or** **Manual contact** (label + email + role text). Validation: at least one step.
- Toggle: "Require approval for: Merit / Bonus / Allowance / Structure".

## 6. Email notifications

Use existing Lovable Emails infra (`auth_emails`/`transactional_emails` queue). One server function `notifyApprovalEvent(requestId, event)` → enqueues an email to:
- Next approver when request is created or step advances.
- Requester when fully approved, rejected, or sent back.

If an email domain isn't configured yet, the agent will trigger the email-domain setup dialog at implementation time. Until then, in-app toast + an `announcements` row to the approver still works.

## 7. Bonus snapshots & download

On `app.bonus.tsx`:
- Add **Save snapshot** button → `version_history` row with the full result table (JSON) labelled `Bonus YYYY — <date>`.
- Snapshots list with **Download CSV** and **Re-apply** buttons.
- Per-row "Edit" dialog for one-off employee bonus override (admin-only or via approval).

## 8. i18n

Add Arabic + English strings: `apply_now`, `request_approval`, `pick_approval_chain`, `approval_chain`, `add_step`, `internal_user`, `manual_contact`, `edit_and_approve`, `send_back`, `approval_changes_diff`, `apply_approved_changes`, `approval_required_for`, `notify_first_approver_email`, `bonus_save_snapshot`, `bonus_apply_to_employee`, plus diff highlight tooltips.

## 9. Out of scope

- No SAML/OIDC roles for external approvers — manual-contact email is sufficient.
- No mobile push / SMS notifications.
- No automatic finance-system export beyond CSV download.
- Salary-structure approval flow (already exists via ApprovalBar) gets the same Apply/Request rewrite but no payload-diff UI in this pass — structures are edited in place and version-snapshotted.

## Files to create / edit

**New**
- `supabase` migration (tables + RLS + columns).
- `src/lib/approvals.ts` — chain CRUD, request lifecycle, diff helpers.
- `src/components/apply-or-approve.tsx` — the two-button bar replacing `ApprovalBar` on Merit/Bonus/Allowances.
- `src/components/approval-diff.tsx` — diff renderer with cell highlights & notes.
- `src/components/approval-chain-editor.tsx` — chain & step editor.
- `src/server/approvals.functions.ts` + `src/server/approvals.server.ts` — `applyApprovedRequest`, `notifyApprovalEvent`.
- Email template for approval notifications (via scaffold tool when email domain is set).

**Edited**
- `src/routes/app.merit.tsx`, `src/routes/app.bonus.tsx`, `src/routes/app.allowances.tsx` — Apply-now / Request-approval buttons, snapshot save, per-employee actions.
- `src/routes/app.approvals.tsx` — multi-step UI, edit/send-back actions, approver filtering.
- `src/routes/app.settings.tsx` — Approvals tab with chain editor + entity toggles.
- `src/lib/governance.ts` — extended for chains and step decisions.
- `src/lib/i18n.tsx` — new keys EN/AR.

