# Full Arabic Localization & RTL Audit — TotalReward.app

## Goal
When the user switches to Arabic, the **entire** app must render in professional, consistent Arabic with full RTL behavior. No stray English (except protected technical terms). Apply the exact glossary you provided.

## Current state (verified)
- `src/lib/i18n.tsx` covers ~80 keys — only sidebar labels and a few generic words.
- Every route file contains **hardcoded English** strings: dialog titles, table headers, placeholders, toasts, tab labels, empty states, chart legends, button labels, KPI captions.
- `app-shell.tsx` search input placeholder is hardcoded `"Search…"`; aria-labels are English.
- `app.settings.tsx` still shows the literal phrase "English / العربية with RTL" you flagged.
- `index.tsx` (landing) feature cards, KPIs, and footer links are hardcoded English.
- RTL works at the `<html dir>` level, but several layouts use `ml-/mr-/left-/right-/text-left/text-right` instead of logical `ms-/me-/start/end` — these break visually in RTL.
- Toasts (`toast.success("Welcome back")`, `"Settings saved"`, `"Insufficient permissions"`, `"Employee added"`) are hardcoded.
- Recharts `Tooltip`/`Bar name="Range"`/`Line name="Midpoint"` labels are hardcoded.

## Protected terms (kept as-is, never translated)
`TotalReward`, `RewardArchitect`, `COMPA-RATIO`, `Compa`, `CSV`, `Excel`, `PDF`, `USD/EUR/GBP/AED/SAR/EGP/JOD/KWD`, `KPI`, `RTL`, `HRIS`, `MFA`, `RBAC`, `SSO`, `API`, performance band labels when used as technical anchors in matrices (we expose Arabic equivalents you supplied: استثنائي / يفوق التوقعات / يحقق التوقعات / دون التوقعات).

## Approach

### 1. Expand the dictionary (`src/lib/i18n.tsx`)
Add ~250 new keys covering every visible string from your glossary, grouped by domain:
- Common: `search_placeholder`, `notifications`, `clear`, `select`, `prev`, `next`, `page_of`, `select_row`, `select_page`, `restricted`, `welcome_back`, `settings_saved`, `insufficient_permissions`, `employee_added`, `auto`, …
- Dashboard: `comp_overview_subtitle`, `payroll_by_department`, `latest_structures`, `grades_count`, `out_of_range_n`, `above_range`, `below_range`, `active_employees`, …
- Structures: `define_grade_ranges`, `range_bands_midpoint_trend`, `start_mid`, `effective`, `archived`, `grade_n`, `name`, `currency`, …
- Employees: `add_employee_title`, `first_name`, `last_name`, `employee_code`, `pick_grade`, `all_departments`, `code`, `compa`, `target_pct`, dept names (engineering/product/hr/finance/marketing/operations/sales), perf ratings (outstanding/exceeds/meets/below), …
- Allowances: full glossary section (housing %, transportation %, mobile fixed monthly, education annual, shift %, hardship %, custom annual, total cash compensation, monthly equivalent, …).
- Bonus: individual / bulk tab, `pick_employee_or_manual`, `target_bonus_pct`, `performance_multiplier`, `business_multiplier`, `individual_modifier`, `proration_factor`, `annual_bonus_estimate`, `monthly_equivalent`, `pct_of_base`, …
- Merit: `merit_subtitle`, `merit_guideline_matrix`, `target_budget`, `actual_budget`, `total_increase`, `new_salary`, `increase_amount`, `increase_pct`, `current`, `band`, …
- Reports: card titles + subtitles per your list.
- Audit: `recent_events_n`, `export_excel`, `audit_search_placeholder`, `all_entities`, `no_audit_events`, `audit_empty_hint`, …
- Settings: `org_defaults_subtitle`, `company_name`, `default_currency`, `appearance`, `light_dark_mode`, `language_helper`, `defaults_helper`, all default bullet points, …
- Auth + landing: hero, features (6 cards), KPIs, footer (privacy/terms/contact).

A small helper `t(key, vars)` for interpolation (e.g. `out_of_range_n` → "خارج النطاق ({count})").

