# Employee Profile & Data Model Overhaul

## Goal
Turn the current minimal employee record (modal-based edit) into a full, dedicated profile page backed by a richer data model, with better list controls, custom fields, custom allowances, and a matching Excel import/export.

## 1. Database changes (migration)

**Extend `employees`** with new columns (all nullable except where noted):
- Personal: `phone_number`, `date_of_birth` (date), `nationality`, `gender`
- Employment: `employment_type` (text, e.g. full_time/part_time/contract), `contract_start_date`, `contract_end_date`, `cost_center`, `business_unit`, `manager_id` (uuid → employees.id, ON DELETE SET NULL)
- Compensation: `currency` (text, default org currency), `salary_effective_date` (date)
- (`age` and `years_of_service` are derived in the UI from DOB / hire_date — not stored.)

**New table `employee_custom_allowances`** — flexible per-employee named allowances:
- `id`, `employee_id` (FK cascade), `name` (text), `annual_amount` numeric(14,2), `created_at`
- RLS mirroring `employee_allowances` (org members read; admin/manager/analyst write).

**Extend `employee_allowances`** with `food_amount numeric(14,2) default 0` (housing, transport, mobile, shift, hardship already exist; food is new; `education_amount` stays for backward compat but is hidden in UI in favor of food per request).

**New table `org_custom_field_defs`** — admin-defined custom fields:
- `id`, `organization_id` (FK), `key` (text, unique per org), `label` (text), `field_type` (text: text/number/date), `created_at`
- RLS: org members read; admin/manager write.

**New table `employee_custom_field_values`**:
- `id`, `employee_id` (FK cascade), `field_def_id` (FK cascade), `value_text` (text), unique (employee_id, field_def_id)
- RLS via parent employee org.

Index: `employees(organization_id, employee_code)`, `employees(manager_id)`.

## 2. Routing & UI

**Replace edit modal with dedicated profile route.**
- Repurpose existing `src/routes/app.employees.$id.tsx` (currently a small read-only profile) into the full editable profile page. Sections (cards):
  1. **Header**: avatar initials, full name, code, status badge, manager link, Edit/Save toggle, back to list.
  2. **Personal Info**: first/last name, email, phone, DOB (with auto-computed age shown read-only), nationality, gender.
  3. **Employment Info**: employee_code, department, job_title, job_family, location, cost_center, business_unit, employment_type, employment_status, hire_date, contract_start/end_date, years_of_service (read-only derived), manager (searchable picker → `manager_id`).
  4. **Compensation**: grade picker, base_salary, currency, salary_effective_date, target_bonus_percent, performance_rating, compa_ratio (derived, read-only), range position bar.
  5. **Allowances**: standard fields (housing, transportation, mobile, food, shift, hardship) + dynamic list of custom allowances (add/edit/remove rows with `name` + `annual_amount`). Live totals: Total Allowances, Total Cash Compensation (base + bonus + allowances).
  6. **Custom Fields**: render all org-defined custom fields with appropriate inputs.

- Edit mode: single page-level "Edit" button toggles all sections to editable; "Save" persists everything atomically (employee row + allowances row + custom allowances diff + custom field values upsert). Cancel reverts.

- In `src/routes/app.employees.tsx`, change row click and the existing pencil button to navigate to `/app/employees/$id` instead of opening the edit dialog. Keep the lightweight "Add employee" dialog for creation only (or also route to the profile in a "new" mode — see open question).

## 3. Employees list improvements (`app.employees.tsx`)

- Search input matches `employee_code` OR `full_name` (already partial; ensure both).
- Filter dropdowns: department, grade, location, employment_status (multi or single select).
- Column visibility toggle (popover with checkboxes), persisted in localStorage per org.
- Default visible columns: name, code, department, job_title, grade, base_salary, compa_ratio.

## 4. Excel import/export (`src/lib/excel.ts` + employees route handlers)

**Template + import**:
- Add columns for every new standard field above plus `housing_allowance, transportation_allowance, mobile_allowance, food_allowance, shift_allowance, hardship_allowance`.
- Any unknown column whose header ends in `_allowance` (or doesn't match a known field) is treated as a **custom allowance**: header = name, value = annual_amount, written to `employee_custom_allowances`.
- Org-defined custom fields appear as columns using their `key`; values written to `employee_custom_field_values`.
- Update bilingual instructions sheet (EN + AR) listing all new columns and the custom-allowance/custom-field rules.

**Export**:
- Pull every field from `employees`, `employee_allowances`, `employee_custom_allowances`, and `employee_custom_field_values` and emit one row per employee with all standard + custom columns. Mirror the import schema so round-trip works.

## 5. Settings — custom field admin

Add a small "Custom employee fields" section under `app.settings.tsx` (admin only) to create/rename/delete entries in `org_custom_field_defs`. Used by the profile page and import/export.

## 6. i18n

Add EN/AR strings for all new labels, sections, allowance names, and validation messages in `src/lib/i18n.tsx`.

## Files touched (estimate)

- New migration under `supabase/migrations/`.
- Edit: `src/routes/app.employees.tsx` (remove edit dialog body, add filters/column toggle, link rows to profile).
- Rewrite: `src/routes/app.employees.$id.tsx` (full profile w/ edit mode + sections).
- Edit: `src/lib/excel.ts` (template, import parser, export builder).
- Edit: `src/routes/app.settings.tsx` (custom fields admin).
- Edit: `src/lib/i18n.tsx` (translations).
- Possibly small helpers in `src/lib/comp.ts` (age, years_of_service, totals).

## Open questions

1. For "Add employee", keep the current quick-add dialog with only required fields and then redirect to the new profile for the rest, or replace it with a full "new employee" page too?
2. `direct_manager_id` — should it strictly point to another employee in the same org (picker only), or also allow free-text `manager_name` fallback for imports where the manager doesn't exist yet?
3. Custom allowances on import: treat **any** unrecognized column as a custom allowance, or only those matching a naming convention (e.g. ending in `_allowance` / under an "Allowances:" prefix)? Latter is safer against typos in standard headers.
4. Should the salary edit on this new profile still go through the existing **salary-change approval workflow** when policy is enabled (same as today), or bypass it on the profile? Recommend: keep approval flow.

Once you confirm these I can implement in one pass.
