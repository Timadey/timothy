# Performance Optimization — Design

**Date:** 2026-10-26
**Status:** Approved (design), pending implementation plan
**Scope:** Production backend + shared frontend UX; SSR enabled (8 GB VPS).

## 1. Context & goals

Timadey is a Laravel 12 + Inertia v3 (React 19/TS) + PostgreSQL personal content platform deployed as a single Docker container (nginx + PHP-FPM) on Coolify, with Redis already available as a separate Coolify service.

Research found: pagination and eager loading are solid, tiptap (464 KB) is correctly isolated to admin, and page-level code splitting works. The weaknesses are: **zero application-level caching**, per-request CPU waste (full CommonMark rendering on the notes index), `LIKE '%q%'` filters that ignore the existing GIN full-text indexes, an uncached DB query in shared Inertia props on every request, stock OPcache/php-fpm settings, DB-backed cache/sessions, and SSR scaffolded but not running.

**Goals (user's words):** everything feels snappier and fast; content loads very fast; navigation between pages is very snappy.

**Success criteria:**
- OPcache runs with the production settings below; php-fpm pool sized for the 8 GB VPS.
- Cache and sessions served by Redis; Postgres serves content queries only.
- `/notes` index payload no longer carries full `body_html` per note; per-request markdown render count on list pages drops to zero.
- Public list `?q=` filters use `search_vector` GIN indexes (no sequential scans).
- Home/feed/sitemap/settings/social-links served from cache with defined invalidation.
- Nav links prefetch on hover; list-row links prefetch when visible → client-side transitions near-instant.
- Public pages server-rendered HTML on first visit (SSR), with graceful CSR fallback if the Node process is down.

## 2. Scope

**In scope**
1. Infra: OPcache ini, php-fpm tuning, Redis cache+sessions (env only; Redis service already exists on Coolify).
2. Backend: shared-props/settings caching, notes-index payload fix, memoized plain-text helpers, hybrid cache invalidation, LIKE→FTS switch, targeted DB indexes.
3. Frontend: Inertia link prefetching (nav = hover, list rows = visible).
4. SSR: build the existing `ssr.tsx`, run it under supervisor, enable via inertia-laravel SSR config; multi-stage Docker build.

**Out of scope (explicitly deferred/rejected)**
- nginx fastcgi_cache / HTTP response caching (Option C — risky with Inertia partial responses).
- `pg_trgm` indexes (only needed if LIKE fuzzy matching must stay after FTS switch).
- Redis as a *new* service — already exists; no infra build-out.
- Feature work, UI redesign, SSR of non-Inertia error pages.

## 3. Design

### Layer 1 — Infrastructure

**OPcache** — new file `conf/php/opcache.ini`, copied in the Dockerfile to `$PHP_INI_DIR/conf.d/opcache.ini`:

```ini
opcache.enable=1
opcache.enable_cli=1
opcache.memory_consumption=256
opcache.interned_strings_buffer=32
opcache.max_accelerated_files=32531
opcache.validate_timestamps=0
opcache.save_comments=1
```

`validate_timestamps=0` means PHP never re-checks source files. Safe here because Coolify deploys build a new image → new container → cold opcache. The deploy script (`scripts/00-laravel-deploy.sh`) runs at container start, so every code change implies a fresh process. No mid-container file edits are supported (already true in this workflow).

**php-fpm** — extend `conf/php-fpm/zz-timadey.conf`:

```ini
pm = dynamic
pm.max_children = 16
pm.start_servers = 4
pm.min_spare_servers = 2
pm.max_spare_servers = 6
pm.max_requests = 500
```

Conservative for an 8 GB box shared with Redis/Postgres; values are tunables, not sacred.

**Redis** — `.env` / `.env.example` gain:

```
CACHE_STORE=redis
SESSION_DRIVER=redis
REDIS_HOST=<coolify-redis-service-name>
REDIS_PORT=6379
REDIS_PASSWORD=<if set>
```

Laravel's `redis` cache/session stores use the `default` connection in `config/database.php` — no code changes. App containers on the same Coolify project/network reach Redis by service name. Sessions and cache round-trips leave Postgres entirely.

### Layer 2 — Backend queries & payloads

**2a. Notes index payload** (`NoteController::index`, currently renders CommonMark ×15 + strips plain text up to ~3× per note):
- Remove `body_html` from the index payload; ship only `slug`, `headline`, `teaser`, `date`, `tags`.
- Inline expansion (`NoteFeedItem` "read more") fetches rendered HTML on demand from a small endpoint `GET /notes/{slug}/body` → `{ body_html }` (publicly-visible notes only; 404 otherwise), wrapped in `Cache::remember(CacheKeys::noteBody($slug), …)` so `CacheKeys` flushes it with all other content keys. UX: expand shows the row immediately with a brief loading state; typically tens of ms since it's a single cached query + render.
- Memoize `plainBody()` / `plainExcerpt()` on the `Post` model — compute once per instance, store on a property, so `streamHeadline()` + `streamTeaser()` share one regex pass over the body.

**2b. Shared props & settings** (`HandleInertiaRequests::share`, `Setting::get`, `HomeHero::load`):
- `social_links` → `Cache::remember('social_links', now()->addHour(), ...)`; also memoize `Setting::get()` per-key with 1-hour TTL and have `HomeHero` reuse it instead of re-reading `site_title`.

**2c. Hybrid invalidation (approved):**
- **Event-based (content):** model events (`saved`/`deleted`) on `Post`, `Project`, `CollectedItem`, `Tag`, `Topic` → `CacheKeys` flushes the content-derived keys (home, activity feed, RSS, sitemap, tag/topic lists) plus `note.body.{slug}` for the affected post (including its original slug if the slug changed).
- **Event-based (chrome):** observers on `Tag`, `Topic`, `SocialLink`, `NowSection`, `NowUpdate`, About/settings writes → forget their specific keys.
- **TTL-only (low churn):** settings and social links refresh within ≤1 h even without an event (safety net).
- **Safety TTL:** content keys also carry a short TTL (5 min) so a missed invalidation self-heals quickly.
- **Store-agnostic keys, no cache tags:** all keys are constructed in one `App\Support\CacheKeys` class and invalidated by explicit `Cache::forget()` calls from model events. Cache tags were rejected because local dev runs `CACHE_STORE=database` (not taggable) — explicit keys work identically on database, array (tests), and Redis (production) stores.

**2d. Hot-query caching:** `HomeController`, `FeedService` (activity/RSS), `SeoController` (sitemap) responses wrapped in `Cache::remember` per the tagging scheme above. First uncached hit still queries; subsequent hits skip DB.

**2e. LIKE → FTS:** Writing/Notes/Collected `?q=` filters switch from `LOWER(col) LIKE '%q%'` to `search_vector @@ to_tsquery('english', …)` where each extracted word becomes `word:*` (prefix match) with `&` (AND) between words — built by a sanitizing helper so user input can never reach tsquery syntax. This uses the existing GIN indexes while preserving the type-ahead prefix behavior users get from `LIKE` (e.g. "neuro" still matches "Neurotechnology"). `SearchService`'s `OR LOWER ... LIKE` fallbacks for projects/collected are removed so plans use the index cleanly; `/search` keeps `websearch_to_tsquery` (full-word semantics are correct there). Queries containing no word characters return no results.

**2f. Indexes (one migration):**
- `posts`: composite `(post_type, visibility, status, published_at)` to match `publiclyVisible()->ofType()->latest('published_at')`.
- `posts(featured)`, `projects(featured)` for Home featured queries.
- `projects(updated_at)`, `collected_items(created_at)` for `latest()` sorts.
- Composite indexes cover the equality-plus-ordered-range patterns above; partial (`WHERE deleted_at IS NULL`) variants are deferred unless `EXPLAIN` shows the composites insufficient at real data volumes (YAGNI at personal-site scale).
- Keep the existing unique slug indexes, `status/post_type/published_at` composite, and FTS GIN indexes untouched.

### Layer 3 — Frontend prefetching

In `PublicLayout.tsx` nav links: `prefetch="hover"`. List rows / pagination / read-more links on Home, Writing, Notes, Projects, Collected: `prefetch="visible"` (combined with hover for links below the fold). Admin links: no prefetch. Inertia resolves prefetches against the server (now Redis-cached), so background prefetches are cheap. No changes to progress indicators or transition CSS — default Inertia progress bar stays.

### Layer 4 — SSR (server-side rendering)

- **Build:** `resources/js/ssr.tsx` + `vite.config.ts ssr:` already exist; the `ssr` build output (laravel-vite-plugin convention: `bootstrap/ssr/ssr.mjs`) is produced during the Docker build.
- **Enable:** inertia-laravel v3 `config/inertia.php` (vendor config, not published) — `ssr.enabled` reads `INERTIA_SSR_ENABLED` (default `true`), `ssr.url` defaults to `http://127.0.0.1:13714`. Production: `ENV INERTIA_SSR_ENABLED=true` in the Dockerfile (`.env` is excluded from the image). Local dev: `INERTIA_SSR_ENABLED=false` in `.env` so requests never attempt a connection to a non-running SSR server. When enabled, `php artisan inertia:start-ssr` serves the bundle; on any failure Inertia falls back to the CSR shell (no user-facing error, `throw_on_error=false`).
- **Runtime:** new `program:ssr` in `conf/supervisor/supervisord.conf` running the built bundle with `autorestart=true`; health = supervisor + Inertia fallback.
- **Docker:** multi-stage Dockerfile — stage 1 installs Node 22, runs `npm ci` + the SSR build; stage 2 (current PHP image) copies only the built SSR artifact. Runtime image grows modestly (~80–120 MB for the Node runtime); no `node_modules` at runtime since Vite bundles React/Inertia into the SSR file.
- **Scope:** all Inertia pages SSR (public + admin); admin auth/session behavior unchanged because SSR is stateless per request (session cookie still drives auth server-side).

## 4. Error handling

- **Redis down:** Laravel cache failures throw — wrap nothing silently; Redis restart policy is Coolify's job (restart: always). Sessions failing = login issues, surfaced loudly rather than degraded silently. Acceptable: Redis is a first-class service now.
- **SSR process down:** supervisor restarts; Inertia falls back to CSR transparently.
- **Prefetch failures:** swallowed by Inertia (navigation re-requests normally).
- **On-demand note body fetch fails:** row shows an inline retry affordance (expand stays open, error message with retry).

## 5. Testing & verification

- **Existing suites must stay green:** `./vendor/bin/pest`, `npm test`, `npx tsc --noEmit`, `npm run build`, `npx playwright test`.
- **New tests:**
  - FTS: Writing/Notes/Collected `?q=` returns matching rows and excludes non-matching (Pest).
  - Invalidation: saving a Post clears the content-tagged keys (home/feed/sitemap) and leaves settings TTL keys alone (Pest with array/redis cache).
  - `GET /notes/{slug}/body`: 200 for public note, 404 for draft/other post types (Pest).
  - Notes index payload: response props contain no `body_html` (Pest) + frontend expand fetch test (Vitest).
  - Memoized `plainBody()` returns same value across repeated calls and after mutation reset (Vitest/Pest as applicable).
- **Manual/ops verification:**
  - In the running container: `php -i | grep -E 'opcache\.(enable|validate_timestamps|memory_consumption)'` shows the tuned values.
  - `redis-cli INFO memory` / `CACHE_STORE` effective — cache writes land in Redis (`php artisan tinker` → `Cache::put`/`Cache::get`).
  - Lighthouse/DevTools on `/`, `/writing`, `/notes`: LCP on first (uncached, SSR) and repeat loads; network tab shows prefetch requests firing on hover/visibility.
  - Container memory after SSR enabled stays well within 8 GB headroom.

## 6. Risks & trade-offs

- **FTS behavior change:** mid-word substring matches (LIKE '%urotech%') no longer match — prefix-of-word matches do. Type-ahead UX and existing tests are preserved; true substring search would need `pg_trgm` later.
- **Notes expansion adds one network hop** on read-more — offset by Redis cache; payload wins on every list page load outweigh it.
- **OPcache `validate_timestamps=0`** makes local dev images unsuitable for hot-reload edits — this ini ships only in the production Dockerfile, not local php.ini.
- **php-fpm `max_children=16`** is a starting point — revisit if RSS or Postgres connection counts climb.
- **SSR adds a Node runtime + process** — accepted by user (8 GB VPS); fallback path documented.
