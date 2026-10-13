# Timadey — Phase 1: Functional Foundation — Design

Date: 2026-10-13
Status: Approved
Source specification: `the-genesis.txt`

Phase 1 scope (per spec §18): application shell, design system, responsive navigation, Home, Writing archive + article detail, Notes, Projects, Collected, About, Now, Eloquent models + migrations, public content APIs, secure admin authentication, admin content management, Search, SEO and RSS — seeded with clearly-labelled, editable/removable demonstration content.

## 1. Decisions & Constraints

| Decision | Choice | Notes |
|---|---|---|
| Architecture | Laravel 12 + Inertia.js + React 19 + TypeScript, single repo | Spec §2 stack; SSR for public pages |
| Database | PostgreSQL via DBngin (local) | Spec requires Postgres; pgvector deferred to Phase 3 |
| Deployment target | Traditional host / VPS with Docker | Docker config scaffolded in Phase 1, completed in Phase 5 |
| Admin auth | Email + password, session-based | TOTP 2FA deferred; may be added later |
| Seed content | AI-written demo content, clearly labelled | ~6 articles, ~8 notes, ~5 projects, ~10 collected items, About/Now stubs; flagged `is_demo`, deletable from admin |
| Visual direction | Macbook/Apple-inspired: black, simple, classic | **Deliberate deviation** from spec §3 ivory/forest palette, per owner instruction |
| CSS | Tailwind CSS v4 with token theme | |
| Icons | Lucide | |
| Markdown | league/commonmark server-side → sanitized HTML | Same pipeline for public render + admin preview |
| Tests | Pest (PHP), Vitest (light component tests) | |

## 2. Architecture & Project Structure

```
timadey/
├── app/
│   ├── Http/Controllers/       # Public pages, admin CRUD, API endpoints
│   ├── Http/Middleware/        # Admin auth, security headers
│   ├── Models/                 # Post, Topic, Tag, Project, CollectedItem, etc.
│   ├── Policies/               # Authorization (owner-only operations)
│   └── Services/               # Search, SEO, RSS, Markdown rendering
├── database/migrations/
├── database/seeders/           # Clearly-labelled demo content
├── resources/
│   ├── js/
│   │   ├── Pages/              # Inertia pages (public + admin)
│   │   ├── Components/         # Reusable design-system components
│   │   └── Layouts/            # Public shell, admin shell
│   ├── css/                    # Tailwind token theme
│   └── ssr.ts                  # Inertia SSR entry
├── routes/web.php, routes/api.php
├── docker/                     # VPS deployment scaffold
├── docs/                       # api.md, setup docs
└── tests/Feature, tests/Unit
```

Key points:

- **Two shells:** public editorial shell and admin sidebar shell, both React layouts.
- **SSR:** Inertia SSR in production for public pages; plain client hydration in dev. Admin is client-side.
- **Parallel API layer:** `/api/*` REST endpoints expose published content (RSS, future integrations, tests); Inertia handles page navigation and admin mutations.
- **Security baseline:** limited-privilege DB user, session auth, CSRF, login rate limiting, security headers, secrets only in `.env`.

## 3. Data Model

