# Collected Redesign — App Drawer & Per-Medium Views

- **Date:** 2026-10-20
- **Status:** Approved design; awaiting spec review

## Background

`/collected` is still the original flat list from Phase 1 (Oct 13): one uniform row layout, type chips, no detail views, no item identity (`id`/`slug`) in the public payload, no cover imagery. Writing, Notes, and Projects have all received richer index+detail treatments since.

The goal: turn Collected into a browsable *library* that feels like opening an app — a drawer of categories on the front door, and a distinct, medium-appropriate view inside each category. Explicitly requested directions: app-drawer icon home; Apple Books store design for books; Apple Music borrowing for music; a macOS Finder effect (icons, swipe, click → description + Visit button) for tools; creative treatments for videos; fitting editorial/site designs for articles and websites. Podcasts and quotes are not kept by the owner (hidden when empty).

## Decisions (from clarifying Q&A)

1. **Cover images:** add an optional `cover_image` to `collected_items`. Admin can upload a file **or** paste an image URL. Items without a cover use a monochrome placeholder tile — never a broken image.
2. **Empty categories:** hidden from the drawer entirely (dynamic — they appear when their first public item exists).
3. **Click behavior (mixed rule):** item **with** an annotation → internal detail modal (blurred backdrop); item **without** an annotation → opens external `url` directly. **Exception: Tools** — every tool opens the modal (description + Visit button), because that's the Finder spec.
4. **Responsive concept:** same drawer everywhere — mobile/tablet = phone app drawer; desktop = same grid dressed as a Finder window. No separate desktop design language.
5. **Category views:** real Inertia pages (`/collected/{type}`) with overlay-style launch/back animations — hybrid: URL/SEO/back-button integrity of pages, feel of app overlays.
6. **Search:** one search field on the drawer home (Spotlight-style, cross-category results in a unified list). Tag chips move into each category view as `?tag=` filters. No per-category search boxes.
7. **Ordering:** newest-first in every view, everywhere.
8. **Drawer tiles:** minimal monochrome — `bg-surface`, `hairline` border, lucide glyph, count badge. **No gradients, no color fills.**
9. **Motion:** pure CSS (no framer-motion, no View Transitions dependency) **but** must match the polish those tools provide: spring easings, staggered entrances, icon→page morph, backdrop blur — all gated by `prefers-reduced-motion`.
10. **Architecture:** shared shell + swappable per-medium view components (Option A), not bespoke pages and not one generic grid.

## Experience flow

`/collected` = drawer. Tap a category tile → `/collected/{type}` launches (page expands out of the tapped icon). Back chevron or browser back → drawer re-enters with reverse stagger. Search on the drawer → unified result list below the grid. Item clicks follow the mixed rule (Decision 3).

---

## Section 1 — Drawer home (`Collected/Index.tsx` rewrite)

**Kept:** `<PublicLayout>`, `<Head>` SEO block, `h1 "Collected"`, tagline, 300ms debounced search (`router.get` with `preserveState/Scroll`), pagination component for search results.

**Removed:** old flat type-chip `FilterBar` (type browsing = the drawer) and the default item list (grid + search results only).

**Tile grid:**

- Categories with ≥1 publicly visible item only (controller computes list + counts).
- Responsive: 3 cols mobile / 4 tablet / 5–7 desktop (Finder density).
- Tile: ~64–72px rounded-rect (8px radius), monochrome (`bg-surface`, `border-hairline`, lucide glyph in `text-ink`); label below `text-sm`; count as small monochrome corner badge, `text-meta`.
- Hover/focus: `bg-primary/5` + hairline darken; site-standard focus-visible ring.
- Mount animation: stagger cascade 12–20ms per tile, `translateY(8px)→0` + fade, `cubic-bezier(.34,1.56,.64,1)` spring.
- Tiles are `<Link>`s in a `<ul>`; `aria-label` includes count ("Books, 12 items").

**Search results section:**

- Debounced query (existing pattern) → unified list below the grid, fade-slide in.
- Row anatomy reuses today's: type label + date, title, creator, annotation snippet, tags — each row obeying the mixed click rule.
- `aria-live="polite"` result count. Empty query → grid only. Zero hits → existing `EmptyState`. No public items at all → `EmptyState` instead of grid.

