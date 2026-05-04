## Goal

Solve cross-company data variance during employee import (different grade codes like S1/L2/Band-3, different performance labels like "Outstanding"/"5"/"ممتاز") by enriching the downloadable template with **mapping sheets and instructions** in both Arabic and English, and add a dedicated bilingual **Help & Support** page that walks users through the import process.

---

## Part 1 — Enhanced Employee Template (`src/lib/excel.ts`)

Rewrite `downloadEmployeeTemplate()` so the workbook contains **6 sheets** instead of 1:

1. **Employees / الموظفون** — main data sheet (current columns) with two extra columns:
   - `company_grade` (free text — the company's own code, e.g. `S1`, `Band-3`, `L2`)
   - `mapped_grade` (the normalized code the app uses, e.g. `G01`…`G15`)
   - `company_rating` (free text — company's own label)
   - `mapped_rating` (one of: Outstanding, Exceeds, Meets, Below, Unsatisfactory)

2. **Grade Mapping / مطابقة الدرجات** — two-column table:
   ```
   company_grade | app_grade
   S1            | G01
   S2            | G02
   Band-A        | G03
   ...
   ```
   The user fills the left side with their internal codes; the right side uses our standard `G01…G15`. Import will use this table to translate `company_grade` → `mapped_grade` automatically when `mapped_grade` is blank.

3. **Performance Mapping / مطابقة التقييم** — two-column table with pre-filled common variants:
   ```
   company_rating       | app_rating
   5 / Outstanding / ممتاز  | Outstanding
   4 / Exceeds / يفوق       | Exceeds
   3 / Meets / يحقق         | Meets
   2 / Below / دون          | Below
   1 / Unsatisfactory       | Unsatisfactory
   ```

4. **Instructions (EN)** — step-by-step English guide: required vs optional columns, allowed values, date format (`YYYY-MM-DD`), currency rules, how the two mapping sheets work, common errors.

5. **التعليمات (AR)** — same guide in Arabic with RTL-friendly layout.

6. **Reference Values / القيم المرجعية** — list of valid `app_grade` values (G01–G15), valid `app_rating` values, supported currencies, expected department/location format.

### Import logic update (`src/routes/app.employees.tsx` → `handleImportFile`)

- Read all sheets via `XLSX.read` (extend `parseXLSX` to return `{ employees, gradeMap, ratingMap }`).
- Build two lookup maps from the mapping sheets.
- For each employee row:
  - If `mapped_grade` empty but `company_grade` present → look up in grade map.
  - If `mapped_rating` empty but `company_rating` present → look up in rating map.
  - Fall back to existing behaviour (`grade_code`, `performance_rating` columns) for backward compatibility.
- After insert, call existing `autoAssignGrades()` to link employees to the active salary structure.
- Toast a summary: `X imported, Y unmapped grades, Z unmapped ratings` and list the unmapped values so the user can fix the mapping sheet and re-upload.

---

## Part 2 — Help & Support Page

New route `src/routes/app.help.tsx` (path `/app/help`) — bilingual, follows existing app shell.

### Sections

1. **Hero**: "Help & Support / الدعم والمساندة" with quick search box (filters guides client-side).
2. **Quick start cards** (4): Upload employees · Build salary structure · Run merit cycle · Run bonus cycle. Each card opens an accordion with step-by-step instructions and a "Start tour" button that triggers the existing `GuidedTour` for that goal.
3. **Detailed guide: "How to import your employee file"** — the priority guide for this release:
   - Download the template (button → `downloadEmployeeTemplate()`)
   - Fill the Employees sheet
   - Open the **Grade Mapping** sheet and translate your internal codes to G01–G15
   - Open the **Performance Mapping** sheet and translate your rating labels
   - Upload the file on the Employees page
   - Review the import summary and fix any unmapped rows
   - Each step has a screenshot placeholder slot and an inline tip box.
4. **FAQ accordion** — 6–8 entries (grade count limits, what if our scale has 20 grades, can we re-import, what happens to existing employees, etc.).
5. **Contact box** — link to existing `contact_messages` form / email link, plus link to start the onboarding wizard again (`/app/onboarding`).

### Wiring

- Add nav entry "Help & Support / الدعم والمساندة" in `src/components/app-shell.tsx` sidebar (with `HelpCircle` icon).
- Add all new strings to `src/lib/i18n.tsx` (EN + AR keys: `help_title`, `help_quick_start`, `help_import_guide_*`, `help_faq_*`, `help_contact`, plus mapping-sheet column names and instruction copy).
- Page respects `dir="rtl"` and current theme; uses existing `Card`, `Accordion`, `Button` components.

---

## Part 3 — Files Touched

**New**
- `src/routes/app.help.tsx`

**Modified**
- `src/lib/excel.ts` — rewrite `downloadEmployeeTemplate()`, extend `parseXLSX()` to return mapping sheets
- `src/routes/app.employees.tsx` — use new mapping logic in `handleImportFile`, surface unmapped-rows summary
- `src/components/app-shell.tsx` — add Help nav item
- `src/lib/i18n.tsx` — add EN + AR translations for template instructions and the help page
- `src/routeTree.gen.ts` — auto-regenerated

No DB migration required.

---

## Part 4 — Out of scope (for later)

- Video tutorials (placeholder slots only)
- Per-organization custom mapping persisted in DB (current cycle uses per-file mapping sheet)
- Auto-detection of grade count from the user's mapping sheet to suggest a structure size