### 2. Replace every hardcoded English string
Pages to edit (all confirmed to contain hardcoded EN):
- `src/components/app-shell.tsx` — search placeholder, aria-labels.
- `src/routes/index.tsx` — landing page (hero, features, KPIs, footer).
- `src/routes/auth.tsx` — toasts + any remaining labels.
- `src/routes/app.index.tsx` — dashboard KPIs, sections.
- `src/routes/app.structures.tsx` — table headers, status badges, "Range bands & midpoint trend".
- `src/routes/app.matrix.tsx` — chart `name="Range"/"Midpoint"`, "Select structure", table headers.
- `src/routes/app.employees.tsx` — Add-employee dialog, all column headers, filters, "Clear", "Restricted", pagination labels, toasts.
- `src/routes/app.employees.$id.tsx` — detail panels.
- `src/routes/app.bonus.tsx` — tab labels, all form fields, result block.
- `src/routes/app.merit.tsx` — matrix headers, Performance \ COMPA-RATIO axes, KPI strip.
- `src/routes/app.allowances.tsx` — every component label per your glossary.
- `src/routes/app.reports.tsx` — card titles, subtitles, captions.
- `src/routes/app.audit.tsx` — header, search, filter, empty state.
- `src/routes/app.settings.tsx` — tabs (Organization/Defaults/Localization), all defaults bullets, fix "English / العربية with RTL" → glossary text.

Seed/demo employee names (Sara Khan, Ahmed Hassan, …) stay as-is — these are personal names, not UI strings.

### 3. RTL correctness pass
- Replace remaining `ml-*/mr-*/left-*/right-*/text-left/text-right` with logical `ms-*/me-*/start-*/end-*/text-start/text-end` in all touched files.
- Sidebar border, dropdown alignment, drawer slide direction: use `border-s/border-e` and `start/end` so mobile drawer slides from the correct side in AR.
- Tables: numeric columns keep `text-end` (numbers stay LTR via `dir="ltr"` wrapper on the cell to avoid currency symbol flipping); text columns use `text-start`.
- Recharts: wrap chart container in `dir="ltr"` (chart geometry must remain LTR; only translate the `name` props for legend/tooltip). This is the standard approach and avoids broken bars.
- Search inputs: icon position swaps automatically with `ms-*` padding on input + `start-*` icon position.
- Dialog/Sheet: shadcn already honors `dir`; verify close-button placement.
- Status badges (`Active`, `Archived`, `above`, `below`): switch to translated strings; styling unchanged.

### 4. Locale-aware formatting
- `fmtCurrency`/`fmtNumber` already accept locale — pass `locale` from `useI18n()` everywhere it's currently hardcoded as `"en"` or omitted.
- Keep currency symbols (USD/SAR/…) as ISO codes — do not localize.

### 5. Toast & system messages
Centralize via `t()`: welcome_back, settings_saved, employee_added, insufficient_permissions, export_done, generic error fallback.

### 6. Fallback rule
`t(key)` already falls back to English if AR missing. Add a dev-only `console.warn` for missing AR keys so future regressions are visible.

## Files to edit
1. `src/lib/i18n.tsx` — major dictionary expansion + interpolation helper.
2. `src/components/app-shell.tsx` — search placeholder, aria-labels, logical spacing.
3. `src/routes/index.tsx`
4. `src/routes/auth.tsx`
5. `src/routes/app.index.tsx`
6. `src/routes/app.structures.tsx`
7. `src/routes/app.matrix.tsx`
8. `src/routes/app.employees.tsx`
9. `src/routes/app.employees.$id.tsx`
10. `src/routes/app.bonus.tsx`
11. `src/routes/app.merit.tsx`
12. `src/routes/app.allowances.tsx`
13. `src/routes/app.reports.tsx`
14. `src/routes/app.audit.tsx`
15. `src/routes/app.settings.tsx`

No DB or schema changes. No business-logic changes. No renaming of brand or technical identifiers.

## Sample before/after (Arabic)
- `"Compensation overview at a glance"` → `"نظرة عامة سريعة على التعويضات"`
- `"English / العربية with RTL"` → `"الإنجليزية / العربية (من اليمين إلى اليسار)"`
- `"Add employee"` (dialog title) → `"إضافة موظف"`
- `"Search by name or code"` → `"ابحث بالاسم أو الرمز"`
- `Bar name="Range"` → `name={t("range")}` → `"النطاق"`
- `toast.success("Settings saved")` → `toast.success(t("settings_saved"))` → `"تم حفظ الإعدادات"`
- `"Performance \ COMPA-RATIO"` → `"الأداء \\ COMPA-RATIO"` (COMPA-RATIO preserved)

## Deliverable
Approve this plan and I'll implement all 15 file edits in one pass, then provide a short changelog with the file list and key before/after samples.