**Desktop Finder chrome:** the drawer sits inside a subtle Finder-window frame — thin title bar with three decorative traffic-light dots (`aria-hidden`) + page title. Content grid identical across breakpoints.

**Motion:** tile stagger as above; search section slide-fade; drawer re-entry on back = reverse stagger. All CSS keyframes in `app.css`, `motion-safe:` gated.

---

## Section 2 — Routing, shell, launch transitions

**Route:**

```
GET /collected/{type}  →  CollectedController@show
  type ∈ books|articles|videos|podcasts|music|tools|quotes|websites|other
  (route constraint; unknown type → 404)
  publicly-visible scope only
  ?tag= + pagination (20) supported
  zero public items for that type → 404 (unlinked categories stay unreachable)
```

- Plural URL segment ↔ singular `item_type` via the single shared `TYPES` map.
- Payload: today's index fields **plus `id` and `cover_image`** (storage-resolved absolute URL). Shared item-mapping closure reused by index/search and show.
- Render `Collected/Show` with `{ type, label, items, tags, counts/meta }`.

**`Pages/Collected/Show.tsx` — CategoryShell:**

- Header: back chevron `<Link to="/collected">` (`aria-label="Back to Collected"`), `h1` category label, item count in `text-meta`.
- Tag chips: existing `FilterBar`/`Tag` primitives, URL-driven `?tag=`.
- Body slot: the type's view component (Section 3).
- Bottom: existing `Pagination`.
- `<Head>`: per-category title/description/canonical.

**Launch transition (CSS-only morph):**

1. On tap, read tile rect (`getBoundingClientRect`); set CSS custom props (`--from-x`, `--from-y`, `--from-s`) on the mounting Show page.
2. CategoryShell animates `scale(.92)` + offset translate → identity + fade over ~320ms with iOS push curve `cubic-bezier(.32,.72,0,1)` — page expands out of the icon.
3. The outgoing drawer gets one frame of push-back (`scale(1→1.04)` + dim) before Inertia swaps — coordinated keyframes on both sides, no lingering mounted element.
4. Back = reverse curve (~280ms) toward the header; drawer tiles re-stagger lightly.
5. `prefers-reduced-motion` → instant swap, no transforms.

---

## Section 3 — The category views

All views: newest-first, `EmptyState` when filtered-empty, responsive, reduced-motion-safe, each in `resources/js/Pages/Collected/views/`.

### Books — `BooksGrid` (Apple Books Store)

- "Library" shelf rail: horizontally scrollable row of large portrait covers (2:3, 8px radius, soft drop shadow), native `overflow-x-auto` + `scroll-snap-type: x mandatory` (touchpad/phone swipe free).
- Below: responsive grid (2 → 5–6 cols) of the paginated set: cover → title (`font-medium`, line-clamp-2) → creator (`text-meta`).
- Placeholder cover: typographic tile — title initials in serif on `bg-surface`.
- Title taps follow the mixed rule.

### Articles — `EditorialList` (magazine/editorial)

- Full-width rows, `divide-hairline`: meta line (creator · date, uppercase type tag) → title as `h2` in **Source Serif** (already loaded) → annotation excerpt clamped to 2 lines → tags right-aligned on desktop, below on mobile.
- First item gets a "lead" treatment: larger serif title + full annotation (typographic feature story; no images, no per-7th-item rules).
- Hover: `bg-surface/60` wash, title → `text-link`.

### Videos — `VideoGrid` (streaming shelf)

- 16:9 tiles, responsive grid (2 → 4 cols).
- Tile: `cover_image` when present; else placeholder with centered lucide `Play` in a hairline circle on `bg-surface` (reads as a player).
- Bottom overlay `from-black/60` carries white title + `text-sm/80` creator — the only black overlay allowed (structure, not theme).
- Hover: play glyph scales `0.9→1` spring. Tap: mixed rule.

### Music — `MusicShelf` (Apple Music)

- Square art (1:1) — distinct from Books' 2:3.
- "Recently added" horizontal snap-rail of large square cells (title + creator beneath), then denser grid (4 → 7 cols) for the rest.
- Placeholder: `bg-surface` + hairline + lucide `Disc3`.
- Strongest entrance on the site: rail cells slide-in-from-right staggered 25ms, grid cascade below.

