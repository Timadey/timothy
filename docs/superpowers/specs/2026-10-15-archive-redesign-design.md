# Archive Pages Redesign — Notes & Writing

- **Date:** 2026-10-15
- **Status:** Approved design (Option A); awaiting spec review
- **Supersedes:** the stream-interaction decision (inline "Read on" expand) in `docs/superpowers/specs/2026-10-15-quick-notes-design.md`. All other quick-notes decisions stand.

## Background

Design/product critique of `/notes` and `/writing` found:

1. Title-less notes had no permalink affordance in the archive (body not a link; "Read on" only expanded inline).
2. Per-row "Copy link" cluttered every row on both archives.
3. `/writing` pinned `featured` posts above newer posts and rendered a low-signal "FEATURED" word; the homepage favourites strip already owns that job.
4. `/writing` titles were always blue while the homepage writing list used ink→blue-on-hover — two systems for one pattern.
5. `--color-meta: #86868b` fails WCAG AA (3.6:1) on white for normal-size text.
6. Notes and Writing rows had different anatomy (text-lg vs text-xl, tags line vs topics line).
7. A filter bar with a single option (QA DB: one tag) looks unfinished.

**Decision A (chosen in visual companion):** every stream row becomes a *click-through headline row* — meta line → headline link → teaser. No "Read on", no "Copy link" on any archive row.

## Detailed changes

### Backend

**`app/Models/Post.php`** — two new helpers:

- `streamHeadline(int $limit = 90): string`
  - If `title` is non-empty → return title uncut.
  - Else `cut(plainBody(), $limit)` (word-boundary + `…`).
  - Else `'Untitled'`.
- `streamTeaser(int $limit = 280): string`
  - Base: `plainExcerpt($limit)`.
  - If title is empty and `base` starts with the headline prefix (headline minus a trailing `…`), strip that prefix and trim the remainder; empty remainder → `''`.
  - If title present → base unchanged.

**`app/Http/Controllers/NoteController.php`**

- `index()`: each note payload = `{ slug, headline, teaser, date, tags }`. Remove `body_html`, `excerpt_text`, `title` from the index payload (no longer rendered).
- `show()`: replace `snippet` with `headline` = `streamHeadline(90)`; keep `body_html`.
- `Pages/Notes/Show.tsx`: `<h1>` fallback reads `headline` instead of `snippet` (title still wins when present).
- `Seo::notesShow` / `SeoController` references to the show snippet switch to `streamHeadline` — same content source, no SEO behavior change beyond the 60→90 headline length.

**`app/Http/Controllers/WritingController.php`**

- Remove `orderByDesc('featured')` — pure `latest('published_at')` chronology.

### Frontend

**New `resources/js/Components/PostRow.tsx`** — the single row component for Notes, Writing, and the homepage writing list:

- Props: `{ href, headline, meta: ReactNode, excerpt?: string | null }`.
- Markup: `<article className="py-6">` → `meta` → `<h3 className="mt-1 text-xl font-semibold tracking-tight">` → `<Link className="text-ink hover:text-link">headline</Link>` → optional `<p className="mt-2 text-[15px] leading-relaxed text-meta">excerpt</p>`.
- No buttons of any kind.

**Modified pages**

- `Pages/Notes/Index.tsx`: rows → `PostRow` with `MetaLine(date)` + `headline`/`teaser` from payload.
- `Pages/Writing/Index.tsx`: rows → `PostRow`; meta line = `MetaLine(date, readingTime, topics)` — topics folded into the meta line (appended `· Topic` items, same uppercase style); no "FEATURED" word; no separate topics line.
- `Components/home/WritingList.tsx`: rows → `PostRow` (keeps `py-6` rhythm; excerpts `text-meta`).
- `Components/MetaLine.tsx`: add optional `topics?: string[]`; drop the `Featured` type branch if no caller passes it after this change.
- `Components/FilterBar.tsx`: return `null` when `options.length <= 1`.
- `Components/home/NoteFeedItem.tsx`: **delete** (fully replaced by `PostRow`).

**Tokens**

- `resources/css/app.css`: `--color-meta: #86868b` → `#6e6e73` (5.0:1 on white).

**Kept intentionally**

- `CopyLinkButton` on the note permalink page (`Notes/Show.tsx`) — copy-link lives only there.
- Homepage favourites strip, featured *selection* on the homepage — only the archive pinning/word is removed.

### Tests

- `tests/Feature/NoteSnippetTest.php`: assert index payload carries `headline` (title-less → first ~90 chars, word-boundary; titled → exact title) and that `teaser` does not repeat the headline prefix; drop `excerpt_text`/`body_html` index assertions.
- Vitest: replace `NoteFeedItem.test.tsx` with `PostRow.test.tsx` (headline renders as link with correct href, `text-ink hover:text-link`, teaser renders, **zero** buttons); fix `HomeSections.test.tsx` fixture if it feeds removed fields.
- `e2e/quick-note.spec.ts` drawer test: replace the "Read on / Show less / Copy link / clipboard" block with: click the note headline → assert landing on `/notes/{slug}` and the body visible there.
- Unchanged and must stay green: `e2e/search-filter.spec.ts` (QA DB has ≥2 tags so chips still render), `e2e/public-render.spec.ts`.

### Verification gates

`./vendor/bin/pest`, `npm test`, `npx tsc --noEmit`, `npm run build`, `npx playwright test` — all green.

## Out of scope (follow-ups, not this pass)

- Content hygiene: QA junk articles/notes, duplicate "Gender Wars" rows on dev, `DemoContentSeeder` title = first body line.
- Homepage hero typo ("possibilites") and favourites-card date alignment.
- Notes count / month grouping ideas.
