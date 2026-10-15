# Single rich-text About page — design

**Date:** 2026-10-15
**Status:** Approved (design presented in chat; user: "approved")

## 1. Goals & scope

- Replace the multi-section markdown About admin (6 titled cards, visibility
  toggles, markdown textareas) with **one rich-text body** edited via the same
  `RichEditor` used for Posts and Projects (style C: slim top bar + floating
  formatting, image upload included).
- Content starts fresh (user verified: dev DB holds only demo placeholder text;
  user chose "start fresh, empty editor").
- Out of scope: Now page (same pattern, deferred to "other later"), Collected,
  any visual redesign of the public `/about` layout, SEO changes.

## 2. Decisions

- **Storage:** a single `about_body` row in the existing `settings` table
  (alongside `contact_email`, `home_statement`). Value = sanitized HTML.
  No new tables. User picked this over a generic `pages` table (YAGNI) and over
  reusing `about_sections` (meaningless columns).
- **Removals:** `about_sections` table, `AboutSection` model, the About block in
  `DemoContentSeeder`, and all controller/page references. Fresh installs seed
  no About content → public page shows its existing empty state.
- **Public render:** `AboutController` passes `body_html => (string)
  Setting::get('about_body')`; `Pages/About.tsx` renders it in `<Prose>` where
  the sections loop was (social links, contact email, meta tags unchanged).
- **Admin:** `Admin/About.tsx` becomes one form — label + `RichEditor` + Save
  (Projects/Edit pattern). Validation via new `StoreAboutRequest`:
  `body => nullable|string|max:500000` plus `prepareForValidation()` running
  `HtmlSanitizer::sanitize(body)` (same allowlist as posts/projects — `<script>`,
  handlers, foreign images → 422 `errors.body` under the editor).
- **Images:** unchanged pipeline — `POST /admin/uploads`, allowlisted
  `/storage/uploads/…` src, works on the About page like everywhere else.

## 3. Architecture / files

| Area | Files |
|------|-------|
| Migration | `2026_10_15_000004_drop_about_sections.php` (drop table; `down()` recreates schema) |
| Model | delete `app/Models/AboutSection.php` |
| Public | `AboutController.php` (setting → `body_html`), `Pages/About.tsx` (single `Prose`) |
| Admin | `Admin/AboutController.php` (edit/update via setting), `Pages/Admin/About.tsx` (RichEditor), new `StoreAboutRequest.php` |
| Seeders | `DemoContentSeeder.php` (About block removed) |
| Tests | `AboutNowTest.php`, `AdminSiteContentTest.php`, `SeedersTest.php` updated; new `Admin/AboutRichEditorTest.php` page wiring (vitest) |

## 4. Test plan (TDD — RED watched first)

**Pest**
1. Public `/about` returns the stored HTML body verbatim
   (`Setting::set('about_body', '<p>Hello <strong>world</strong></p>')` →
   `assertInertia` `body_html` contains `<strong>`).
2. Public `/about` with no `about_body` → empty state (existing "Nothing here
   yet." path).
3. Admin `PUT /admin/about` stores a clean HTML body into settings.
4. Admin `PUT /admin/about` with `<script>` or foreign `<img src>` → 422
   `errors.body`.
5. Seeder test: default seeds cover Now only — no About sections; model import
   removed.

**Vitest**
- `Admin/About` renders `RichEditor` with the stored body and a Save button
  (Inertia mocked, pattern `QuickComposer.test.tsx`).

**Playwright**
- Existing `admin-workflow` section crawl visits `/admin/about` and asserts form
  fields — the editor's style `select` satisfies it. No new e2e unless it fails.

## 5. Risks / accepted tradeoffs

- Dropping `about_sections` is irreversible for real content — accepted: only
  demo rows exist, user chose start-fresh (app not live).
- Per-section visibility toggles are gone — accepted as unnecessary for a
  one-page About.
- `about_body` starts empty → public page shows empty state until first save.
