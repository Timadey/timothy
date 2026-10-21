# Notes feed redesign — design

**Date:** 2026-10-20
**Status:** Approved (approach A, 280-char teaser, inline expand)

## 1. Goals & scope

- Redesign the public notes list (`/notes`) so it stops looking like a Writing duplicate. Feed-style: meta line (date + tags) above body text, no headlines, no dividers.
- Each note shows a 280-char plain-text teaser with "read more" appended inline. Clicking expands the full formatted markdown body in place via `<Prose>`.
- Permalinks (`/notes/{slug}`) stay untouched — the headline is simply not shown in the feed. The permalink is still the shareable URL.
- Out of scope: admin notes, QuickComposer, API (`/api/notes`), RSS, sitemap, nav entry, `PostRow` component (Writing still uses it), search/filter/pagination mechanics.

## 2. Decisions

- **Feed, not rows:** new `NoteFeedItem` component replaces `PostRow` in `Notes/Index.tsx`. No headline `<Link>` — the body text is the content. Date + tags on a small `MetaLine` above the body.
- **Client-side expand (approach A):** `NoteController::index` adds `body_html` (rendered markdown) to each note's payload alongside the existing `teaser`. Component shows teaser + "read more" button; click swaps in `<Prose html={body_html}>`. No fetch, no loading state.
- **Teaser stays 280 chars** — `streamTeaser(280)` is unchanged; no server truncation change needed.
- **"Read more" is a `<button>`, not a `<Link>`** — it's an inline expand, not navigation. Styled as a subtle text button matching the link color.
- **Expansion state:** one `expanded` boolean per note (local component state). Once expanded, the note stays expanded (no collapse toggle — YAGNI).
- **Permalink preserved:** the expanded body includes a small "permalink" affordance? No — YAGNI. Users can still reach the permalink via the URL bar or sitemap. The feed is the experience.

## 3. Architecture / files

| Area | Files |
|------|-------|
| Controller | `app/Http/Controllers/NoteController.php` — add `body_html` to `index()` payload (line ~30) |
| Page | `resources/js/Pages/Notes/Index.tsx` — replace PostRow loop with NoteFeedItem loop |
| Component | create `resources/js/Components/NoteFeedItem.tsx` — meta line + teaser/expand |
| Tests | vitest: new `NoteFeedItem.test.tsx`; update `quick-note.spec.ts` (inline expand instead of click-through) |

## 4. Test plan (TDD — RED watched first)

**Vitest**
1. `NoteFeedItem`: renders teaser + "read more" button; clicking swaps to full body HTML; "read more" button disappears after expand.
2. `NoteFeedItem`: short notes (under 280 chars) render without "read more" button.
3. `NoteFeedItem`: meta line shows date and tags.

**Pest**
- Update `NoteSnippetTest` `exposes headline and teaser in the notes stream payload` — assert `body_html` is present in the payload (new field).
- All other existing Pest tests pass unchanged (teaser still ≤281, permalinks intact).

**Playwright**
- Update `quick-note.spec.ts` test 1: instead of clicking through to `/notes/{slug}`, click "read more" on the index and assert the full body appears inline.
- `public-render.spec.ts` `note detail renders at 1440px` stays (permalink still exists).
- `search-filter.spec.ts` notes tag filter: update row locator if needed (still `main article` or equivalent).

## 5. Risks / accepted tradeoffs

- Index payload grows (body_html per note) — accepted: notes are short, 15 per page, already a small payload.
- No collapse toggle once expanded — accepted as YAGNI; users can reload.
- `quick-note.spec.ts` test 1 changes from click-through to inline expand — the permalink assertion moves to `public-render.spec.ts` which already covers it.
