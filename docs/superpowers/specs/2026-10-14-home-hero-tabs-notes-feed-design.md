# Home Hero, Tabs & Notes Feed — Design

Date: 2026-10-14
Status: Approved by owner (visual companion + terminal)
Scope: Home page restructure, hero editing, thoughts/writings tabs, notes feed restyle

## Goal

Replace the current static home page with an owner-editable, app-like home: a personal statement hero, a featured spotlight strip, swipeable Thoughts/Writings tabs, the existing recent-activity feed, and an Explore strip. Notes become feed-first ("short thoughts", Substack/Twitter-LinkedIn feel) instead of writing-like cards.

The owner must be able to change hero content — and later re-arrange it — from admin without code changes.

## Decisions (owner-confirmed)

1. Hero flexibility: **structured fields, evolvable** (not blocks/templates/freeform yet).
2. Hero storage: **single `home_hero` JSON setting** (no schema churn for future fields).
3. Thoughts/Writings presentation: **true tabs with swipe** (social-media pattern), admin-choosable default tab.
4. Home section order: hero → Featured strip → tabs → Recent activity → Explore → social links.
5. Featured strip: ≤3 mixed cards (up to 2 featured articles + 1 featured project; recency-ordered; hides when empty).
6. Notes feed item: **editorial stream** (date label, title link, full body inline, tag chips, hairline dividers; no per-item avatars).
7. Explore strip: **app tiles** (icon, label, live count, static default hint).
8. Hero arrangement: **Statement** (avatar row → headline "Hey, I'm Timadey." → role@company chip with subtle logo → status line).

## 1. Data & admin

### 1.1 `home_hero` JSON setting

Stored via the existing `settings` table, key `home_hero`, JSON object. Read through a typed DTO (`App\Support\HomeHero`) that merges stored values over defaults:

```json
{
  "headline": "Hey, I'm Timadey.",
  "role": "Design Engineer",
  "company": "Striped",
  "company_url": "https://example.com",
  "status": "Currently rebuilding the billing editor…",
  "avatar_path": "hero/ab12….jpg",
  "logo_path": "hero/cd34….png",
  "first_tab": "thoughts"
}
```

- All fields optional. Blank `headline` → default string. Blank `role`/`company`/`status` → line hidden. Missing avatar → initials circle fallback (up to 2 letters from `site_title`). Company chip shows the company name whenever `company` is set; the logo renders inside the chip only when `logo_path` exists.
- `first_tab`: `'thoughts' | 'writings'`, default `'thoughts'`.
- Future evolution (e.g. `blocks[]`) merges into the same JSON — no migrations.

### 1.2 Uploads

- Avatar + company logo file inputs on the Settings page; stored on `public` disk under `storage/app/public/hero/` with hashed filenames.
- Validation: `image` + `mimes:jpeg,png,webp,gif` + `max:5120` (≤5 MB). Served via `storage:link` as static files.
- This lands the file-upload pattern deferred from Phase 1 (cover images); the same rules/flow will be reused there later.
- Removing an upload clears the path (old file deleted via `Storage::delete`).

### 1.3 Admin surface

Extend the existing Settings page (`/admin/settings`) with a **Home** group:

- Avatar preview + upload/clear
- Headline (text)
- Role (text), Company (text), Company URL (url), Company logo upload/clear
- Status (text)
- First tab to show: Thoughts / Writings (segmented control)

No new sidebar section; `EnsureOwner` already gates `/admin/settings`. Settings save keeps the nested `{settings: …}` payload contract.

## 2. Public home page

Order (top → bottom):

1. **Statement hero** (`PublicLayout` container, existing max-w-5xl rhythm)
   - Avatar row: round avatar (≈44 px) or initials circle +, when empty fields hide
   - Headline: `h1`, editable text
   - Work line: `role at` + company chip (name + subtle ≤16 px logo, hairline border, linked when `company_url` set)
   - Status: muted single paragraph
2. **Featured strip** — `featured` articles + `featured` projects (flags exist):
   - Cap: ≤2 articles + ≤1 project when both types exist; ≤3 of a single type otherwise; recency-ordered
   - Cards: existing card styles + type badge (Writing/Project); section hidden entirely when empty
3. **Tabs** — see §3
4. **Recent activity** — unchanged (`FeedService::recent()`)
5. **Explore tiles** — three tiles (Projects · Now · Stacks & tools):
   - Icon + label + live count (projects count, collected count; Now has no count) + static hint text
   - Links: `/projects`, `/now`, `/collected`
6. **Social links** — unchanged

SEO: home `og:image` + `Person` JSON-LD `image` use the avatar URL when set (`app/Support/Seo.php`).

## 3. Tabs (Thoughts ⇄ Writings)

- Tab bar: two tabs; active tab underlined (design-system link blue); click switches.
- Swipe: horizontal touch drag switches panels (CSS scroll-snap track or transform slider — implementation detail; must not break vertical scrolling on the page).
- Default tab from `home_hero.first_tab`; after a manual switch, the choice is remembered for the session (component state — no cookie needed).
- Panels each show 5 items + "View all …" link (`/notes`, `/writing`).
- **Thoughts panel**: editorial feed items — date label (uppercase meta), title link, **full body inline** rendered from the stored `body_html` in a lightweight prose wrapper (no reading-time/meta chrome), tag chips, hairline dividers, no avatars.
- **Writings panel**: existing writing-card pattern (MetaLine + title + excerpt).
- Empty panels use `EmptyState`.

## 4. /notes page

- Index restyled to the same editorial feed (date → title link → full body → tags) with existing pagination; keeps `q` search wiring from the QA fixes.
- Note detail pages keep current `Prose` rendering (long notes remain readable).
- Draft/private visibility rules unchanged (owner preview only).

## 5. Component & file touchpoints

- New: `resources/js/Components/home/` (Hero, FeaturedStrip, ContentTabs, NoteFeedItem, ExploreTiles), `App\Support\HomeHero` DTO, Settings Home group fields.
- Modified: `HomeController` (hero DTO, featured composition, tab counts, explore counts), `Admin/SettingsController` (+validation +uploads), `resources/js/Pages/Admin/Settings.tsx`, `resources/js/Pages/Home.tsx`, `resources/js/Pages/Notes/Index.tsx`, `app/Support/Seo.php`.
- Unchanged: note detail, writing pages, activity feed, social links, layout shell.

## 6. Testing

- **Pest**: hero JSON save round-trip; upload validation (type/size) + storage path; `first_tab` honored in home props; featured strip composition + caps + empty-hide; tabs item counts (5 each, only public); notes index feed excludes drafts/private; explore counts correct.
- **Vitest**: `NoteFeedItem` renders date/title/body/tags; `ContentTabs` default tab + click switch.
- **Playwright e2e**: hero renders from settings in browser; admin upload flow; tab click + swipe (touch emulation) switches panel; default-tab honored; view-all links navigate.

## Non-goals (explicit)

- Blocks builder / design-template picker (schema is ready for it; not built now)
- Admin-editable explore hint text (static defaults)
- Cover-image upload for posts/projects (pattern lands here; rollout later)
- Full Inertia SSR
- Follower/engagement chrome on notes (no likes/replies)
