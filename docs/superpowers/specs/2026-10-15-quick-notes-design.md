# Quick Notes (title-less microblog) — Design

Date: 2026-10-15
Status: Approved

## Goal

Notes should be writable "in a breeze" — no title friction — and displayed like a
Twitter/Substack-style stream (cf. Brian Lovin's TIL), not like titled blog articles.
Chosen approach: **evolve the existing `posts` model** (Approach A). No new table,
no data migration, no re-plumbing of tags/search/feeds.

## Confirmed decisions

1. **Composer:** a dedicated quick composer (textarea + optional one-line title + tags).
2. **Public display:** stream index; note permalink pages **do** exist (`/notes/{slug}`).
3. **Titles:** optional. Composer has a one-line optional title field (Substack-style).
   Existing titled notes keep their titles, shown as a small heading.
4. **Composer contents:** textarea (markdown) + optional title + tags; live preview;
   Save draft / Publish with `Cmd+Enter`. **No autosave.**
5. **Stream density:** truncate at ~280 chars with **"Read on"** that expands the full
   text **inline** (does not navigate).
6. **Permalink access:** a subtle **copy-link** button per note (copies the
   **absolute** URL `{APP_URL}/notes/{slug}`; "Copied!" flash). Date is plain text,
   not a link.
7. **Admin location:** new **"Notes"** admin section (sidebar item → list → composer
   at `/admin/notes/new`).
8. **FAB:** a bottom-right floating `+` button on **every admin screen** opens a
   right-side drawer containing the same quick composer. The full page remains for
   focused writing and editing.

## 1. Data & backend

- **Migration:** `posts.title` becomes `nullable`. `slug` stays `NOT NULL` (unique).
  No row changes.
- **Validation** (`StorePostRequest`): title `required` for `article`/`question`,
  `nullable` for `note` (conditional rule in `rules()`).
- **Slug fallback:** `title` → else first line of body limited to ~8 words / 40
  chars (short, readable permalinks; `2026_10_15_000002` backfills older long
  title-less slugs) → else `note`. `HasSlug::makeSlug()` collision handling unchanged.
- **Snippet helper:** `Post::titleOrSnippet(): string` — title if set, else ~60-char
  plain-text of body. Used at **every title consumer**: activity feed rows,
  RSS item titles, SEO `<title>`/description, admin lists, search result labels.
- **New admin endpoints** (`App\Http\Controllers\Admin\NoteController`, distinct from
  the existing public `App\Http\Controllers\NoteController`):
  - `GET /admin/notes` — list notes (snippet, date, status)
  - `GET /admin/notes/new` — quick composer (create)
  - `GET /admin/notes/{post}/edit` — same composer (edit)
  - `POST /admin/notes` — store
  - `PUT /admin/notes/{post}` — update
- Delete stays in the Posts editor (scope control).

## 2. Quick composer (admin)

- Sidebar gains a **Notes** item → note list; row click → edit; "New note" → composer.
- Composer fields only: optional title input, big autofocused markdown textarea with
  live preview, tags input (existing tags pattern), **Save draft** / **Publish**
  buttons, `Cmd+Enter` publishes. No slug/excerpt/cover/SEO/topics on this screen.
- **FAB drawer:** circular `+` fixed bottom-right on all admin screens; opens a
  right-side slide-over containing the identical composer (create mode), reusable
  component shared with the full page. Preview is hidden in the drawer (too narrow);
  typing happens fullscreen-ish in the drawer's textarea.

## 3. Public display (/notes stream)

- `NoteFeedItem` renders: small-caps date (plain text) → optional title (small
  heading) → truncated plain-text teaser (~280 chars, word boundary + `…`) →
  **"Read on"** toggle expanding full rendered markdown in place → tags as quiet
  `·`-separated text → copy-link icon button with "Copied!" feedback.
- **Truncation is server-side:** strip markdown to plain text, cut at word boundary
  (never mid-markdown-token), append `…`. Payload: `excerpt_text` + `body_html`.
- Search (`q` title/body), tag filter, pagination (15/page), empty state unchanged.
- **Permalink** `/notes/{slug}`: body-first page (date, title only if present, full
  body, tags, copy-link). Page `<h1>` = title, else the first ~60-char snippet (so
  there is always exactly one visible `<h1>`). SEO title/description fall back to
  `titleOrSnippet()`.

## 4. Ripple fixes

All title consumers switch to `titleOrSnippet()` where a fallback is needed:
activity feed (`FeedService`), RSS, `Seo::notesShow`, admin lists, search results.
`LOWER(title) LIKE ?` search on nullable title is safe (NULL is falsy in SQL, OR-body
still matches).

## 5. Testing

- **Pest:** create+publish note with no title via composer endpoint; article without
  title still rejected; slug fallback from body; `titleOrSnippet()` in activity feed
  and SEO; `/notes` renders a titleless note.
- **Vitest:** teaser truncate → Read on expands; copy-link feedback; composer
  component basics.
- **Playwright:** FAB → drawer → type → publish → appears in `/notes` stream; expand
  Read on; copy link; existing notes specs re-verified; admin workflow specs updated
  for the new sidebar item.

## Out of scope

- Autosave, note images, reactions/comments, separate `notes` table,
  public-site composer, deleting from the Notes section.