### Tools/Apps — `FinderTools` (macOS Finder — the showpiece)

- Finder window inside the page: hairline title bar, three decorative traffic lights (`aria-hidden`), title "Tools", decorative view-toggle glyphs right.
- Content: icon grid (6–8 cols desktop, 4 mobile), icons 56–64px. Icon = drawer-style monochrome glyph tile, or `cover_image` as rounded-square app icon when set. Name below, `text-xs`, line-clamp-1.
- **Selection & navigation:**
  - Desktop: click selects (Finder-style selection box: `bg-primary/10` + hairline ring); second click or Enter opens. Click outside clears.
  - Mobile: single tap opens directly (no hover to lean on).
  - **Swipe/drag:** pan the grid axis-locked like an iOS home-screen swipe (follows pointer/finger).
  - **Arrow keys** move selection spatially (by grid columns), Home/End jump; `role="grid"`/`gridcell`, `aria-activedescendant`.
  - Discoverability hint row (`text-meta text-xs`): "Click to select · Enter to open · Swipe or arrow keys to move".
- **Detail:** every tool opens the modal (Decision 3 exception) — description + primary **Visit** button (`Button`, external). Empty annotation → modal shows title/creator/link only; `url` null → Visit hidden.

### Websites — `WebsiteCards` (framed link cards)

- Card grid (1 → 3 cols). Each card = mini browser frame: title bar with three dots + hostname derived from `url` (`text-meta text-xs`), body = serif title, creator, annotation excerpt, tags.
- `border-hairline`; hover lifts `translateY(-2px)` + soft shadow.
- No screenshot fetching (YAGNI) — the framed typographic card is the design. Mixed click rule.

### Fallback — `EditorialList` reused

Podcasts, quotes, and any future type get the editorial list (cheap variants — serif blockquote for quotes, `Mic` affordance for podcasts — built only if such items ever exist, since empty types are hidden).

---

## Section 4 — The blurred detail modal

**Trigger:** annotation present → modal (search results, shelves, rows, cards). Else external link. Tools always modal.

**Anatomy** (centered sheet, `max-w-lg`):

- **Backdrop:** `backdrop-blur-md` + `bg-ink/40`. Click-outside or `Esc` closes. Focus trapped; focus returns to origin element on close; body scroll locked while open (small `useEffect` helpers, no library).
- **Panel:** `bg-surface`, 12px radius, hairline border, soft shadow. Entry: scale `.94→1` + `translateY(12px→0)` + fade, 300ms `cubic-bezier(.32,.72,0,1)`; backdrop fades 180ms. Exit: `closing` state, 200ms reverse, then unmount.
- **Content order:** cover (or monochrome glyph tile) → type `Badge` + date → title `h2` (serif map: articles/books/quotes; sans otherwise) → creator (`text-meta`) → annotation (rendered as prose, generous leading) → tags row (`Tag`; click closes modal and applies `?tag=` on the current category) → actions: primary Visit verb button per type ("Visit" / "Read" / "Listen" / "Open" — verb map), `href=url`, new tab, external icon. Top-right dismiss X.
- **Semantics:** `role="dialog"`, `aria-modal`, labelled by title.
- **Ownership:** single `ItemModal` component; each view holds `openItem` state and renders it (no context provider — only one view mounts at a time).
- **Reduced motion:** instant backdrop + panel, no transforms.

---

## Section 5 — Data, backend & admin

**Migration:** `cover_image` string nullable on `collected_items`. "Starts with `http`" → treat as URL, else `Storage::url()` resolution happens in the mapping layer so payloads always carry absolute URLs. Validation when uploaded: `image|mimes:jpg,png,webp,avif|max:4096`. Nullable — old records untouched.

**Model:** `cover_image` added to `$fillable`.

**Admin (`Admin/Collected/{Index,Edit}.tsx`):**

- Edit: "Cover image" fieldset — file input (`useForm` file support, current-image preview, Remove toggle) **and** "…or paste image URL" text input (file wins when both set). One-line hint for recommended ratios (2:3 books / 1:1 music / 16:9 video).
- Index: 32px cover thumb column.
- Store/Update requests: `cover_image` nullable URL-or-image rule. Files purged only on forceDelete/demo cleanup — not on soft delete.

