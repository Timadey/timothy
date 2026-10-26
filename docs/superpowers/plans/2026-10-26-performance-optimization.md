# Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Timadey feel snappier end-to-end: tuned PHP infra (OPcache/php-fpm/Redis), zero-waste queries and payloads, cached hot pages with event-driven invalidation, prefetching links, and SSR for first paint.

**Architecture:** Four independent layers shipped as tasks in order: (1) Docker/PHP infra, (2) backend query/payload/caching work built around a single `App\Support\CacheKeys` class + one generic `CacheFlushObserver` registered for content/chrome models, (3) Inertia link prefetching, (4) SSR via inertia-laravel v3 (`inertia:start-ssr` under supervisor, bundle built in a Node stage of the Dockerfile). Each task is independently testable and committable.

**Tech Stack:** Laravel 12 + inertia-laravel ^3.5 (SSR enabled via vendor `config/inertia.php`, `INERTIA_SSR_ENABLED`), Postgres FTS (`search_vector` + GIN), Vite/laravel-vite-plugin (client + `bootstrap/ssr` bundle), React 19 Inertia `Link` `prefetch` prop, Pest (feature), Vitest (components), Playwright (e2e), Docker (php:8.4.27-fpm-bookworm + node:22-bookworm-slim multi-stage), supervisor.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-26-performance-optimization-design.md` (authoritative for scope; amended 2026-10-26 to use store-agnostic cache keys instead of cache tags, prefix-FTS instead of word-boundary FTS, and composite-only indexes).
- Cache must work on **any** store (local `database`, tests `array`, production `redis`) — **no `Cache::tags()`** anywhere.
- OPcache settings must match the spec exactly: `opcache.enable=1`, `opcache.enable_cli=1`, `opcache.memory_consumption=256`, `opcache.interned_strings_buffer=32`, `opcache.max_accelerated_files=32531`, `opcache.validate_timestamps=0`, `opcache.save_comments=1`.
- php-fpm: `pm=dynamic`, `pm.max_children=16`, `pm.start_servers=4`, `pm.min_spare_servers=2`, `pm.max_spare_servers=6`, `pm.max_requests=500`.
- Dockerfile PHP pin check must stay intact: `php:8.4.27-fpm-bookworm` + `PHP_VERSION === "8.4.27"` guard (`tests/Feature/DeploymentAssetsTest.php` asserts this).
- Tests: `./vendor/bin/pest` (uses `CACHE_STORE=array`, `SESSION_DRIVER=array`, pgsql `timadey_test`), `npm test`, `npx tsc --noEmit`, `npm run build`. All must stay green after every task.
- Commit messages follow repo style: `feat:`, `fix:`, `docs:`, `chore:` (lowercase, imperative).
- Local `.env` runs `CACHE_STORE=database` — never introduce code that only works on Redis.
- SSR env: production = `INERTIA_SSR_ENABLED=true` (Dockerfile `ENV`, `.env` is `.dockerignore`d); local `.env` = `INERTIA_SSR_ENABLED=false`.

---

### Task 1: OPcache ini, php-fpm tuning, Redis extension, production ENV defaults

**Files:**
- Create: `conf/php/opcache.ini`
- Modify: `Dockerfile` (COPY opcache, pecl redis, node lib dep, ENV defaults)
- Modify: `conf/php-fpm/zz-timadey.conf`
- Test: `tests/Feature/DeploymentAssetsTest.php` (append new tests)

**Interfaces:**
- Produces: production container serves PHP with tuned OPcache, has `redis` extension, defaults `CACHE_STORE=redis`, `SESSION_DRIVER=redis`, `INERTIA_SSR_ENABLED=true`. Tasks 6–8 rely on Redis being reachable in production via `REDIS_HOST` (Coolify env).

- [ ] **Step 1: Write failing tests**

Append to `tests/Feature/DeploymentAssetsTest.php`:

```php
it('ships a production-tuned opcache ini', function () {
    $path = base_path('conf/php/opcache.ini');
    expect(file_exists($path))->toBeTrue();

    $ini = file_get_contents($path);

    expect($ini)->toContain('opcache.enable=1')
        ->and($ini)->toContain('opcache.enable_cli=1')
        ->and($ini)->toContain('opcache.memory_consumption=256')
        ->and($ini)->toContain('opcache.interned_strings_buffer=32')
        ->and($ini)->toContain('opcache.max_accelerated_files=32531')
        ->and($ini)->toContain('opcache.validate_timestamps=0')
        ->and($ini)->toContain('opcache.save_comments=1');
});

it('installs the opcache ini and the redis extension in the image', function () {
    $dockerfile = file_get_contents(base_path('Dockerfile'));

    expect($dockerfile)->toContain('COPY conf/php/opcache.ini $PHP_INI_DIR/conf.d/opcache.ini')
        ->and($dockerfile)->toContain('pecl install redis')
        ->and($dockerfile)->toContain('docker-php-ext-enable redis')
        ->and($dockerfile)->toContain('libstdc++6');
});

it('defaults production to redis cache/sessions and enables SSR', function () {
    $dockerfile = file_get_contents(base_path('Dockerfile'));

    expect($dockerfile)->toContain('ENV CACHE_STORE=redis')
        ->and($dockerfile)->toContain('ENV SESSION_DRIVER=redis')
        ->and($dockerfile)->toContain('ENV INERTIA_SSR_ENABLED=true');
});

