# Rich editor (Posts + Projects) — design

**Date:** 2026-10-15
**Status:** Approved (design presented in chat; user: "proceed")

## 1. Goals & scope

- Replace markdown-in-textareas with a **Tiptap rich editor** in:
  - Admin → Posts (create + edit, shared `Admin/Posts/Edit.tsx`, `body` field)
  - Admin → Projects (create + edit, shared `Admin/Projects/Edit.tsx`, `description` field)
- **Images**: server upload endpoint + insert via toolbar button, drag-drop, or paste.
- **Interaction style C** (user's pick, visual companion): slim top bar with
  insertion tools (heading toggle, Link, Image) + floating BubbleMenu text
  formatting (B / I / U / quote / code / link) on selection.
- Explicitly out of scope for this pass (still markdown, "other later"):
  Notes composer (drawer + full page), About, Now, Collected.
- No image resizing/derivative generation (≤5MB originals for now).

## 2. Decisions

- **Storage format: HTML.** The app is not live (user), so a one-time conversion
  is safe: every existing **article** body and **project** description is
  rendered through the same `MarkdownService` pipeline readers see today —
  output visually identical — then stored as HTML. Markdown source is replaced
  permanently.
- **Notes stay markdown** in the same `posts.body` column. Rendering branches on
  `post_type`: `note` → CommonMark render; otherwise → stored HTML (as-is).
  Same rule in `PostResource` and previews.
- **Sanitize on save** (server-side, replaces CommonMark's `html_input=strip`
  role for stored HTML): strict `DOMDocument` allowlist. Unknown element or
  foreign `img src` → **422** with a clear message. Pure PHP, no new composer
  dependencies.
  - Elements: `p h1 h2 h3 strong em u s ul ol li blockquote pre code a img br hr figure figcaption`
  - Attributes: `a[href,title]`, `img[src,alt,width,height]` — nothing else.
  - `a href` schemes: `http`, `https`, `mailto`, or local (`/`, `#`).
  - `img src` must start with `/storage/uploads/`.
- **Uploads**: `POST /admin/uploads` (existing owner-auth group), multipart
  `image` field; `mimes: jpg,jpeg,png,gif,webp` (SVG rejected — XSS), `max:5120`
  KB; stored on the `public` disk under `uploads/` with a unique name;
  response `{ url }` (`/storage/uploads/…`). Symlink exists.
- **Editor**: `resources/js/Components/RichEditor.tsx` — Tiptap
  (`@tiptap/react`, `starter-kit`, `extension-link`, `extension-image` — the only
  new npm deps). Props: `value` (HTML string), `onChange`, optional `placeholder`.
  Image button/drop/paste → `POST /admin/uploads` → insert `<img src>`.
- **Form flow unchanged**: editor emits HTML into the existing form fields
  (`body` / `description`); controllers keep their shape, validation loosens to
  `string`, and a sanitizer call gates persistence.
- **Excerpts/SEO**: `Post::plainBody()` becomes post-type aware — `note` keeps
  markdown stripping; articles use `strip_tags` + entity decode + whitespace
  collapse. `streamHeadline`/`streamTeaser` inherit via `plainExcerpt`.
- **Styling**: `prose-custom` gains `img` (`max-width:100%; height:auto;
  border-radius` block spacing) and `figure/figcaption` rules so editor output
  matches the archive look.

## 3. Architecture / files

| Area | Files |
|------|-------|
| Sanitizer | `app/Support/HtmlSanitizer.php` (new) |
| Upload | `app/Http/Controllers/Admin/UploadController.php` (new), route in `routes/web.php` |
| Conversion | `Post::convertMarkdownBodiesToHtml()`, `Project::convertDescriptionsToHtml()` (new statics) + migration `2026_10_15_000003_convert_posts_and_projects_to_html.php` |
| Render | `WritingController@show`, `ProjectController@show` passthrough; `PostResource`, `NoteController` keep markdown for notes |
| Excerpts | `Post::plainBody()` post-type branch |
| Editor | `resources/js/Components/RichEditor.tsx` (new), wired in `Admin/Posts/Edit.tsx`, `Admin/Projects/Edit.tsx` |
| Styles | `resources/css/app.css` (`.prose-custom img/figure`) |
| Tests | `tests/Feature/Admin/HtmlSanitizerTest.php`, `UploadTest.php`, conversion tests, controller/excerpt assertions; `resources/js/Components/__tests__/RichEditor.test.tsx`; `e2e/rich-editor.spec.ts` |

## 4. Test plan (TDD — every cycle RED first, watched fail)

**Pest**
1. Sanitizer: clean editor HTML passes unchanged; `<script>`/`onerror=`/foreign
   `<img src>`/unknown tag → 422; `javascript:` href rejected; relative
   `/storage/uploads/…` img accepted.
2. Upload: unauthenticated 401/redirect; valid png → `url` under
   `/storage/uploads/`; >5MB rejected; non-image (php/txt) rejected; SVG rejected.
3. Conversion: sample markdown article body → expected HTML (headings, lists,
   links); project description likewise; note bodies untouched.
4. Store/update: payload with injected markup → 422 or stored-clean per
   allowlist; plain article `plainBody()` readable after HTML storage.

**Vitest**
- `RichEditor` mounts, renders top bar (heading/link/image controls), calls
  `onChange` with HTML, image button triggers upload request (mocked fetch).

**Playwright (QA browser)**
- Log in → create post → type text, bold it via BubbleMenu, insert a heading,
  upload an image → save → public `/writing/{slug}` shows `<strong>`, heading,
  and image.

## 5. Risks / accepted tradeoffs

- Markdown source for articles/projects is gone forever (accepted: not live).
- No SVG, no image resizing — revisit if needed.
- CommonMark remains in use for notes/About/Now/Collected.
- 422-on-unknown-tag is strict; the Tiptap schema emits only allowlisted markup,
  so normal editing can't trip it.
