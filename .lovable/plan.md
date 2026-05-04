
## Problem

In the screenshot (mobile, 390px wide), the guided tour tooltip card is fixed over the employee form and covers the "Job title", "Location", "Job family", "Base salary" fields. The user cannot tap them. Two root causes:

1. **Tooltip card sits on top of form fields and blocks clicks.** It's a 320px card placed near `rect.left/top`. On a 390px viewport that leaves only a 70px sliver, and the card vertically extends ~220px over the inputs below. There is no logic to push the card off-screen-edge or out of the way of nearby form controls.
2. **Auto-advance hides the Next button.** When `advanceOn` is set, `(!hasAutoAdvance || isLast)` evaluates false, so the only visible action is "Skip tour" + a back chevron. Users who want to skim ahead, look around, then come back, are blocked.

The user also wants:
- The first-login tour to keep appearing.
- Skip + Previous + Next visible on every step (auto-advance still works in parallel).
- Floating help button to resume the tour later (already exists — keep it).

## Plan (single file: `src/components/guided-tour.tsx`)

### 1. Stop the tooltip from covering the highlighted target / form

- Compute tooltip placement that prefers below the target, falls back above, then to the side. If neither below nor above fits without overlapping the target rect, place it at the bottom of the viewport (full-width minus margins on mobile).
- On viewports < 480px: make the card `width: calc(100vw - 24px)`, max-width 360px, and pin it to either the top (12px) or bottom (12px) edge of the screen — whichever is farther from the target rect — so it never sits on top of nearby inputs.
- Reduce `tipH` estimate after we measure the actual card via a ref; recompute placement once after mount using the real height (fallback estimate stays for first paint).
- Keep `pointer-events-auto` on the card itself (so its buttons work) but ensure the dim layer stays `pointer-events-none` (already correct). Double-check the highlight ring also stays `pointer-events-none` so the user can click the target.

### 2. Always show Prev / Next, keep auto-advance

In the action row, render three controls on every step:
- "Skip tour" (left)
- Prev chevron — disabled when `idx === 0`
- Next button — always visible. Label is `tour_next` (or `tour_finish` on last step). Clicking it calls the existing `advance()` (which marks the step complete and moves on), regardless of whether `advanceOn` is set.

Auto-advance listeners (click/event/route) stay exactly as they are — whichever fires first wins. This gives users the choice: do the action, or click Next to skim.

Hint text ("Click the highlighted button…" / "Complete this action…") stays, but reword the auto-action hint to "…or press Next to continue" so users know they aren't forced.

### 3. Keep first-login tour + resume

No change needed. `OnboardingGate` already redirects new users to `/app/onboarding`, and `FloatingHelp` already shows a help bubble when `dismissed_at == null` and the tour isn't active. Confirm both paths still trigger after the changes above.

### 4. i18n (`src/lib/i18n.tsx`)

- Update existing `tour_hint_do_action` AR/EN to append "…or press Next to continue" / "…أو اضغط التالي للمتابعة".
- Update `tour_hint_click_target` similarly.

## Out of scope

- No changes to `tours.ts`, route pages, or onboarding state.
- No new DB migrations.
- No redesign of the tooltip visuals beyond placement/size and the always-visible Next button.