it('tunes the php-fpm pool', function () {
    $conf = file_get_contents(base_path('conf/php-fpm/zz-timadey.conf'));

    expect($conf)->toContain('pm = dynamic')
        ->and($conf)->toContain('pm.max_children = 16')
        ->and($conf)->toContain('pm.start_servers = 4')
        ->and($conf)->toContain('pm.min_spare_servers = 2')
        ->and($conf)->toContain('pm.max_spare_servers = 6')
        ->and($conf)->toContain('pm.max_requests = 500');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./vendor/bin/pest --filter="opcache|redis|fpm pool"`
Expected: FAIL (`conf/php/opcache.ini` missing; Dockerfile/zz-timadey.conf assertions missing)

- [ ] **Step 3: Create the OPcache ini**

Create `conf/php/opcache.ini`:

```ini
; Production OPcache — validated at deploy time only (containers are immutable).
opcache.enable=1
opcache.enable_cli=1

opcache.memory_consumption=256
opcache.interned_strings_buffer=32

opcache.max_accelerated_files=32531

; Never re-check file timestamps per request — a code change implies a new
; container (Coolify rebuild), which boots with a cold opcache.
opcache.validate_timestamps=0

; Laravel attributes/annotations require comments to be saved.
opcache.save_comments=1
```

- [ ] **Step 4: Tune php-fpm**

Replace the body of `conf/php-fpm/zz-timadey.conf` with:

```ini
[www]
listen = /var/run/php-fpm.sock
listen.owner = www-data
listen.group = www-data
listen.mode = 0660
access.log = /proc/self/fd/2
clear_env = no

; 8 GB VPS shared with Redis/Postgres/nginx — conservative starting point.
pm = dynamic
pm.max_children = 16
pm.start_servers = 4
pm.min_spare_servers = 2
pm.max_spare_servers = 6
pm.max_requests = 500
```

- [ ] **Step 5: Edit the Dockerfile**

In `Dockerfile`:

1. In the first `RUN apt-get` block, add `libstdc++6 \` to the package list (needed by the copied Node binary in Task 10; harmless no-op if already installed).
2. Extend the extension install line so it reads:

```dockerfile
    && docker-php-ext-install -j"$(nproc)" pdo_pgsql mbstring opcache zip \
    && pecl install redis && docker-php-ext-enable redis \
    && rm -rf /var/lib/apt/lists/*
```

3. After the existing `COPY conf/php-fpm/zz-timadey.conf ...` line, add:

```dockerfile
COPY conf/php/opcache.ini $PHP_INI_DIR/conf.d/opcache.ini
```

4. Next to the existing `ENV` block at the bottom, add:

```dockerfile
ENV CACHE_STORE=redis
ENV SESSION_DRIVER=redis
ENV INERTIA_SSR_ENABLED=true
```

Leave the PHP version pin and the `COPY . .` / composer steps untouched.

- [ ] **Step 6: Run tests to verify they pass**

Run: `./vendor/bin/pest tests/Feature/DeploymentAssetsTest.php`
Expected: PASS (all tests in the file)

- [ ] **Step 7: Commit**

```bash
git add conf/php/opcache.ini conf/php-fpm/zz-timadey.conf Dockerfile tests/Feature/DeploymentAssetsTest.php
git commit -m "feat: tune opcache, php-fpm pool, redis ext and production env defaults"
```

---

### Task 2: Env documentation (local SSR flag, Coolify Redis vars, README)

**Files:**
- Modify: `.env.example`, `.env`, `README.md`

**Interfaces:**
- Consumes: Task 1 Dockerfile ENV defaults.
- Produces: operators know to set `REDIS_HOST` (and optional `REDIS_PASSWORD`) in Coolify; local dev has `INERTIA_SSR_ENABLED=false` so no TCP attempts to :13714.

- [ ] **Step 1: Local `.env` — disable SSR for local dev**

Add this line to `.env` (e.g. after `SESSION_SECURE_COOKIE`):

```
INERTIA_SSR_ENABLED=false
```

- [ ] **Step 2: `.env.example` — document production behavior**

In `.env.example`, add after the existing `CACHE_STORE=database` line:

```
# Production (Docker) overrides these via Docker ENV / Coolify:
#   CACHE_STORE=redis, SESSION_DRIVER=redis, INERTIA_SSR_ENABLED=true
# Required Coolify env vars for production: REDIS_HOST (redis service name),
# REDIS_PASSWORD (if the Redis service has one). Optional: REDIS_PORT (6379).
INERTIA_SSR_ENABLED=false
```

- [ ] **Step 3: README env table**

In `README.md`, extend the Environment variables table with rows:

```markdown
| `CACHE_STORE` | Cache driver | `database` locally, `redis` in Docker |
| `SESSION_DRIVER` | Session driver | `database` locally, `redis` in Docker |
| `REDIS_HOST` | Redis host (required in production) | `127.0.0.1` (set to Coolify Redis service name) |
| `REDIS_PASSWORD` | Redis password | `null` |
| `INERTIA_SSR_ENABLED` | Server-side rendering | `false` locally, `true` in Docker |
```

- [ ] **Step 4: Sanity-check env parsing**

Run: `php artisan config:clear && php artisan about | head -5`
Expected: command succeeds (config still loads)

- [ ] **Step 5: Commit**

```bash
git add .env.example README.md
git commit -m "docs: document redis and ssr env configuration"
```

(Note: `.env` is gitignored — it is changed but not committed.)

---

### Task 3: Full-text prefix search (LIKE → GIN index)

**Files:**
- Create: `app/Support/Fts.php`
- Modify: `app/Http/Controllers/WritingController.php:15-19`
- Modify: `app/Http/Controllers/NoteController.php:16-20`
- Modify: `app/Http/Controllers/CollectedController.php:18-30`
- Modify: `app/Services/SearchService.php:37-42,58-63`
- Test: `tests/Feature/WritingTest.php` (append), `tests/Feature/NotesTest.php` (append), `tests/Feature/CollectedPublicTest.php` (append)

**Interfaces:**
- Produces: `App\Support\Fts::apply(Illuminate\Database\Eloquent\Builder $query, string $input): void` — adds a `search_vector @@ to_tsquery('english', 'word1:* & word2:*')` where clause; input is sanitized to letters/digits/underscore before touching tsquery syntax; a query with no word characters yields `whereRaw('false')` (no results).

- [ ] **Step 1: Write failing tests**

First, a canary test proving `to_tsquery('english', 'word:*')` aligns with the english-stemmed generated `search_vector` (the whole FTS switch depends on it — Postgres applies the english dictionary to prefix tokens too):

Append to `tests/Feature/NotesTest.php`:

```php
it('prefix tsqueries align with english-stemmed tsvectors', function () {
    $rows = [
        ['text' => 'Great systems thinking book', 'query' => 'systems:*', 'expect' => true],
        ['text' => 'Neurotechnology Primer', 'query' => 'neuro:*', 'expect' => true],
        ['text' => 'Essential Patterns', 'query' => 'patterns:*', 'expect' => true],
        ['text' => 'Baking bread', 'query' => 'android:*', 'expect' => false],
    ];

    foreach ($rows as $case) {
        $row = \Illuminate\Support\Facades\DB::selectOne(
            "SELECT to_tsvector('english', '{$case['text']}') @@ to_tsquery('english', '{$case['query']}') AS match"
        );
        expect((bool) $row->match, "{$case['query']} vs {$case['text']}")->toBe($case['expect']);
    }
});
```

Then the feature tests. Append to `tests/Feature/NotesTest.php`:

```php
it('filters notes by prefix-matching full text', function () {
    $author = User::factory()->create();
    $base = ['post_type' => 'note', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id];
    Post::factory()->create($base + ['title' => null, 'slug' => 'has-term', 'body' => 'Thinking about distributed systems today.']);
    Post::factory()->create($base + ['title' => null, 'slug' => 'no-term', 'body' => 'Baking bread on a quiet afternoon.']);

    $this->get('/notes?q=distribut')->assertInertia(fn ($p) => $p
        ->component('Notes/Index')
        ->has('notes.data', 1)
        ->where('notes.data.0.slug', 'has-term'));
});

it('returns no notes for a query with no word characters', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'note', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'title' => 'Any Note']);

    $this->get('/notes?q=%21%21')->assertInertia(fn ($p) => $p->component('Notes/Index')->has('notes.data', 0));
});
```

Append to `tests/Feature/CollectedPublicTest.php` (read the file first to reuse any local helpers; otherwise create items inline):

```php
it('filters collected items by prefix full text on annotation', function () {
    \App\Models\CollectedItem::factory()->create([
        'title' => 'Blade Runner', 'annotation' => 'A film about androids and memory.', 'visibility' => 'public',
    ]);
    \App\Models\CollectedItem::factory()->create([
        'title' => 'Bread Book', 'annotation' => 'Sourdough techniques.', 'visibility' => 'public',
    ]);

    $this->get('/collected?q=android')->assertInertia(fn ($p) => $p
        ->component('Collected/Index')
        ->has('items.data', 1)
        ->where('items.data.0.title', 'Blade Runner'));
});
```

Existing `tests/Feature/WritingTest.php` `'searches article titles'` with `?q=neuro` must keep passing (prefix `neuro:*` matches "Neurotechnology") — no edit needed there.

- [ ] **Step 2: Run tests to verify they fail**

Run: `./vendor/bin/pest tests/Feature/NotesTest.php`
Expected: FAIL (new tests — `q=distribut` matches nothing under LIKE)

- [ ] **Step 3: Implement the Fts helper**

Create `app/Support/Fts.php`:

```php
<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;

class Fts
{
    /**
     * Add a prefix-matching full-text filter on `search_vector` to $query.
     * Words are extracted with a unicode split so raw input never reaches
     * tsquery syntax. A non-empty input with no word characters matches nothing.
     */
    public static function apply(Builder $query, string $input): void
    {
        $ts = self::prefixQuery($input);

        if ($ts === null) {
            $query->whereRaw('false');

            return;
        }

        $query->whereRaw('search_vector @@ to_tsquery(?, ?)', ['english', $ts]);
    }

    /** e.g. "distributed systems" -> "distributed:* & systems:*"; null when no words. */
    public static function prefixQuery(string $input): ?string
    {
        $words = preg_split('/[^\p{L}\p{N}_]+/u', $input, -1, PREG_SPLIT_NO_EMPTY) ?: [];

        if ($words === []) {
            return null;
        }

        return implode(' & ', array_map(fn (string $w) => $w.':*', $words));
    }
}
```

- [ ] **Step 4: Switch the three controllers to Fts**

`WritingController::index` — replace the `$q` block (lines 15–19) with:

```php
        if ($q = $request->query('q')) {
            Fts::apply($query, (string) $q);
        }
```

Add `use App\Support\Fts;` to the imports (merge into the existing `use App\Models\...` group style: add `use App\Support\Fts;` after the models import).

`NoteController::index` — replace lines 16–20 with the same block:

```php
        if ($q = $request->query('q')) {
            Fts::apply($query, (string) $q);
        }
```

Add `use App\Support\Fts;`.

`CollectedController::index` — replace the `if ($q !== '')` block (lines 18–30) with:

```php
        if ($q !== '') {
            $query = CollectedItem::publiclyVisible()
                ->with('tags')
                ->latest('created_at');
            Fts::apply($query, $q);
            $items = $query->paginate(20)
                ->withQueryString()
                ->through(fn ($i) => $this->mapItem($i));
        }
```

Add `use App\Support\Fts;`.

- [ ] **Step 5: Remove LIKE fallbacks from SearchService**

In `app/Services/SearchService.php`:

- Projects branch (lines ~37–42): delete `$needle = '%'.mb_strtolower($query).'%';` and change the `where(fn ...)` to:

```php
            ->whereRaw('search_vector @@ websearch_to_tsquery(?, ?)', ['english', $query])
```

- Collected branch (lines ~58–63): same change — delete `$needle`, replace the `where(fn ...)` with the same single `->whereRaw(...)` line.

(The `/search` page keeps `websearch_to_tsquery` full-word semantics — only the `OR LOWER ... LIKE` fallbacks go away.)

- [ ] **Step 6: Run tests to verify they pass**

Run: `./vendor/bin/pest`
Expected: PASS (full suite — SearchController/`?q=` behavior across all features)

- [ ] **Step 7: Commit**

```bash
git add app/Support/Fts.php app/Http/Controllers/WritingController.php app/Http/Controllers/NoteController.php app/Http/Controllers/CollectedController.php app/Services/SearchService.php tests/Feature/NotesTest.php tests/Feature/CollectedPublicTest.php
git commit -m "feat: switch list filters to prefix full-text search on gin indexes"
```

---

### Task 4: Content performance indexes

**Files:**
- Create: `database/migrations/2026_10_26_000002_add_content_perf_indexes.php`
- Test: `tests/Feature/PerformanceIndexesTest.php`

**Interfaces:**
- Consumes: existing tables `posts`, `projects`, `collected_items` (see `2026_10_13_000001_create_content_tables.php`).
- Produces: indexes `posts_post_type_visibility_status_published_at_index`, `posts_featured_index`, `projects_featured_index`, `projects_updated_at_index`, `collected_items_created_at_index`.

- [ ] **Step 1: Write failing test**

Create `tests/Feature/PerformanceIndexesTest.php`:

```php
<?php

use Illuminate\Support\Facades\DB;

it('adds the content performance indexes', function () {
    $names = collect(DB::select(
        "SELECT indexname FROM pg_indexes WHERE tablename IN ('posts', 'projects', 'collected_items')"
    ))->pluck('indexname');

    expect($names)->toContain(
        'posts_post_type_visibility_status_published_at_index',
        'posts_featured_index',
        'projects_featured_index',
        'projects_updated_at_index',
        'collected_items_created_at_index',
    );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./vendor/bin/pest tests/Feature/PerformanceIndexesTest.php`
Expected: FAIL (`Expected ... not to contain ...`)

- [ ] **Step 3: Create the migration**

Create `database/migrations/2026_10_26_000002_add_content_perf_indexes.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            // public list queries: publiclyVisible()->ofType()->latest('published_at')
            $table->index(['post_type', 'visibility', 'status', 'published_at']);
            $table->index('featured');
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->index('featured');
            $table->index('updated_at');
        });

        Schema::table('collected_items', function (Blueprint $table) {
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropIndex(['post_type', 'visibility', 'status', 'published_at']);
            $table->dropIndex(['featured']);
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->dropIndex(['featured']);
            $table->dropIndex(['updated_at']);
        });

        Schema::table('collected_items', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
        });
    }
};
```

- [ ] **Step 4: Migrate and run the test**

Run: `php artisan migrate && ./vendor/bin/pest tests/Feature/PerformanceIndexesTest.php`
Expected: migration runs; test PASS

- [ ] **Step 5: Run full suite**

Run: `./vendor/bin/pest`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add database/migrations/2026_10_26_000002_add_content_perf_indexes.php tests/Feature/PerformanceIndexesTest.php
git commit -m "feat: add content performance indexes"
```