- **users** — email, password (hash), display_name, role (`owner`|`admin`), avatar, timestamps. Single seeded owner from `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
- **posts** — title, slug (unique), excerpt, body (Markdown), post_type (`article`|`note`|`question`), status (`draft`|`published`|`archived`), visibility (`public`|`private`), featured, cover_image, meta_title, meta_description, og_image, author_id, published_at, reading_time, is_demo, soft deletes. Indexes: (status, post_type, published_at), slug.
- **topics** (name, slug, description), **tags** (name, slug), polymorphic **taggables/topicables** for posts, projects, collected items.
- **projects** — name, slug, summary, description, status (`idea`|`exploring`|`building`|`active`|`paused`|`completed`), visibility, cover_image, repository_url, live_url, started_at, completed_at, featured, is_demo, soft deletes.
- **collected_items** — title, url, creator, item_type (`book`|`article`|`video`|`podcast`|`music`|`tool`|`quote`|`website`|`other`), annotation, visibility, is_demo.
- **now_sections** — key, label, body, sort_order, visible; **now_updates** — section, text, occurred_at; site-level `last_updated_at`.
- **about_sections** — key, title, body, sort_order, visible.
- **social_links** — platform, url, label, sort_order, visible (Level-1 integrations, no credentials).
- **settings** — key/value (site title, tagline, footer text).

Not in Phase 1 (added by later phases' migrations): activities, comments, integrations, knowledge documents/chunks, AI conversations.

Conventions: bigint IDs; auto-slugs with collision suffixes; all public queries via scopes (`Post::published()`); `is_demo` flag on seeded rows with an admin cleanup action.

## 4. Public Routes & Pages

| Route | Page | Notes |
|---|---|---|
| `/` | Home | Intro, current statement, Ask Timadey entry (placeholder → Phase 3), chronological feed across posts/projects/collected with type labels, featured writing, selected projects, Now snapshot, social links |
| `/writing` | Writing archive | Published articles; featured first; search + topic/tag filters; pagination; reading time |
| `/writing/{slug}` | Article | Markdown, tags, dates, related articles, share metadata, canonical URL |
| `/notes`, `/notes/{slug}` | Notes | Chronological published notes; tag/topic filters; search |
| `/projects`, `/projects/{slug}` | Projects | Status/category filters; detail with tech tags, links, dates, related content |
| `/collected` | Library | Type + tag filters; search; annotation per item |
| `/now` | Now | Sections + last-updated timestamp; hidden sections omitted; never fakes real-time |
| `/about` | About | DB-driven sections, social links, contact |
| `/search` | Search | Postgres full-text across posts/projects/collected; type filters; snippets; direct links |
| `/ask` | Ask Timadey | Phase 1 placeholder with explicit "coming in Phase 3" state |
| `/rss.xml`, `/sitemap.xml`, `/robots.txt` | SEO | Public published content only |

Behavior: every public query filters `status = published AND visibility = public`; guests get 404 for drafts (tested); home feed uses the unified chronological pattern that Phase 2's activity feed extends; empty states and loading skeletons throughout; editorial 404 page.

## 5. Admin & Authentication

- Session auth, email + password; `auth` + `role:owner` middleware on all `/admin/*`; policies on every mutation; server-side enforcement only.
- Login: 5/min rate limit per email+IP, generic errors, session regeneration, secure cookies.
- **Shell:** sidebar (Dashboard, Posts, Projects, Collected, Now, About, Social Links, Tags & Topics, Settings) + top bar (site link, logout); mobile drawer.
- **Dashboard:** real counts only — published/draft posts, recent items, SEO/index status. No fabricated analytics.
- **Posts editor:** title, slug (auto/editable), excerpt, Markdown body + live preview (shared server pipeline), cover upload, tags/topics create-as-you-type, status, featured, SEO fields; autosave 30s + blur; unsaved-changes guard; `?preview=1` auth-gated preview.
- **Projects/Collected/Now/About/Social/Tags:** CRUD per data model; Collected optimized as quick-add; Now toggles sections + timestamped updates; About add/reorder/hide sections; Settings includes demo-content cleanup button.
- **Uploads:** local disk in dev; S3-compatible via env (documented); MIME + ≤5MB image validation.

## 6. Design System (Macbook-inspired)

- **Colors:** text `#1D1D1F`, primary `#000000`, background `#FFFFFF`, subtle surface `#F5F5F7`, metadata `#86868B`, border `#D2D2D7`, link `#0066CC`. Monochrome badges. Dark theme deferred; token structure ready.
- **Type:** Inter throughout, tight heading tracking (-0.02em); optional Source Serif 4 for long-form article body only. Measure ~65ch, line-height 1.7 prose.
- **Layout:** centered column (`max-w-3xl` reading / `max-w-5xl` grids), optional narrow sidebar on home/writing desktop, hairline borders, no gradients, radius 6–8px, generous whitespace, rows-not-cards.
- **Components:** AppShell (header wordmark/nav/mobile drawer, footer), Button, Input, Textarea, Select, Checkbox, Tag, Badge, MetaLine, Prose, EmptyState, Skeleton, Pagination, SearchInput, FilterBar; admin: AdminShell, DataTable, Editor, FormSection, ConfirmDialog.
- **Motion/a11y:** subtle transitions only, `prefers-reduced-motion`, skip-link, semantic landmarks, labeled controls, contrast ≥4.5:1, focus rings, ≥44px touch targets.

## 7. Testing, SEO & Quality

**Pest tests:**

1. Public pages render published content; drafts/private → 404 for guests.
2. Admin CRUD (posts, projects, collected) works; guest → redirect, non-owner → 403.
3. Search returns only published content; type filters respected.
4. Slug collision handling; input validation.
5. RSS/sitemap contain only public published items.
6. Login rate limiting.
7. Seeders clean; demo cleanup action works.

**Vitest (light):** Prose rendering, FilterBar, EmptyState.

**SEO:** titles/descriptions, canonical, OG/Twitter, JSON-LD (Article/Person), sitemap, robots, RSS, semantic HTML, pub/mod dates.

**Errors:** structured logs, editorial 404/403/500 pages, no prod stack traces, Inertia field-level validation messages.

**Performance:** eager loading, pagination, Vite hashing, lazy images, Inertia partial reloads, DB indexes.

**Deliverables:** `.env.example`, `README.md` setup commands, `docs/api.md`, `docker/` scaffold.

## 8. Out of Scope (later phases)

Phase 2: activity feed, questions, comments, visitor auth, moderation. Phase 3: Ask Timadey AI. Phase 4: live layer + integrations. Phase 5: subscriptions, polish, production deployment completion.

## 9. Assumptions

- Spec's ivory/forest palette superseded by owner's Macbook/black direction.
- `/ask` ships as a labelled placeholder in Phase 1; IA is complete from day one.
- Reading-time computed at save time (words / 220 wpm).
- Demo content written to be obviously illustrative, never presented as the owner's real history.
