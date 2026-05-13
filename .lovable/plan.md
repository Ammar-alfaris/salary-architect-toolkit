## Goal
Fix the remaining approval workflow issues in four places: mobile review screens, final approved bonus persistence, approval-chain usability, and in-app notifications.

## Plan

### 1) Make approval review and edit flows mobile-friendly
- Refactor the approval summary modal used by “View Changes” so merit and bonus details render as stacked mobile cards on small screens instead of wide tables.
- Refactor the edit/review modal so managers can review and edit rows in a phone-friendly layout, while preserving the existing desktop table layout.
- Keep summary metrics visible at the top, then show each employee row as a readable card with key numbers and inputs.
- Tighten modal sizing, scrolling, and action button layout for small screens.

### 2) Save approved bonus cycles as final locked records
- Review the current bonus approval/apply flow and stop treating approval as a temporary state only.
- Update the bonus workflow so a fully approved bonus cycle is persisted as the final approved version for that cycle/year.
- Ensure the final approved payload is the source of truth when users reopen the cycle later.
- Mark approved bonus cycles/results as finalized and read-only after final approval, while still allowing viewing/export.
- Surface approved-by and approved-at information in the bonus area so users can tell the cycle is finalized.

### 3) Improve approval chain setup for invited/internal managers
- Update the approval-chain editor member list logic so invited-and-linked managers appear reliably in the internal user selector.
- When an internal user is selected, automatically populate the corresponding email instead of forcing manual entry.
- Keep manual email available only as a fallback for approvers not yet available in the organization list.
- Preserve compatibility with existing saved chains.

### 4) Add an in-app approval notification area on the dashboard
- Add a dashboard notification section above the main KPI area for approval-related updates.
- Show actionable messages for managers and regular users, such as pending requests, approvals completed, and next-step guidance.
- Start with approval workflow notifications sourced from existing approval request data so the feature works immediately without requiring an external email dependency.
- Make the notification cards compact and mobile-friendly.

## Technical details
- Frontend files likely involved: `src/routes/app.approvals.tsx`, `src/components/approval-summary.tsx`, `src/components/approval-chain-editor.tsx`, `src/routes/app.bonus.tsx`, `src/routes/app.index.tsx`.
- Backend/data changes are likely needed for finalized bonus persistence and read-only behavior, so I expect to add a migration for finalization metadata and/or constraints around post-approval edits.
- I’ll reuse the existing approval request/final payload model where possible instead of introducing a parallel workflow.
- Notifications will be based on current approval data first; if a dedicated notifications table becomes necessary after inspection during implementation, I’ll keep it minimal and scoped only to approval events.

## Expected result
- Managers can comfortably review and edit approval requests on mobile.
- Approved bonus cycles become durable final records visible later in the bonus area and no longer editable.
- Approval-chain setup prefers existing invited managers and auto-fills their email.
- Users see clear approval-related notifications on the dashboard instead of only a generic welcome message.