---

### Task 5: Memoize Post plain-text helpers

**Files:**
- Modify: `app/Models/Post.php` (`plainBody()` at line 144)
- Test: `tests/Feature/NoteSnippetTest.php` (append)

**Interfaces:**
- Produces: `Post::plainBody(): string` memoizes per model instance (first call computes; later calls return the stored value even if `body` is mutated on the same instance). `streamHeadline()`/`streamTeaser()`/`plainExcerpt()`/`titleOrSnippet()` all benefit automatically.

- [ ] **Step 1: Write failing test**

Append to `tests/Feature/NoteSnippetTest.php`:

```php
it('memoizes plainBody so one note strips its body once per instance', function () {
    $note = makeTitlelessNote(['body' => "## Heading\n\nSome **bold** text here."]);

    $first = $note->plainBody();
    expect($first)->toBe('Heading Some bold text here')
        ->and($note->plainBody())->toBe($first);

    // Memoization: the same instance does not recompute after mutation.
    $note->body = 'Totally different body now.';
    expect($note->plainBody())->toBe($first);

    // A fresh instance does recompute.
    expect($note->fresh()->plainBody())->toBe('Heading Some bold text here');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./vendor/bin/pest tests/Feature/NoteSnippetTest.php --filter=memoizes`
Expected: FAIL (third assertion — plainBody recomputes after mutation)

- [ ] **Step 3: Implement memoization**

In `app/Models/Post.php`, add a private property and rewrite `plainBody()`:

```php
    private ?string $plainBodyMemo = null;

    public function plainBody(): string
    {
        if ($this->plainBodyMemo !== null) {
            return $this->plainBodyMemo;
        }

        $text = (string) $this->body;

        if ($this->post_type !== 'note') {
            $text = html_entity_decode(strip_tags($text), ENT_QUOTES | ENT_HTML5);
            $text = preg_replace('/\s+/', ' ', $text) ?? $text;

            return $this->plainBodyMemo = trim($text);
        }

        $text = preg_replace('/^#{1,6}\s*/m', '', $text) ?? $text;
        $text = preg_replace('/^\s*(?:[->*+]|\d+\.)\s+/m', '', $text) ?? $text;
        $text = str_replace(['**', '__', '~~', '`'], '', $text);
        $text = preg_replace('/\[([^\]]+)\]\([^)]*\)/', '$1', $text) ?? $text;
        $text = preg_replace('/\s+/', ' ', $text) ?? $text;

        return $this->plainBodyMemo = trim($text);
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `./vendor/bin/pest tests/Feature/NoteSnippetTest.php && npm test`
Expected: PASS (both suites)