**Public controllers:**

- Shared item mapping (adds `id`, resolved `cover_image`) extracted and reused by `index` and `show`.
- `show(string $type)`: plural→singular via shared map; 404 on unknown/empty type; `?tag=` + paginate 20; renders `Collected/Show`.
- `index`: `?q` present → search results (unified list payload) + drawer `categories: [{type, label, count, href}]`; no `?q` → `items: null` (grid only).

**API:** add `id` + `cover_image` to `CollectedItemResource` (additive); update `docs/api.md`. No new API endpoints (category pages are Inertia-only).

**Seeder:** demo covers (ratio-appropriate placeholder URLs) on a few books/music/videos; rest remain placeholder-rendered.

**Single source of truth for types:** one PHP const/config shared by controllers + validation rule; one `resources/js/collectedTypes.ts` for labels, verbs, plural mapping. Delete the 5 duplicated hardcoded lists (two controller maps, `StoreCollectedItemRequest`, two admin pages).

**Tests:**

- **Pest:** `show` per type (component + label), unknown/empty type 404, private excluded, `?tag=` filter, drawer excludes empty categories, counts correct, `id`/`cover_image` in payload, cover upload validation. Existing `CollectedPublicTest` updated for new index shape (no default list / type chips).
- **Vitest:** `ItemModal` open/close/Esc/focus-return; drawer tile render + stagger class; Finder arrow-key selection.
- **Playwright:** `/collected` h1 + tiles; tile → `/collected/books` h1; annotation item → modal + blur class; no-annotation → external href; existing a11y/public-render specs still pass.

---

## Section 6 — Cross-cutting

**Accessibility:** labelled tile links with counts; labelled search-results region + `aria-live` count; shell header/back/tags/pagination as today; Finder grid semantics + hint text; modal focus trap/Esc/focus return; everything behind `prefers-reduced-motion` (`motion-safe:` + keyframes collapsing to `none`).

**Edge cases:**

- `url` null + no annotation → non-link text (today's behavior); modal still opens when annotation exists; Visit hidden when `url` null (Tools).
- Broken/failed cover → `onError` swaps to monochrome placeholder (never a broken-image icon).
- Long titles → line-clamp everywhere; long annotation → modal scrolls internally (`max-h-[70vh] overflow-y-auto`).
- Zero public items site-wide → drawer `EmptyState`; zero search hits → `EmptyState`; `?tag=` yields zero on a category → `EmptyState`, not 404.

**SEO/perf:** per-category `<Head>` (title/description/canonical); drawer keeps og tags; sitemap unchanged (items are modal-only, no per-item URLs); covers `loading="lazy"` + dimensions (no CLS); **zero new JS dependencies**; CSS localized to `app.css` keyframes/motion section.

**Motion quality bar (the A+A requirement):** pure CSS must deliver what framer-motion/View Transitions would — spring cubic-beziers (`.34,1.56,.64,1` for pops/staggers; `.32,.72,0,1` for page pushes), staggered cascades, the icon→page morph (measured-origin transform), backdrop blur, Finder selection feedback. One shared keyframes/motion section in `app.css`; every animation `motion-safe:`-gated.

## Out of scope (YAGNI)

Podcasts/quotes bespoke views (fallback list only, built if ever needed); website screenshots; cover auto-fetch; manual ordering; per-item permalinks/URLs; framer-motion / View Transitions APIs; live-updating tile counts.

## Architecture summary

| Unit | Depends on | Knows about |
|---|---|---|
| `Collected/Index` (drawer) | controller `categories` + search payload | tiles, search, `ItemModal` |
| `Collected/Show` (shell) | `{type, label, items, tags}` props | header, tags, pagination, which view to mount |
| `views/*` (6 + fallback) | `Item` shape from props | rendering only; open `ItemModal` or link out |
| `ItemModal` | one `Item` | its own open/close/focus state |
| Controller shared map | `TYPES` const | how any payload is shaped |
| `collectedTypes.ts` | mirrors PHP const | labels, verbs, pluralization (frontend only) |

Each unit is independently testable; changing a view's internals never touches the shell or controllers; the modal is used by every view through the same prop contract.
