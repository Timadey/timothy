# Code block button, About preview, Now nav comment-out — design

**Date:** 2026-10-15
**Status:** Approved (design presented in chat; user: "Approaches A/A + nav comment-out")

## 1. Goals & scope

- **Code block button:** make Tiptap's code block discoverable. Today the only
  affordance is the hidden Cmd/Ctrl+Alt+C shortcut or the ``` input rule — no
  visible control. Add a top-bar button to the shared `RichEditor` (approach A)
  so Posts, Projects, and About editors all get it.
- **About preview:** admin About gets an Edit/Preview toggle (approach A,
  mirroring `Admin/Posts/Edit.tsx`) rendering the live editor HTML via the
  existing `PreviewPane format="html"` before saving.
- **Nav:** comment out the Now entry in `resources/js/nav.ts` so `/now` is no
  longer linked from desktop or mobile nav (route/page/admin sidebar stay).
- Out of scope: Now page content or admin (user: "leave the now page as is",
  no Now preview — user explicitly chose "Preview only About"), bubble-menu
  changes (bubble keeps inline `Code` for `code` spans — distinct feature),
  CSS changes (`.prose-custom pre` already styles code blocks), sanitizer/API/
  schema changes, notes composer and Collected (still markdown).

## 2. Decisions

- **Button placement: top bar**, after Link, before Image — block-level
  controls live in the top bar (Image precedent); bubble stays inline-only so
  inline `` `code` `` and block code never look like duplicates.
  `editor.chain().focus().toggleCodeBlock().run()`; `aria-label="Code block"`.
  Active state (caret inside a code block) uses a small light-theme
  `topBarButtonClass(active)` helper (active `bg-ink text-white`, else
  `text-ink hover:bg-surface`) — `bubbleButtonClass` is dark-bubble-only
  (white text) and would be invisible on the light top bar, which has no
  active-state precedent today.
- **About preview: state toggle**, not split view — header keeps label + Save;
  body area swaps between `RichEditor` and `<PreviewPane body={data.body}
  format="html" title={...} excerpt={...}/>`; button label flips Edit ⇄
  Preview (Posts pattern). `data.body` holds in-progress HTML, so preview
  reflects unsaved edits. Save is unaffected (same form, always visible).
- **Nav: comment out** (not delete) the `{ label: 'Now', href: '/now' }` line
  in `nav.ts` — single source consumed by desktop + mobile nav, one edit.
- No backend work: `about_body` HTML is already stored sanitized;
  `PreviewPane` html mode is `setHtml` directly (jsdom-safe).

## 3. Architecture / files

| Area | Files |
|------|-------|
| Editor | `resources/js/Components/RichEditor.tsx` (top-bar Code block button) |
| Nav | `resources/js/nav.ts` (comment out Now entry) |
| Admin About | `resources/js/Pages/Admin/About.tsx` (Edit/Preview toggle + PreviewPane) |
| Tests | `Components/__tests__/RichEditor.test.tsx` (button), `Components/__tests__/AdminAbout.test.tsx` (toggle) — must live under `Components/__tests__/` (Pages glob) |

## 4. Test plan (TDD — RED watched first)

**Vitest**
1. `RichEditor`: renders a button labeled `Code block`; clicking it on a
   non-empty editor inserts `<pre` into the emitted HTML; active while caret
   in a code block. RED: button doesn't exist today.
2. `RichEditor`: button is in the top bar and does not replace the inline
   `Code` control in the bubble (guards against conflating the two).
3. `AdminAbout`: Preview toggles the body area from editor to rendered
   `<PreviewPane>` (html) and Edit restores the editor; Save button visible in
   both modes. RED: no toggle today.
4. Nav: `navItems` has no entry with `href: '/now'` (comment-out guard).

**Pest**
- None new — `/now` route, public Now page, admin Now, and About storage
  contracts are untouched; existing 200 tests cover them.

**Playwright**
- None new unless a suite breaks: no e2e asserts the Now nav link (a11y checks
  the nav landmark only; responsive spec checks visibility, not labels);
  `rich-editor.spec.ts` must keep passing (top-bar edit is adjacent to its
  target area — regression risk noted).

## 5. Risks / accepted tradeoffs

- Top-bar edit touches `RichEditor.tsx`, which `e2e/rich-editor.spec.ts`
  exercises — mitigated: button is additive (no layout shift to Text/Link/
  Image selectors), full playwright run required.
- Commenting Now removes a nav path to an existing page — accepted: page
  stays reachable by URL; user's explicit request.
- Preview shows sanitized-on-save HTML as raw in-progress HTML — accepted:
  matches Posts preview behavior (no sanitization preview pass).