- [ ] **Step 5: Commit**

```bash
git add app/Models/Post.php tests/Feature/NoteSnippetTest.php
git commit -m "perf: memoize plainBody per post instance"
```

---

### Task 6: CacheKeys + generic flush observer + shared-props/setting caches

**Files:**
- Create: `app/Support/CacheKeys.php`
- Create: `app/Observers/CacheFlushObserver.php`
- Modify: `app/Providers/AppServiceProvider.php` (`boot()`)
- Modify: `app/Models/Setting.php` (`get()`)
- Modify: `app/Http/Middleware/HandleInertiaRequests.php:19-21`
- Test: `tests/Feature/CacheInvalidationTest.php` (new)

**Interfaces:**
- Produces:
  - `CacheKeys::SOCIAL_LINKS`, `CacheKeys::HOME`, `CacheKeys::FEED`, `CacheKeys::RSS`, `CacheKeys::SITEMAP`, `CacheKeys::TOPICS`, `CacheKeys::NOTE_TAGS` (string constants)
  - `CacheKeys::setting(string $key): string`, `CacheKeys::noteBody(string $slug): string`
  - `CacheKeys::flushContent(): void` — forgets all content-derived constants
  - `CacheKeys::flushFor(Model $model): void` — `flushContent()` + model-specific forgets (Post → `note.body.{slug}` for current and original slug; Setting → `setting.{key}`; SocialLink → `SOCIAL_LINKS`)
  - `CacheFlushObserver` with `saved(Model)`/`deleted(Model)` calling `CacheKeys::flushFor`
  - `Setting::get()` now caches reads 1 hour (per key)
  - shared `social_links` prop cached 1 hour
- Consumed by: Tasks 7 (`CacheKeys` constants + `flushContent`), 8 (`CacheKeys::noteBody`).

- [ ] **Step 1: Write failing test**

Create `tests/Feature/CacheInvalidationTest.php`:

```php
<?php

use App\Models\{Post, Setting, SocialLink, User};
use App\Support\CacheKeys;
use Illuminate\Support\Facades\Cache;

it('caches social links and forgets them when a social link changes', function () {
    SocialLink::create(['platform' => 'github', 'url' => 'https://github.com/x', 'label' => 'GitHub', 'visible' => true, 'sort_order' => 1]);

    $this->get('/')->assertOk();
    expect(Cache::has(CacheKeys::SOCIAL_LINKS))->toBeTrue();

    SocialLink::first()->update(['label' => 'GH']);
    expect(Cache::has(CacheKeys::SOCIAL_LINKS))->toBeFalse();
});

it('caches settings reads and flushes on write', function () {
    Setting::set('site_title', 'Timadey');
    expect(Setting::get('site_title'))->toBe('Timadey');
    expect(Cache::has(CacheKeys::setting('site_title')))->toBeTrue();

    Setting::set('site_title', 'Renamed');
    expect(Setting::get('site_title'))->toBe('Renamed');
});

it('flushes content keys when a post is saved', function () {
    Cache::forever(CacheKeys::HOME, ['stale' => true]);
    Cache::forever(CacheKeys::RSS, 'stale');
    Cache::forever(CacheKeys::noteBody('a-note'), '<p>stale</p>');

    $author = User::factory()->create();
    Post::factory()->create([
        'post_type' => 'note', 'status' => 'published', 'visibility' => 'public',
        'published_at' => now(), 'author_id' => $author->id, 'slug' => 'a-note', 'title' => 'A Note',
    ]);

    expect(Cache::has(CacheKeys::HOME))->toBeFalse()
        ->and(Cache::has(CacheKeys::RSS))->toBeFalse()
        ->and(Cache::has(CacheKeys::noteBody('a-note')))->toBeFalse();
});

it('forgets the original slug key when a post slug changes', function () {
    $author = User::factory()->create();
    $note = Post::factory()->create([
        'post_type' => 'note', 'status' => 'published', 'visibility' => 'public',
        'published_at' => now(), 'author_id' => $author->id, 'slug' => 'old-slug', 'title' => 'A Note',
    ]);

    Cache::forever(CacheKeys::noteBody('old-slug'), '<p>x</p>');
    $note->slug = 'new-slug';
    $note->save();

    expect(Cache::has(CacheKeys::noteBody('old-slug')))->toBeFalse();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./vendor/bin/pest tests/Feature/CacheInvalidationTest.php`
Expected: FAIL (CacheKeys class not found)

- [ ] **Step 3: Implement CacheKeys**

Create `app/Support/CacheKeys.php`:

```php
<?php

namespace App\Support;

use App\Models\{Post, Setting, SocialLink};
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class CacheKeys
{
    public const SOCIAL_LINKS = 'social_links';
    public const HOME = 'home';
    public const FEED = 'feed';
    public const RSS = 'rss';
    public const SITEMAP = 'sitemap';
    public const TOPICS = 'taxonomy.topics';
    public const NOTE_TAGS = 'taxonomy.note_tags';

    public static function setting(string $key): string
    {
        return 'setting.'.$key;
    }

    public static function noteBody(string $slug): string
    {
        return 'note.body.'.$slug;
    }

    /** Forget every key derived from site content (works on any cache store). */
    public static function flushContent(): void
    {
        foreach ([self::HOME, self::FEED, self::RSS, self::SITEMAP, self::TOPICS, self::NOTE_TAGS] as $key) {
            Cache::forget($key);
        }
    }

    /** Model-event entry point. */
    public static function flushFor(Model $model): void
    {
        self::flushContent();

        if ($model instanceof Post) {
            $slugs = array_unique(array_filter([
                $model->slug,
                $model->getOriginal('slug') ?: null,
            ]));

            foreach ($slugs as $slug) {
                Cache::forget(self::noteBody((string) $slug));
            }
        }

        if ($model instanceof Setting) {
            Cache::forget(self::setting((string) $model->key));
        }

        if ($model instanceof SocialLink) {
            Cache::forget(self::SOCIAL_LINKS);
        }
    }
}
```

- [ ] **Step 4: Implement the observer and register it**

Create `app/Observers/CacheFlushObserver.php`:

```php
<?php

namespace App\Observers;

use App\Support\CacheKeys;
use Illuminate\Database\Eloquent\Model;

class CacheFlushObserver
{
    public function saved(Model $model): void
    {
        CacheKeys::flushFor($model);
    }

    public function deleted(Model $model): void
    {
        CacheKeys::flushFor($model);
    }
}
```

In `app/Providers/AppServiceProvider.php` `boot()`, add after the `Vite::useHotFile` line:

```php
        foreach ([
            \App\Models\Post::class,
            \App\Models\Project::class,
            \App\Models\CollectedItem::class,
            \App\Models\Tag::class,
            \App\Models\Topic::class,
            \App\Models\SocialLink::class,
            \App\Models\Setting::class,
        ] as $model) {
            $model::observe(\App\Observers\CacheFlushObserver::class);
        }
```

- [ ] **Step 5: Cache Setting::get**

Rewrite `Setting::get()` in `app/Models/Setting.php`:

```php
    public static function get(string $key, ?string $default = null): ?string
    {
        $value = Cache::remember(
            CacheKeys::setting($key),
            now()->addHour(),
            fn () => static::where('key', $key)->value('value')
        );

        return $value ?? $default;
    }
```

Add imports: `use App\Support\CacheKeys;` and `use Illuminate\Support\Facades\Cache;`.

- [ ] **Step 6: Cache the shared social_links prop**

In `app/Http/Middleware/HandleInertiaRequests.php`, replace the `social_links` closure (lines 20–21) with:

