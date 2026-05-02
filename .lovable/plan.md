# Plan: Light-mode sidebar fix + Public blog + CSV blog import

## 1. Fix admin sidebar text in light mode

**Problem:** In `src/components/admin/admin-shell.tsx` the sidebar uses `bg-sidebar text-sidebar-foreground`. The dark navy background renders in both themes, but in light mode the `text-sidebar-foreground` token resolves to a dark color → invisible text (as shown in screenshot).

**Fix:** Force readable foreground tokens on the admin sidebar regardless of theme. Replace `bg-sidebar text-sidebar-foreground` with explicit dark-surface classes (`bg-slate-900 text-slate-100` + `border-slate-800`, hover `hover:bg-slate-800`, active `bg-slate-800 text-white`). Apply same to mobile drawer and the "Super Admin" header block. This guarantees high contrast in both themes and matches the intended dark-navy admin look.

## 2. Public blog pages (reader-facing)

Create two new TanStack routes (open to all visitors, no auth required):

**`src/routes/blog.tsx`** — Blog index
- Fetches `blog_posts` where `status = 'published'` and `publish_at <= now()`, ordered by `publish_at desc`.
- Hero header with site title + tagline.
- Featured post card (if `is_featured`) — large cover, title, excerpt, read time.
- Grid of post cards: cover image, category chip, title, excerpt, author/date, estimated reading time (computed from `content` word count ÷ 200 wpm).
- Search input + category filter (client-side).
- Bottom CTA section: "Start using Total Reward" → links to `/auth`.
- Bilingual (EN/AR) labels via existing `useI18n`.

**`src/routes/blog.$slug.tsx`** — Single post
- Fetches post by `slug`.
- Sticky **reading progress bar** at top (scroll-percentage indicator).
- Hero: featured image, category, title, excerpt, author, publish date, reading time.
- Markdown body rendered with `react-markdown` + `remark-gfm` (bold, italic, lists, tables, code blocks, blockquotes, headings, links, images). Tailwind `prose` typography with dark-mode variant.
- Auto-generated **Table of Contents** sidebar (sticky on desktop) from H2/H3 headings.
- Share buttons (X, LinkedIn, copy link).
- "Related posts" section (3 most recent posts in same category, excluding current).
- Bottom **CTA card**: gradient banner "Subscribe / Start free trial" → `/auth`.
- `head()` with SEO meta (`seo_title`, `seo_description`, `og:image` from `featured_image_url`).
- 404 state if slug not found / not published.

**Dependencies to add:** `react-markdown`, `remark-gfm`.

**Header link:** add "Blog" link in the public landing header (`src/routes/index.tsx`) so visitors can reach `/blog`.

## 3. CSV import on admin blog page

In `src/routes/admin.blog.tsx`:
- Add **"Import CSV"** button next to "New post".
- Add **"Download template"** button that emits a sample CSV with headers:
  `title, slug, excerpt, content, status, publish_at, is_featured, seo_title, seo_description, featured_image_url, featured_image_alt, category_slug`
- File input → parse CSV with `papaparse` (already common; add if missing).
- Validate rows (require `title` + `slug`; default `status=draft`, `is_featured=false`).
- Bulk `insert` into `blog_posts`. Show toast with success / error counts. On finish, reload the table.
- Skip rows where slug already exists (pre-fetch existing slugs and warn).

**Dependency to add:** `papaparse` + `@types/papaparse`.

## Technical notes

- No DB migration required — `blog_posts` table already exists with all needed columns.
- Public blog routes do not use `AdminShell` or `AppShell`; they get a lightweight reader layout (header with logo + nav, footer with CTA).
- RLS on `blog_posts` already allows public `select` on published rows (verify in migration; if not, add a public read policy for `status='published' AND publish_at<=now()`).
- Reading time helper: `Math.max(1, Math.ceil(wordCount / 200))` minutes.
- Reading progress: `useEffect` listener on `scroll`, computes `(scrollY / (scrollHeight - innerHeight)) * 100`, sets a fixed `<div>` width.

## Files

**New**
- `src/routes/blog.tsx`
- `src/routes/blog.$slug.tsx`
- `src/components/blog/reading-progress.tsx`
- `src/components/blog/post-card.tsx`

**Edited**
- `src/components/admin/admin-shell.tsx` — sidebar contrast fix
- `src/routes/admin.blog.tsx` — CSV import + template download
- `src/routes/index.tsx` — add Blog link in nav
- `package.json` — add `react-markdown`, `remark-gfm`, `papaparse`, `@types/papaparse`
- Possibly new migration if public-read RLS for blog is missing.
