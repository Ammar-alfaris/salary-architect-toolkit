## Problem

Two issues with the guided tour on `/app/...` for new accounts (e.g., `Top.organizers@gmail.com`, goal = "new company"):

1. **The tooltip card flickers / shakes**: `guided-tour.tsx` re-runs `update()` on a `requestAnimationFrame` loop *and* a 500ms `setInterval`, recalculating `rect` and re-scrolling into view every frame. The tooltip and highlight visibly jitter. Most users will dismiss it immediately.
2. **Tour is "Next-driven", not "action-driven"**: today the user clicks **Next** to advance, even if they haven't performed the action. We want: show step → user performs the real action (clicks the highlighted button, completes the form) → tour auto-advances to the next step.

## Plan

### 1. Stop the flicker (`src/components/guided-tour.tsx`)

- Remove the `requestAnimationFrame` recursion and `setInterval(update, 500)`.
- Replace with: one initial measurement + a `ResizeObserver` on the target element + a `MutationObserver` on `document.body` (subtree, throttled with `requestAnimationFrame`) + listeners for `resize` and `scroll`.
- Only call `scrollIntoView` **once** when the step first mounts (track via `useRef(step.id)`), not on every measurement — this is the main cause of the shake.
- Only call `setRect` when the new rect actually differs from the previous one (shallow compare) to avoid re-renders.
- If the target element is not yet in the DOM, retry with a single `MutationObserver` instead of a rAF loop; clean up once found.

### 2. Make the tour action-driven (`src/lib/tours.ts` + `guided-tour.tsx` + the target pages)

Extend the `TourStep` type with an optional **completion trigger**:

```ts
export interface TourStep {
  id: string;
  route: string;
  selector: string;
  titleKey: string;
  bodyKey: string;
  // NEW — how this step is completed:
  advanceOn?:
    | { type: "click" }                       // user clicks the highlighted element
    | { type: "event"; name: string }         // app dispatches window event, e.g. "tour:structure-created"
    | { type: "route"; pathname: string };    // user navigates to a given route
}
```

Behaviour in `GuidedTour`:
- **`click`** (default for most steps): attach a one-shot `click` listener to the highlighted element; on click, call `completeStep` + `setStepIndex(idx+1)`. The tooltip's **Next** button is hidden for these steps and replaced by a hint label like *"Click the highlighted button to continue"* (`tour_hint_click_target`).
- **`event`**: subscribe to `window.addEventListener(name, …)`. Pages dispatch `window.dispatchEvent(new CustomEvent("tour:xxx"))` after the real action succeeds (structure created, employees imported, etc.).
- **`route`**: listen to `location.pathname` changes and advance when matched.
- Manual **Next** is kept only as a fallback for purely informational steps (no `advanceOn`), and **Back** + **Skip tour** stay available everywhere.

### 3. Wire real action events from the relevant pages

Dispatch `CustomEvent` after each meaningful action (small additions, no behaviour change otherwise):

- `src/routes/app.structures.tsx` — after a structure is successfully created → `window.dispatchEvent(new CustomEvent("tour:structure-created"))`.
- `src/routes/app.employees.tsx` —
  - after the **Add employee** dialog saves → `tour:employee-added`,
  - after **Import from Excel** completes → `tour:employees-imported`,
  - after **Auto-link grades** finishes → `tour:grades-linked`.
- `src/routes/app.merit.tsx` and `src/routes/app.bonus.tsx` — after a cycle is created → `tour:merit-created` / `tour:bonus-created`.

### 4. Update tour definitions (`src/lib/tours.ts`)

Add `advanceOn` to each step. Example for `new_company`:

```text
1. create-structure   → advanceOn: { type: "click" }                 (highlight the Create button)
2. structure-fields   → advanceOn: { type: "event", name: "tour:structure-created" }
3. add-employees      → advanceOn: { type: "event", name: "tour:employee-added" }
4. import-template    → advanceOn: { type: "event", name: "tour:employees-imported" }
5. auto-link          → advanceOn: { type: "event", name: "tour:grades-linked" }
6. analytics          → informational, manual Next/Finish
```

Same approach for `existing_structure`, `employees_only`, `cycles_only`.

### 5. i18n (`src/lib/i18n.tsx`)

Add bilingual keys:
- `tour_hint_click_target` — EN: "Click the highlighted button to continue." / AR: "اضغط الزر المُحدَّد للمتابعة."
- `tour_hint_do_action` — EN: "Complete this action and we'll move to the next step." / AR: "أكمل هذه الخطوة وسننتقل تلقائياً إلى التالية."
- `tour_waiting` — EN: "Waiting for you…" / AR: "بانتظار إكمال الخطوة…"

### 6. Out of scope

- No DB migration. Onboarding state shape in `organizations.onboarding` already supports `current_step_index` / `completed_steps`.
- No redesign of the tooltip card visuals (only stability + button logic changes).
- Tour analytics / step completion telemetry beyond what already persists.

## Files touched

- edit `src/components/guided-tour.tsx` (stability + action-advance)
- edit `src/lib/tours.ts` (add `advanceOn` per step)
- edit `src/lib/i18n.tsx` (3 new keys × AR/EN)
- edit `src/routes/app.structures.tsx`, `src/routes/app.employees.tsx`, `src/routes/app.merit.tsx`, `src/routes/app.bonus.tsx` (dispatch `CustomEvent` after real actions)