```php
            'social_links' => fn () => Cache::remember(
                \App\Support\CacheKeys::SOCIAL_LINKS,
                now()->addHour(),
                fn () => SocialLink::where('visible', true)->orderBy('sort_order')
                    ->get(['platform', 'url', 'label'])
            ),
```

Add `use Illuminate\Support\Facades\Cache;`.

- [ ] **Step 7: Run tests to verify they pass**

Run: `./vendor/bin/pest`
Expected: PASS (full suite — observers must not break admin flows; Home/About tests exercise Setting/social paths)

- [ ] **Step 8: Commit**

```bash
git add app/Support/CacheKeys.php app/Observers/CacheFlushObserver.php app/Providers/AppServiceProvider.php app/Models/Setting.php app/Http/Middleware/HandleInertiaRequests.php tests/Feature/CacheInvalidationTest.php
git commit -m "feat: cache shared props and settings with event-driven invalidation"
```

---

### Task 7: Cache home, activity feed, RSS, sitemap, taxonomy lists

**Files:**
- Modify: `app/Http/Controllers/HomeController.php:11-31`
- Modify: `app/Services/FeedService.php`
- Modify: `app/Http/Controllers/SeoController.php` (`sitemap()`, `rss()`)
- Modify: `app/Http/Controllers/WritingController.php:39` (topics prop)
- Modify: `app/Http/Controllers/NoteController.php` (tags prop)
- Test: `tests/Feature/CacheInvalidationTest.php` (append)

**Interfaces:**
- Consumes: `CacheKeys` constants + `flushContent()` (Task 6) — every key written here is forgotten on any Post/Project/CollectedItem/Tag/Topic/Setting/SocialLink save or delete.
- Produces: cached payloads `HOME` (full Home props array, 5 min), `FEED` (latest 30 activity items, 5 min; `recent()` slices), `RSS` (full XML string, 5 min), `SITEMAP` (full XML string, 5 min), `TOPICS` (Collection, 5 min), `NOTE_TAGS` (Collection, 5 min).

- [ ] **Step 1: Write failing test**

Append to `tests/Feature/CacheInvalidationTest.php`:

```php
it('caches home, feed, rss and sitemap, and flushes them on content save', function () {
    $this->get('/')->assertOk();
    $this->get('/activity')->assertOk();
    $this->get('/rss.xml')->assertOk();
    $this->get('/sitemap.xml')->assertOk();

    expect(Cache::has(CacheKeys::HOME))->toBeTrue()
        ->and(Cache::has(CacheKeys::FEED))->toBeTrue()
        ->and(Cache::has(CacheKeys::RSS))->toBeTrue()
        ->and(Cache::has(CacheKeys::SITEMAP))->toBeTrue();

    $author = User::factory()->create();
    Post::factory()->create([
        'post_type' => 'article', 'status' => 'published', 'visibility' => 'public',
        'published_at' => now(), 'author_id' => $author->id, 'title' => 'Fresh Post', 'slug' => 'fresh-post',
    ]);

    expect(Cache::has(CacheKeys::HOME))->toBeFalse()
        ->and(Cache::has(CacheKeys::FEED))->toBeFalse()
        ->and(Cache::has(CacheKeys::RSS))->toBeFalse()
        ->and(Cache::has(CacheKeys::SITEMAP))->toBeFalse();

    // Second pass repopulates and serves from cache.
    $this->get('/')->assertOk();
    $this->get('/activity')->assertOk();
    expect(Cache::has(CacheKeys::HOME))->toBeTrue()
        ->and(Cache::has(CacheKeys::FEED))->toBeTrue();
});

it('caches the writing topics and notes tag lists', function () {
    $this->get('/writing')->assertOk();
    $this->get('/notes')->assertOk();

    expect(Cache::has(CacheKeys::TOPICS))->toBeTrue()
        ->and(Cache::has(CacheKeys::NOTE_TAGS))->toBeTrue();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./vendor/bin/pest tests/Feature/CacheInvalidationTest.php`
Expected: FAIL (`HOME` not cached)

- [ ] **Step 3: Cache HomeController**

Rewrite `HomeController::__invoke()` (lines 11–31) to:

```php
    public function __invoke(): Response
    {
        $data = \Illuminate\Support\Facades\Cache::remember(
            \App\Support\CacheKeys::HOME,
            now()->addMinutes(5),
            function (): array {
                $hero = HomeHero::load();

                return [
                    'hero' => $hero->toArray() + [
                        'avatar_url' => $hero->avatarUrl(),
                        'logo_url' => $hero->logoUrl(),
                        'initials' => $hero->initials(),
                    ],
                    'og_image' => $hero->avatarUrl() !== null
                        ? url($hero->avatarUrl())
                        : null,
                    'featured' => $this->featured(),
                    'writings' => $this->writings(),
                    'explore' => [
                        'projects' => Project::publiclyVisible()->count(),
                        'collected' => CollectedItem::publiclyVisible()->count(),
                    ],
                ];
            }
        );

        return Inertia::render('Home', $data);
    }
```

- [ ] **Step 4: Cache FeedService**

Refactor `app/Services/FeedService.php`: rename the current `recent()` body into a private `build(int $limit): array` (exactly the current loop/usort code, returning the array), then:

```php
    /**
     * Latest activity items. The cache always holds the newest 30 entries;
     * callers slice down to $limit. Flushed via CacheKeys::FEED on any
     * content save/delete.
     */
    public function recent(int $limit = 12): array
    {
        $items = Cache::remember(
            CacheKeys::FEED,
            now()->addMinutes(5),
            fn (): array => $this->build(30)
        );

        return array_slice($items, 0, $limit);
    }
```

Imports: `use App\Support\CacheKeys;` and `use Illuminate\Support\Facades\Cache;`.

- [ ] **Step 5: Cache SeoController rss + sitemap**

In `app/Http/Controllers/SeoController.php`:

- `sitemap()`: move everything from `$static = ...` through building `$body` into `private function buildSitemap(): string` (returning the final XML string), then:

```php
    public function sitemap(): Response
    {
        $content = Cache::remember(
            CacheKeys::SITEMAP,
            now()->addMinutes(5),
            fn () => $this->buildSitemap()
        );

        return response($content, 200, ['Content-Type' => 'application/xml']);
    }
```

- `rss()`: move the `$posts = ...` + `$items = ...` body into `private function buildRss(): string` (returning the complete XML document exactly as the current method returns it), then:

```php
    public function rss(): Response
    {
        $content = Cache::remember(
            CacheKeys::RSS,
            now()->addMinutes(5),
            fn () => $this->buildRss()
        );

        return response($content, 200, ['Content-Type' => 'application/xml']);
    }
```

Keep `robots()` untouched. Add imports `App\Support\CacheKeys`, `Illuminate\Support\Facades\Cache`.

- [ ] **Step 6: Cache taxonomy lists**

`WritingController::index` line 39 — replace:

```php
            'topics' => Topic::orderBy('name')->get(['name', 'slug']),
```

with:

```php
            'topics' => \Illuminate\Support\Facades\Cache::remember(
                \App\Support\CacheKeys::TOPICS,
                now()->addMinutes(5),
                fn () => Topic::orderBy('name')->get(['name', 'slug'])
            ),
```

`NoteController::index` — replace the `'tags' => Tag::whereHas(...)` value (lines 35–36) with:

```php
            'tags' => \Illuminate\Support\Facades\Cache::remember(
                \App\Support\CacheKeys::NOTE_TAGS,
                now()->addMinutes(5),
                fn () => Tag::whereHas('posts', fn ($q2) => $q2->where('post_type', 'note'))
                    ->orderBy('name')->get(['name', 'slug'])
            ),
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `./vendor/bin/pest`
Expected: PASS — note `NoteSnippetTest`'s RSS/activity tests must pass: their `makeTitlelessNote()` fires the observer (Task 6) which flushes before the assertions read.

- [ ] **Step 8: Commit**

```bash
git add app/Http/Controllers/HomeController.php app/Services/FeedService.php app/Http/Controllers/SeoController.php app/Http/Controllers/WritingController.php app/Http/Controllers/NoteController.php tests/Feature/CacheInvalidationTest.php
git commit -m "feat: cache home, feed, rss, sitemap and taxonomy lists"
```

---

### Task 8: Notes index payload + on-demand body endpoint

**Files:**
- Modify: `app/Http/Controllers/NoteController.php` (index props, new `body()` method)
- Modify: `routes/web.php` (add `notes.body` route before `notes.show`)
- Modify: `resources/js/Components/NoteFeedItem.tsx` (rewrite for async load)
- Modify: `resources/js/Pages/Notes/Index.tsx` (drop `body_html`, pass `slug`)
- Test: `tests/Feature/NoteSnippetTest.php` (edit + append), `tests/Feature/NotesTest.php` (append)
- Test: `resources/js/Components/__tests__/NoteFeedItem.test.tsx` (rewrite)

**Interfaces:**
- Consumes: `CacheKeys::noteBody()` + observer flush (Task 6), `MarkdownService` (existing).
- Produces:
  - Notes index props: `notes.data[] = { slug, headline, teaser, date, tags }` — **no `body_html`**
  - `GET /notes/{slug}/body` → `200 {"body_html": "<p>…"}` for publicly visible notes; `404` otherwise. Name: `notes.body`.
  - `NoteFeedItem` props: `{ slug: string; teaser: string; date: string | null; tags: string[]; initialBodyHtml?: string | null }` — fetches `/notes/{slug}/body` on "read more", shows `Loading…`, and a `Try again` button on failure.

- [ ] **Step 1: Write failing Pest tests**

Edit the existing test `'exposes headline, teaser, and body_html in the notes stream payload'` in `tests/Feature/NoteSnippetTest.php` — rename to `'exposes headline and teaser but not body_html in the notes stream payload'` and change its closure to:

```php
        ->where('notes.data.0', function ($note) {
            if (! isset($note['headline'], $note['teaser'], $note['slug'])) {
                return false;
            }
            $base = rtrim($note['headline'], '…');

            return str_ends_with($note['headline'], '…')
                && mb_strlen($note['headline']) <= 91
                && str_starts_with($note['headline'], 'Why does there seem')
                && $note['teaser'] !== ''
                && mb_strlen($note['teaser']) <= 281
                && ! str_starts_with($note['teaser'], $base);
        })
        ->missing('notes.data.0.body_html')
        ->missing('notes.data.0.excerpt_text'));
```

Append to `tests/Feature/NotesTest.php`:

```php
it('serves a note body for inline expansion when the note is publicly visible', function () {
    $author = User::factory()->create();
    Post::factory()->create([
        'post_type' => 'note', 'status' => 'published', 'visibility' => 'public',
        'published_at' => now(), 'author_id' => $author->id,
        'slug' => 'bold-note', 'title' => 'Bold Note', 'body' => '**strong** point',
    ]);

    $body = $this->get('/notes/bold-note/body')->assertOk()->json();

    expect($body['body_html'])->toContain('<strong>strong</strong>');
});

it('404s the note body endpoint for drafts, private notes and articles', function () {
    $author = User::factory()->create();
    Post::factory()->create([
        'post_type' => 'note', 'status' => 'draft', 'author_id' => $author->id,
        'slug' => 'draft-note', 'title' => 'Draft', 'body' => 'secret',
    ]);
    Post::factory()->create([
        'post_type' => 'article', 'status' => 'published', 'visibility' => 'public',
        'published_at' => now(), 'author_id' => $author->id,
        'slug' => 'an-article', 'title' => 'Article', 'body' => '<p>hi</p>',
    ]);

    $this->get('/notes/draft-note/body')->assertNotFound();
    $this->get('/notes/an-article/body')->assertNotFound();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./vendor/bin/pest tests/Feature/NoteSnippetTest.php tests/Feature/NotesTest.php`
Expected: FAIL (`body_html` still present in index payload; `/notes/{slug}/body` 404s)

- [ ] **Step 3: Implement backend**

In `app/Http/Controllers/NoteController.php`:

1. Index `through()` — remove the `'body_html' => $markdown->render((string) $p->body),` line (keep `slug`, `headline`, `teaser`, `date`, `tags`).
2. Add the new method (add `use Illuminate\Http\JsonResponse;`):

```php
    public function body(string $slug, MarkdownService $markdown): JsonResponse
    {
        $note = Post::publiclyVisible()->ofType('note')->where('slug', $slug)->firstOrFail();

        return response()->json([
            'body_html' => Cache::remember(
                CacheKeys::noteBody($slug),
                now()->addHour(),
                fn () => $markdown->render((string) $note->body)
            ),
        ]);
    }
```

Add imports: `App\Support\CacheKeys`, `Illuminate\Support\Facades\Cache`.

In `routes/web.php`, add **before** the `notes.show` route:

```php
Route::get('/notes/{slug}/body', [\App\Http\Controllers\NoteController::class, 'body'])
    ->where('slug', '[A-Za-z0-9\-]+')
    ->name('notes.body');
```

- [ ] **Step 4: Run backend tests to verify they pass**

Run: `./vendor/bin/pest`
Expected: PASS

- [ ] **Step 5: Write failing Vitest tests**

Rewrite `resources/js/Components/__tests__/NoteFeedItem.test.tsx`:

```tsx
import { test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NoteFeedItem } from '../NoteFeedItem';

const TEASER = 'A short teaser for the note.';
const BODY_HTML = '<p>A short teaser for the note. And some more text that was cut off.</p>';

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

function mockFetchOk(body: string) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ body_html: body }),
    }));
}

test('renders teaser with a read more button', () => {
    render(<NoteFeedItem slug="quiet" teaser={TEASER} date="Oct 20, 2026" tags={['writing']} />);

    expect(screen.getByText(TEASER)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'read more' })).toBeInTheDocument();
});

test('clicking read more fetches the body and expands', async () => {
    mockFetchOk(BODY_HTML);
    render(<NoteFeedItem slug="quiet" teaser={TEASER} date="Oct 20, 2026" tags={['writing']} />);

    fireEvent.click(screen.getByRole('button', { name: 'read more' }));

    expect(await screen.findByText(/And some more text that was cut off/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'read more' })).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('/notes/quiet/body');
});

test('shows a loading state while fetching, then the body', async () => {
    let resolve!: (v: unknown) => void;
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise((r) => { resolve = r; })));
    render(<NoteFeedItem slug="quiet" teaser={TEASER} date={null} tags={[]} />);

    fireEvent.click(screen.getByRole('button', { name: 'read more' }));

    expect(screen.getByText('Loading…')).toBeInTheDocument();

    resolve({ ok: true, json: async () => ({ body_html: '<p>done</p>' }) });

    expect(await screen.findByText('done')).toBeInTheDocument();
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
});

test('shows a retry affordance when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    render(<NoteFeedItem slug="quiet" teaser={TEASER} date={null} tags={[]} />);

    fireEvent.click(screen.getByRole('button', { name: 'read more' }));

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
});

test('renders date and tags in the meta line', () => {
    render(<NoteFeedItem slug="quiet" teaser={TEASER} date="Oct 20, 2026" tags={['writing', 'life']} />);

    expect(screen.getByText(/Oct 20, 2026/)).toBeInTheDocument();
    expect(screen.getByText('writing')).toBeInTheDocument();
    expect(screen.getByText('life')).toBeInTheDocument();
});
```

- [ ] **Step 6: Run Vitest to verify it fails**

Run: `npm test -- NoteFeedItem`
Expected: FAIL (component still requires `bodyHtml` prop)

- [ ] **Step 7: Rewrite NoteFeedItem**

Replace `resources/js/Components/NoteFeedItem.tsx` entirely with:

```tsx
import { useState } from 'react';
import { MetaLine } from '@/Components/MetaLine';
import { Prose } from '@/Components/Prose';

export function NoteFeedItem({
    slug,
    teaser,
    date,
    tags,
    initialBodyHtml = null,
}: {
    slug: string;
    teaser: string;
    date: string | null;
    tags: string[];
    initialBodyHtml?: string | null;
}) {
    const [expanded, setExpanded] = useState(false);
    const [bodyHtml, setBodyHtml] = useState<string | null>(initialBodyHtml);
    const [failed, setFailed] = useState(false);

    const load = async () => {
        setFailed(false);
        try {
            const res = await fetch(`/notes/${encodeURIComponent(slug)}/body`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = (await res.json()) as { body_html: string };
            setBodyHtml(data.body_html);
        } catch {
            setFailed(true);
        }
    };

    const onExpand = () => {
        setExpanded(true);
        if (bodyHtml === null) void load();
    };

    return (
        <article className="py-6">
            <MetaLine date={date ?? undefined} items={tags} />
            {expanded ? (
                <div className="mt-2">
                    {bodyHtml !== null ? (
                        <Prose html={bodyHtml} />
                    ) : failed ? (
                        <p className="text-[15px] leading-relaxed text-ink">
                            Couldn’t load the note.{' '}
                            <button type="button" onClick={() => void load()} className="text-link hover:underline">
                                Try again
                            </button>
                        </p>
                    ) : (
                        <p className="text-sm text-meta" aria-live="polite">
                            Loading…
                        </p>
                    )}
                </div>
            ) : (
                <p className="mt-2 text-[15px] leading-relaxed text-ink">
                    {teaser}{' '}
                    <button type="button" onClick={onExpand} className="text-link hover:underline">
                        read more
                    </button>
                </p>
            )}
        </article>
    );
}
```

- [ ] **Step 8: Update Notes/Index**

In `resources/js/Pages/Notes/Index.tsx`:

1. Line 10 type — change to:

```ts
type NoteRow = { slug: string; teaser: string; date: string | null; tags: string[] };
```

2. Lines 67–73 — change the `NoteFeedItem` usage to:

```tsx
                        <NoteFeedItem
                            key={note.slug}
                            slug={note.slug}
                            teaser={note.teaser}
                            date={note.date}
                            tags={note.tags}
                        />
```

- [ ] **Step 9: Run frontend checks**

Run: `npm test -- NoteFeedItem && npx tsc --noEmit`
Expected: both PASS

- [ ] **Step 10: Commit**

```bash
git add app/Http/Controllers/NoteController.php routes/web.php resources/js/Components/NoteFeedItem.tsx resources/js/Pages/Notes/Index.tsx tests/Feature/NoteSnippetTest.php tests/Feature/NotesTest.php resources/js/Components/__tests__/NoteFeedItem.test.tsx
git commit -m "perf: load note bodies on demand instead of shipping them in the index"
```

---

### Task 9: Inertia prefetching (hover nav + visible list rows)

**Files:**
- Modify: `resources/js/Layouts/PublicLayout.tsx`
- Modify: `resources/js/Components/MobileDrawer.tsx:148`
- Modify: `resources/js/Components/PostRow.tsx:19`
- Modify: `resources/js/Components/Pagination.tsx:11`
- Modify: `resources/js/Components/home/FeaturedStrip.tsx:30`, `resources/js/Components/home/Explore.tsx:25`, `resources/js/Components/home/Hero.tsx:62`
- Modify: `resources/js/Pages/Projects/Index.tsx:57,74`, `resources/js/Pages/Collected/Index.tsx:85`, `resources/js/Pages/Collected/Show.tsx:66`

**Interfaces:**
- Consumes: Inertia v3 `Link` `prefetch` prop (`"hover" | "visible" | "tap" | true`). Admin links untouched.
- Produces: nav/footer/drawer links prefetch on hover; list-row and home links prefetch when scrolled into view.

- [ ] **Step 1: PublicLayout**

- Nav item `Link` (line 35): add `prefetch="hover"` prop.
- Logo `Link` (line 29): add `prefetch="hover"`.
- Footer `Link`s for `/activity`, `/writing`, `/ask` (lines 55, 58, 61): add `prefetch="hover"` each.

Example (nav):

```tsx
                            <Link
                                key={item.href}
                                href={item.href}
                                prefetch="hover"
                                className={`text-sm font-medium ${
                                    current === item.href ? 'text-primary' : 'text-meta hover:text-ink'
                                }`}
                            >
                                {item.label}
                            </Link>
```

- [ ] **Step 2: MobileDrawer**

Add `prefetch="hover"` to the nav-item `Link` at line 148 (alongside `onClick={close}`).

- [ ] **Step 3: PostRow + Pagination**

`PostRow.tsx` line 19:

```tsx
                <Link href={href} prefetch="visible" className="text-ink hover:text-link">
```

`Pagination.tsx` line 11 `Link` — add `prefetch="visible"` alongside `preserveScroll`.

- [ ] **Step 4: Home components**

- `Hero.tsx` line 62 `Link href="/writing"`: add `prefetch="visible"`.
- `WritingList.tsx` line 20 `Link href="/writing"`: add `prefetch="visible"`.
- `FeaturedStrip.tsx` line 30 item `Link`: add `prefetch="visible"`.
- `Explore.tsx` line 25 `Link`: add `prefetch="visible"`.

- [ ] **Step 5: Projects + Collected lists**

- `Projects/Index.tsx` lines 57 and 74 item `Link`s: add `prefetch="visible"`.
- `Collected/Index.tsx` line 85 item `Link`: add `prefetch="visible"`.
- `Collected/Show.tsx` line 66 item `Link`: add `prefetch="visible"`.

- [ ] **Step 6: Type check + tests**

Run: `npx tsc --noEmit && npm test`
Expected: PASS (all Vitest suites green — `nav.test`/`MobileDrawer.test` render the touched components)

- [ ] **Step 7: Commit**

```bash
git add resources/js/Layouts/PublicLayout.tsx resources/js/Components/MobileDrawer.tsx resources/js/Components/PostRow.tsx resources/js/Components/Pagination.tsx resources/js/Components/home resources/js/Pages/Projects/Index.tsx resources/js/Pages/Collected/Index.tsx resources/js/Pages/Collected/Show.tsx
git commit -m "feat: prefetch public links on hover and visibility"
```

---

### Task 10: SSR runtime (Node stage, bundle, supervisor, gitignore)

**Files:**
- Modify: `.dockerignore` (stop excluding `vite.config.ts`)
- Modify: `Dockerfile` (multi-stage: node build + node runtime copy)
- Modify: `conf/supervisor/supervisord.conf` (add `[program:ssr]`)
- Modify: `.gitignore` (ignore `/bootstrap/ssr`)
- Test: `tests/Feature/DeploymentAssetsTest.php` (append)

**Interfaces:**
- Consumes: `resources/js/ssr.tsx` (exists, verified), `vite.config.ts` `ssr:` entry (exists), `INERTIA_SSR_ENABLED` (Task 1 Docker ENV = true; local `.env` = false from Task 2), inertia-laravel `php artisan inertia:start-ssr` (vendor confirmed), bundle path `bootstrap/ssr/*` (BundleDetector probes `ssr.js`/`ssr.mjs`/`app.js`/`app.mjs`).
- Produces: production image builds client+SSR bundles in `node:22-bookworm-slim` stage, copies `public/build` + `bootstrap/ssr` + `/usr/local/bin/node` into the PHP image; supervisor starts `php artisan inertia:start-ssr` alongside php-fpm/nginx; Inertia renders first paint as HTML with graceful CSR fallback.

- [ ] **Step 1: Write failing tests**

Append to `tests/Feature/DeploymentAssetsTest.php`:

```php
it('runs the inertia ssr server under supervisord', function () {
    $conf = file_get_contents(base_path('conf/supervisor/supervisord.conf'));

    expect($conf)->toContain('[program:ssr]')
        ->and($conf)->toContain('php artisan inertia:start-ssr');
});

it('builds the ssr bundle and ships node in the image', function () {
    $dockerfile = file_get_contents(base_path('Dockerfile'));

    expect($dockerfile)->toContain('FROM node:22-bookworm-slim AS ssr-build')
        ->and($dockerfile)->toContain('RUN npm run build')
        ->and($dockerfile)->toContain('--from=ssr-build /var/www/html/bootstrap/ssr')
        ->and($dockerfile)->toContain('--from=node:22-bookworm-slim /usr/local/bin/node');
});

it('keeps vite.config.ts in the docker build context', function () {
    $ignore = file_get_contents(base_path('.dockerignore'));

    expect($ignore)->not->toContain('vite.config.ts');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./vendor/bin/pest tests/Feature/DeploymentAssetsTest.php`
Expected: FAIL (new tests)

- [ ] **Step 3: Fix .dockerignore and .gitignore**

- `.dockerignore`: delete the line `vite.config.ts`.
- `.gitignore`: append:

```
/bootstrap/ssr
```

- [ ] **Step 4: Restructure the Dockerfile into multi-stage**

Final Dockerfile:

```dockerfile
FROM node:22-bookworm-slim AS ssr-build
WORKDIR /var/www/html
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM php:8.4.27-fpm-bookworm

# Today's security patch (2026-10-21: CVE-2026-109618 / CVE-2026-109619).
# Fail the build loudly on any other PHP version.
RUN php -r 'if (PHP_VERSION === "8.4.27") exit(0); fwrite(STDERR, "unpatched PHP: " . PHP_VERSION . "\n"); exit(1);'

RUN apt-get update && apt-get install -y --no-install-recommends \
        nginx \
        supervisor \
        curl \
        unzip \
        libpq-dev \
        libonig-dev \
        libzip-dev \
        libstdc++6 \
    && docker-php-ext-install -j"$(nproc)" pdo_pgsql mbstring opcache zip \
    && pecl install redis && docker-php-ext-enable redis \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
ENV COMPOSER_ALLOW_SUPERUSER=1

WORKDIR /var/www/html

COPY . .

RUN composer install --no-dev --optimize-autoloader --no-interaction --no-progress \
    && rm -rf /root/.composer/cache

# Fresh frontend + SSR bundles built by the node stage (source of truth at
# image build time; committed public/build remains for local dev convenience).
COPY --from=ssr-build /var/www/html/public/build public/build
COPY --from=ssr-build /var/www/html/bootstrap/ssr bootstrap/ssr
COPY --from=node:22-bookworm-slim /usr/local/bin/node /usr/local/bin/node

COPY conf/php-fpm/zz-timadey.conf /usr/local/etc/php-fpm.d/zz-timadey.conf
COPY conf/php/opcache.ini $PHP_INI_DIR/conf.d/opcache.ini

RUN rm -f /etc/nginx/sites-enabled/default \
    && cp conf/nginx/nginx-site.conf /etc/nginx/sites-available/timadey.conf \
    && ln -s /etc/nginx/sites-available/timadey.conf /etc/nginx/sites-enabled/timadey.conf \
    && chmod +x scripts/00-laravel-deploy.sh scripts/start.sh

ENV APP_ENV=production
ENV APP_DEBUG=false
ENV LOG_CHANNEL=stderr
ENV CACHE_STORE=redis
ENV SESSION_DRIVER=redis
ENV INERTIA_SSR_ENABLED=true

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -fsS http://127.0.0.1/up || exit 1

CMD ["/var/www/html/scripts/start.sh"]
```

Preserve the exact PHP pin/guard, existing install lines, nginx/supervisor copies, healthcheck, and CMD from the current file (Task 1 edits are folded in above).

- [ ] **Step 5: Add the ssr program to supervisor**

Append to `conf/supervisor/supervisord.conf`:

```ini
[program:ssr]
command=php artisan inertia:start-ssr
directory=/var/www/html
autostart=true
autorestart=unexpected
startretries=5
priority=30
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
```

(`autorestart=unexpected` + `startretries=5`: a missing/disabled SSR bundle settles in FATAL after 5 tries instead of hot-looping; php-fpm/nginx are unaffected, and Inertia falls back to CSR.)

- [ ] **Step 6: Verify local SSR bundle builds**

Run: `rm -rf bootstrap/ssr && npm run build && ls bootstrap/ssr/`
Expected: `bootstrap/ssr/` contains `ssr.js` or `ssr.mjs` (plus client assets in `public/build`)

Run: `git status --short | grep bootstrap` → no output (gitignored)

- [ ] **Step 7: Run tests**

Run: `./vendor/bin/pest tests/Feature/DeploymentAssetsTest.php`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add .dockerignore .gitignore Dockerfile conf/supervisor/supervisord.conf tests/Feature/DeploymentAssetsTest.php
git commit -m "feat: build and run inertia ssr in production"
```

---

### Task 11: Full verification

**Files:** none (verification only; fix regressions in place)

- [ ] **Step 1: Backend suite**

Run: `./vendor/bin/pest`
Expected: PASS (0 failures)

- [ ] **Step 2: Frontend unit + types + build**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: PASS; build output includes `bootstrap/ssr/` and `public/build/manifest.json`

- [ ] **Step 3: Targeted e2e (notes expand + search filter)**

Prepare the QA database (destructive to the QA fixture DB only):

```bash
DB_DATABASE=timadey_qa_browser php artisan migrate:fresh --seed
npx playwright test e2e/quick-note.spec.ts e2e/search-filter.spec.ts
```

Expected: PASS — `quick-note` "read more" now fetches `/notes/{slug}/body`; Playwright auto-waits for the expanded content. If `search-filter` fails only on `?q=` matching, re-check `Fts::prefixQuery` behavior against the seeded keyword (Task 3).

- [ ] **Step 4: Docker image build + smoke (if Docker available)**

```bash
docker build -t timadey-perf-check .
docker run --rm --entrypoint node timadey-perf-check --version
docker run --rm --entrypoint php timadey-perf-check -i | grep -E 'opcache\.(enable|validate_timestamps|memory_consumption|interned_strings_buffer|max_accelerated_files|save_comments)'
```

Expected: node prints `v22.x`; php prints the Task 1 opcache values with `validate_timestamps => 0`.

- [ ] **Step 5: Redis smoke in production-like env (Coolify deploy)**

After deploy, on the VPS:

```bash
docker exec <container> php artisan tinker --execute="cache()->put('smoke', 1, 10); dump(cache()->get('smoke'));"
docker exec <container> php -i | grep validate_timestamps
docker exec <container> ps aux | grep -E 'php-fpm|nginx|inertia:start-ssr|node' | grep -v grep
curl -sI https://<site>/ | head -5   # then confirm HTML body is server-rendered (view-source shows note/post content before scripts)
```

Expected: `1`; `validate_timestamps => 0`; process list shows php-fpm, nginx, and the `inertia:start-ssr` PHP process plus its `node …/bootstrap/ssr/*` child; SSR HTML present (view-source has content before the scripts).

- [ ] **Step 6: Final commit (only if fixes were needed)**

```bash
git add -A && git commit -m "fix: address verification findings" || echo "no changes"
```
