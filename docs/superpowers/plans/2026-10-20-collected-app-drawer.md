# Collected App Drawer & Per-Medium Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/collected` into an app-drawer home (monochrome category tiles in Finder-window chrome) with per-medium category pages (Books shelf, editorial list, video grid, music shelf, Finder tools, website cards), a blurred detail modal for annotated items, and optional cover images.

**Architecture:** One shared backend mapping + one new route `/collected/{type}` (plural segment → singular `item_type` via `App\Support\CollectedTypes`) renders `Collected/Show`, a shell that mounts a per-type view from `views/registry.ts`. The drawer (`Collected/Index`) shows category tiles (counts from the controller, empty types omitted) plus Spotlight-style search results. Item clicks follow the mixed rule: annotation → `ItemModal` (backdrop-blur), no annotation → external link; Tools always open the modal. All motion is pure CSS (spring cubic-beziers, stagger, measured icon→page launch) gated by the existing global `prefers-reduced-motion` kill-switch.

**Tech Stack:** Laravel 12 + Inertia React 3 + TypeScript strict, Tailwind v4 (design tokens only), lucide-react icons, Pest 4, Vitest + Testing Library, Playwright. **No new JS dependencies.**

## Global Constraints

- **No new runtime JS/npm dependencies.** Motion is CSS-only but must feel spring-grade: pops/staggers `cubic-bezier(.34,1.56,.64,1)`, page pushes/modal/backdrop `cubic-bezier(.32,.72,0,1)`. The existing `@media (prefers-reduced-motion: reduce)` block in `resources/css/app.css` `@layer base` must keep covering every animation added.
- **Monochrome only for tiles/placeholder art:** `bg-surface` + `border-hairline` + `text-ink` glyph. No gradients, no color fills in drawer/tiles/placeholders. The one black overlay allowed is the video tile bottom scrim: `bg-[linear-gradient(to_top,rgba(0,0,0,0.6),transparent)]`.
- **Design tokens only:** `text-ink|meta|link`, `bg-surface|primary|white`, `border-hairline`, `--radius-sm/md`, fonts Inter (sans) + Source Serif 4 (`font-serif`).
- **Mixed click rule:** `annotation` present → open `ItemModal`; absent → external `url` link (new tab); **Tools always open the modal**, Visit button hidden when `url` is null.
- **Categories:** zero-public types omitted from the drawer; `/collected/{segment}` 404s for unknown segments and for categories with zero public items; `?tag=` filtering to zero renders `EmptyState`, never 404. Private items never appear on any public surface.
- **Ordering:** `latest('created_at')` everywhere. Pagination 20/page, `withQueryString()`. Search debounce 300ms with `router.get(..., { preserveState: true, preserveScroll: true })`.
- **URL segments (plural):** `books, articles, videos, podcasts, music, tools, quotes, websites, others`.
- **Vitest tests live ONLY in `resources/js/Components/__tests__/`.** A `*.test.tsx` under `resources/js/Pages/**` breaks the Inertia page glob — this burned the repo before (commit 734e70b).
- **TypeScript strict, no `any` in product code** (`any` only inside `vi.mock` factories, as existing tests do).
- Test styles: Pest `it(...)`/`expect(...)`; Vitest imports `test/expect/vi` from `vitest` even though globals are on.
- Commit after every task (`feat:` / `fix:` / `test:` / `docs:`).

**Commands used throughout:**

```bash
php artisan migrate                                    # dev DB
php artisan test tests/Feature/CollectedPublicTest.php # single Pest file
php artisan test tests/Unit/CollectedTypesTest.php
php artisan test                                       # full backend suite
npm test -- Components/__tests__/ItemModal.test.tsx    # single Vitest file
npm test                                               # all Vitest
npm run build                                          # compile check (no tsc script exists)
npm run test:e2e                                       # Playwright (build first; QA DB has demo content)
```

**Run-order note:** execute tasks in numeric order **except Task 3 runs right after Task 4** (admin pages import `@/collectedTypes`, created in Task 4). Final order: 1, 2, 4, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16.

## File Structure

**Create:**

| Path | Responsibility |
|---|---|
| `app/Support/CollectedTypes.php` | Single source of truth: type→label, segment↔type maps, `values()`, `label()`, `segment()`, `fromSegment()` |
| `database/migrations/2026_10_20_000001_add_cover_image_to_collected_items_table.php` | nullable `cover_image` column |
| `tests/Unit/CollectedTypesTest.php` | Unit tests for the support class |
| `tests/Feature/CollectedShowTest.php` | Category page behaviors |
| `resources/js/collectedTypes.ts` | Frontend mirror: types + labels/segments/verbs/glyphs |
| `resources/js/motion.ts` | `isCoarsePointer()`, `prefersReducedMotion()` (matchMedia-safe) |
| `resources/js/Components/collected/CoverImage.tsx` | Cover img + monochrome placeholder (initials/glyph), `onError` fallback |
| `resources/js/Components/collected/ItemModal.tsx` | Blurred backdrop detail modal (focus trap, Esc, exit anim) |
| `resources/js/Components/collected/ItemTitle.tsx` | Mixed-rule title renderer (button/anchor/plain) |
| `resources/js/Components/collected/ItemTags.tsx` | Tag chips → `?tag=` on the item's category |
| `resources/js/Pages/Collected/Show.tsx` | Category shell: back, h1, count, tag chips, view slot, pagination, modal, launch/leave motion |
| `resources/js/Pages/Collected/views/registry.ts` | `ViewProps` + `resolveView` |
| `resources/js/Pages/Collected/views/EditorialList.tsx` | Articles + fallback (lead story + rows) |
| `resources/js/Pages/Collected/views/BooksGrid.tsx` | Apple Books snap-shelf + grid |
| `resources/js/Pages/Collected/views/VideoGrid.tsx` | 16:9 tiles with scrim |
| `resources/js/Pages/Collected/views/MusicShelf.tsx` | 1:1 snap-rail + dense grid |
| `resources/js/Pages/Collected/views/FinderTools.tsx` | Finder window: listbox icon grid, arrow keys, drag/swipe pan, always-modal |
| `resources/js/Pages/Collected/views/WebsiteCards.tsx` | Browser-framed link cards |
| `resources/js/Components/__tests__/collectedFixtures.ts` | `makeItem()` fixture |
| `resources/js/Components/__tests__/*.test.tsx` | One suite per task (named in each task) |
| `e2e/collected-drawer.spec.ts` | Drawer → category → back, search modal, tools keyboard, books shelf |

**Modify:** `CollectedController.php`, `Api/CollectedItemController.php`, `StoreCollectedItemRequest.php`, `Admin/CollectedItemController.php`, `CollectedItem.php`, `CollectedItemResource.php`, `routes/web.php`, `DemoContentSeeder.php`, `docs/api.md`, `resources/css/app.css`, `Components/Button.tsx`, `Pages/Collected/Index.tsx`, `Pages/Admin/Collected/{Edit,Index}.tsx`, `tests/Feature/{CollectedPublicTest,AdminCollectedTest,PublicApiTest}.php`.

---

### Task 1: Backend `CollectedTypes` support class

**Files:** Create `app/Support/CollectedTypes.php`, `tests/Unit/CollectedTypesTest.php`; Modify `CollectedController.php:11-21,27,51-54`, `Api/CollectedItemController.php:12,19`, `StoreCollectedItemRequest.php:21`.

**Interfaces:**
- Produces: `CollectedTypes::TYPES` (singular→label), `CollectedTypes::SEGMENTS` (plural→singular), `values(): array<int,string>`, `label(string): string`, `segment(string): ?string`, `fromSegment(string): ?string`. Later tasks rely on exactly these names.

- [ ] **Step 1: Write the failing unit test** — `tests/Unit/CollectedTypesTest.php`:

```php
<?php

use App\Support\CollectedTypes;

it('maps every type to a label and a url segment', function () {
    expect(CollectedTypes::TYPES)->toHaveCount(9)
        ->and(CollectedTypes::SEGMENTS)->toHaveCount(9)
        ->and(CollectedTypes::values())->toBe(['book', 'article', 'video', 'podcast', 'music', 'tool', 'quote', 'website', 'other']);
});

it('converts between singular types and plural segments', function () {
    expect(CollectedTypes::segment('book'))->toBe('books')
        ->and(CollectedTypes::segment('music'))->toBe('music')
        ->and(CollectedTypes::fromSegment('books'))->toBe('book')
        ->and(CollectedTypes::fromSegment('others'))->toBe('other');
});

it('returns null for unknown segments and types', function () {
    expect(CollectedTypes::fromSegment('nope'))->toBeNull()
        ->and(CollectedTypes::segment('nope'))->toBeNull();
});

it('labels known types and falls back to Other', function () {
    expect(CollectedTypes::label('music'))->toBe('Music')
        ->and(CollectedTypes::label('bogus'))->toBe('Other');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `php artisan test tests/Unit/CollectedTypesTest.php`
Expected: FAIL — `App\Support\CollectedTypes not found`.

- [ ] **Step 3: Write the support class** — `app/Support/CollectedTypes.php`:

```php
<?php

namespace App\Support;

final class CollectedTypes
{
    /** Singular item type => display label. */
    public const TYPES = [
        'book' => 'Books',
        'article' => 'Articles',
        'video' => 'Videos',
        'podcast' => 'Podcasts',
        'music' => 'Music',
        'tool' => 'Tools',
        'quote' => 'Quotes',
        'website' => 'Websites',
        'other' => 'Other',
    ];

    /** URL segment (plural) => singular item type. */
    public const SEGMENTS = [
        'books' => 'book',
        'articles' => 'article',
        'videos' => 'video',
        'podcasts' => 'podcast',
        'music' => 'music',
        'tools' => 'tool',
        'quotes' => 'quote',
        'websites' => 'website',
        'others' => 'other',
    ];

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_keys(self::TYPES);
    }

    public static function label(string $type): string
    {
        return self::TYPES[$type] ?? self::TYPES['other'];
    }

    public static function segment(string $type): ?string
    {
        $segment = array_search($type, self::SEGMENTS, true);

        return $segment === false ? null : $segment;
    }

    public static function fromSegment(string $segment): ?string
    {
        return self::SEGMENTS[$segment] ?? null;
    }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `php artisan test tests/Unit/CollectedTypesTest.php` → PASS (4 tests).

- [ ] **Step 5: Refactor the three consumers (behavior unchanged)**

`StoreCollectedItemRequest.php` line 21:

```php
'item_type' => ['required', Rule::in(\App\Support\CollectedTypes::values())],
```

`Api/CollectedItemController.php`: delete `private const TYPES = [...];` (line 12), add `use App\Support\CollectedTypes;`, line 19 becomes:

```php
$query->where('item_type', in_array($type, CollectedTypes::values(), true) ? $type : 'other');
```

`CollectedController.php`: delete `private const TYPES` block (lines 11–21), add `use App\Support\CollectedTypes;`, line 27 becomes:

```php
$query->where('item_type', array_key_exists($type, CollectedTypes::TYPES) ? $type : 'other');
```

lines 51–54 become:

```php
'types' => collect(CollectedTypes::TYPES)
    ->map(fn ($label, $value) => ['value' => $value, 'label' => $label])
    ->values(),
```

- [ ] **Step 6: Run backend suite**

Run: `php artisan test` → PASS (full suite green; old `/collected` behavior untouched).

- [ ] **Step 7: Commit**

```bash
git add app/Support/CollectedTypes.php app/Http/Controllers/CollectedController.php app/Http/Controllers/Api/CollectedItemController.php app/Http/Requests/StoreCollectedItemRequest.php tests/Unit/CollectedTypesTest.php
git commit -m "feat: shared collected types support class"
```

---

### Task 2: `cover_image` column, model helper, admin + API plumbing

**Files:** Create `database/migrations/2026_10_20_000001_add_cover_image_to_collected_items_table.php`; Modify `app/Models/CollectedItem.php`, `StoreCollectedItemRequest.php`, `Admin/CollectedItemController.php`, `CollectedItemResource.php`, `docs/api.md`; Test `tests/Feature/AdminCollectedTest.php`.

**Interfaces:**
- Produces: column `collected_items.cover_image` (nullable string ≤1000); `cover_image` fillable; `CollectedItem::coverUrl(): ?string` (http passthrough else `/storage/…`); request keys `cover_image` (string), `cover_image_file` (image file ≤4MB: jpg/jpeg/png/webp/avif), `cover_image_clear` (bool); admin edit payload carries raw `cover_image` (round-trips), admin index rows carry resolved `cover_image`; API items gain `cover_image` (resolved URL or null).

- [ ] **Step 1: Failing tests** — append to `tests/Feature/AdminCollectedTest.php`; extend imports to `use App\Models\{CollectedItem, User}; use Illuminate\Http\UploadedFile; use Illuminate\Support\Facades\Storage;`:

```php
it('stores a cover image upload', function () {
    Storage::fake('public');
    $file = UploadedFile::fake()->image('cover.jpg', 400, 600);

    $this->actingAs($this->owner)->post('/admin/collected', [
        'title' => 'Covered Book', 'item_type' => 'book', 'visibility' => 'public',
        'cover_image_file' => $file,
    ])->assertRedirect();

    $item = CollectedItem::where('title', 'Covered Book')->firstOrFail();

    expect($item->cover_image)->toStartWith('covers/')
        ->and(Storage::disk('public')->exists($item->cover_image))->toBeTrue()
        ->and($item->coverUrl())->toStartWith('/storage/covers/');
});

it('stores a pasted cover url', function () {
    $this->actingAs($this->owner)->post('/admin/collected', [
        'title' => 'Linked Cover', 'item_type' => 'music', 'visibility' => 'public',
        'cover_image' => 'https://cdn.example.com/cover.jpg',
    ])->assertRedirect();

    expect(CollectedItem::where('title', 'Linked Cover')->firstOrFail()->cover_image)
        ->toBe('https://cdn.example.com/cover.jpg');
});

it('removes a stored cover when cleared', function () {
    Storage::fake('public');
    $path = UploadedFile::fake()->image('a.jpg')->store('covers', 'public');
    $item = CollectedItem::factory()->create(['cover_image' => $path]);

    $this->actingAs($this->owner)->put("/admin/collected/{$item->id}", [
        'title' => $item->title, 'item_type' => 'book', 'visibility' => 'public',
        'cover_image' => $path, 'cover_image_clear' => true,
    ])->assertRedirect();

    expect($item->fresh()->cover_image)->toBeNull()
        ->and(Storage::disk('public')->exists($path))->toBeFalse();
});

it('rejects a non-image cover upload', function () {
    $this->actingAs($this->owner)->post('/admin/collected', [
        'title' => 'Bad Cover', 'item_type' => 'book', 'visibility' => 'public',
        'cover_image_file' => UploadedFile::fake()->create('notes.txt', 10),
    ])->assertSessionHasErrors('cover_image_file');
});

it('resolves stored cover paths to storage urls for the api', function () {
    CollectedItem::factory()->create(['title' => 'API Covered', 'visibility' => 'public', 'cover_image' => 'covers/x.jpg']);

    $this->getJson('/api/collected?q=API')
        ->assertOk()
        ->assertJsonPath('data.0.cover_image', '/storage/covers/x.jpg');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `php artisan test tests/Feature/AdminCollectedTest.php`
Expected: new tests FAIL (unknown `cover_image_file` field / `coverUrl` undefined / missing API key).

- [ ] **Step 3: Migration** — `database/migrations/2026_10_20_000001_add_cover_image_to_collected_items_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('collected_items', function (Blueprint $table) {
            $table->string('cover_image', 1000)->nullable()->after('url');
        });
    }

    public function down(): void
    {
        Schema::table('collected_items', function (Blueprint $table) {
            $table->dropColumn('cover_image');
        });
    }
};
```

Run: `php artisan migrate` → `Migrated: 2026_10_20_000001_add_cover_image…`.

- [ ] **Step 4: Model** — `app/Models/CollectedItem.php`: add `use Illuminate\Support\Facades\Storage;`; add `'cover_image'` after `'url'` in `$fillable`; append:

```php
public function coverUrl(): ?string
{
    if (! $this->cover_image) {
        return null;
    }

    return str_starts_with($this->cover_image, 'http')
        ? $this->cover_image
        : Storage::url($this->cover_image);
}
```

- [ ] **Step 5: Request rules** — in `StoreCollectedItemRequest::rules()` after `'url'`:

```php
'cover_image' => ['nullable', 'string', 'max:1000'],
'cover_image_file' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp,avif', 'max:4096'],
'cover_image_clear' => ['nullable', 'boolean'],
```

(`cover_image` is `string`, not `url`: stored paths round-trip through the same form input on every edit; a malformed pasted URL degrades to the placeholder via `onError`.)

- [ ] **Step 6: Admin controller** — `Admin/CollectedItemController.php`:

Add import `use Illuminate\Support\Facades\Storage;`.

In `index()` through-callback after `'url' => $i->url,` add:

```php
'cover_image' => $i->coverUrl(),
```

In `store()` after `unset($data['tags']);` add:

```php
unset($data['cover_image_file'], $data['cover_image_clear']);
$data['cover_image'] = $this->resolveCover($request, null);
```

In `update()` after `unset($data['tags']);` add:

```php
unset($data['cover_image_file'], $data['cover_image_clear']);
$data['cover_image'] = $this->resolveCover($request, $collectedItem->cover_image);
```

In `edit()` payload add `'cover_image' => $collectedItem->cover_image,` after `'url'`. Append private helpers:

```php
private function resolveCover(Request $request, ?string $existing): ?string
{
    if ($request->boolean('cover_image_clear')) {
        $this->purgeStoredCover($existing);

        return null;
    }

    if ($file = $request->file('cover_image_file')) {
        $this->purgeStoredCover($existing);

        return $file->store('covers', 'public');
    }

    $value = trim((string) $request->input('cover_image', ''));

    if ($value === '') {
        return $existing;
    }

    if ($value !== $existing) {
        $this->purgeStoredCover($existing);
    }

    return $value;
}

private function purgeStoredCover(?string $value): void
{
    if ($value !== null && $value !== '' && ! str_starts_with($value, 'http')) {
        Storage::disk('public')->delete($value);
    }
}
```

- [ ] **Step 7: API resource + docs** — `CollectedItemResource::toArray()` after `'url' => $this->url,`:

```php
'cover_image' => $this->coverUrl(),
```

`docs/api.md` — in the `GET /api/collected` JSON example, after `"url": null,` add:

```json
      "cover_image": null,
```

- [ ] **Step 8: Run tests**

Run: `php artisan test tests/Feature/AdminCollectedTest.php tests/Feature/PublicApiTest.php` → PASS.

- [ ] **Step 9: Commit**

```bash
git add database/migrations/2026_10_20_000001_add_cover_image_to_collected_items_table.php app/Models/CollectedItem.php app/Http/Requests/StoreCollectedItemRequest.php app/Http/Controllers/Admin/CollectedItemController.php app/Http/Resources/CollectedItemResource.php docs/api.md tests/Feature/AdminCollectedTest.php
git commit -m "feat: cover images for collected items"
```

---

### Task 4: Frontend shared module — `collectedTypes.ts`, `motion.ts`, `CoverImage`, `ItemTitle`, `ItemTags`, `Button#external`, `ItemModal`

**Files:** Create `resources/js/collectedTypes.ts`, `resources/js/motion.ts`, `resources/js/Components/collected/{CoverImage,ItemTitle,ItemTags,ItemModal}.tsx`, `resources/js/Components/__tests__/collectedFixtures.ts`, `resources/js/Components/__tests__/{CollectedTypes,CoverImage,ItemModal}.test.tsx`; Modify `resources/js/Components/Button.tsx`.

**Interfaces:**
- Consumes: `Tag`, `Badge`, `Button` primitives; lucide icons `BookOpen, Newspaper, Play, Mic, Disc3, Wrench, Quote, Globe, Bookmark, ExternalLink, X` (verified present in installed lucide-react).
- Produces (everything later tasks import):
  - `collectedTypes.ts`: `ItemType`, `ITEM_TYPES`, `TYPE_LABELS`, `TYPE_SEGMENTS`, `VISIT_VERBS`, `TYPE_GLYPHS`, `CollectedTag = {name; slug}`, `CollectedItem = { id: number; title: string; url: string|null; creator: string|null; item_type: ItemType; annotation: string|null; date: string; tags: CollectedTag[]; cover_image: string|null }`, `PageLink`, `Paginated<T> = { data: T[]; links: PageLink[]; total: number }`, `CategoryTile = { type: ItemType; label: string; count: number; href: string }`, `coverKind(type): 'book'|'music'|'video'|'other'`.
  - `motion.ts`: `isCoarsePointer(): boolean`, `prefersReducedMotion(): boolean`.
  - `CoverImage({ src, title, kind?, className?, glyph?, glyphClassName? })`.
  - `ItemTitle({ item, onOpen, className? })` — button (annotation) / anchor (external + `↗`) / `<p>`.
  - `ItemTags({ item })` — chips → `/collected/{TYPE_SEGMENTS[type]}?tag={slug}`; `null` when empty.
  - `ItemModal({ item: CollectedItem | null; onClose: () => void })` — self-managed mount/exit (200ms), focus trap, Esc, backdrop click, scroll lock, focus restore.
  - `Button` gains `external?: boolean` → plain `<a target="_blank" rel="noopener noreferrer">`.

- [ ] **Step 1: Write failing tests**

`resources/js/Components/__tests__/collectedFixtures.ts`:

```ts
import type { CollectedItem } from '@/collectedTypes';

export function makeItem(overrides: Partial<CollectedItem> = {}): CollectedItem {
    return {
        id: 1,
        title: 'Systems Design',
        url: 'https://example.com/item',
        creator: 'Donella Meadows',
        item_type: 'book',
        annotation: 'Why it matters',
        date: 'Oct 1, 2026',
        tags: [],
        cover_image: null,
        ...overrides,
    };
}
```

`resources/js/Components/__tests__/CollectedTypes.test.tsx`:

```tsx
import { test, expect } from 'vitest';
import { ITEM_TYPES, TYPE_GLYPHS, TYPE_LABELS, TYPE_SEGMENTS, VISIT_VERBS, coverKind } from '@/collectedTypes';

test('every type has a label, segment, verb, glyph and cover kind', () => {
    for (const type of ITEM_TYPES) {
        expect(TYPE_LABELS[type], `label for ${type}`).toBeTruthy();
        expect(TYPE_SEGMENTS[type], `segment for ${type}`).toBeTruthy();
        expect(VISIT_VERBS[type], `verb for ${type}`).toBeTruthy();
        expect(TYPE_GLYPHS[type], `glyph for ${type}`).toBeDefined();
        expect(['book', 'music', 'video', 'other']).toContain(coverKind(type));
    }
});

test('segments follow the plural url convention', () => {
    expect(TYPE_SEGMENTS.book).toBe('books');
    expect(TYPE_SEGMENTS.music).toBe('music');
    expect(TYPE_SEGMENTS.other).toBe('others');
    expect(ITEM_TYPES).toHaveLength(9);
});
```

`resources/js/Components/__tests__/CoverImage.test.tsx`:

```tsx
import { test, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CoverImage } from '@/Components/collected/CoverImage';

test('renders the cover image when present', () => {
    render(<CoverImage src="https://cdn.example.com/c.jpg" title="Systems Design" kind="book" />);
    expect(screen.getByAltText('Cover of Systems Design')).toHaveAttribute('src', 'https://cdn.example.com/c.jpg');
});

test('falls back to serif initials when no cover is set', () => {
    render(<CoverImage src={null} title="Systems Design" kind="book" />);
    expect(screen.getByText('SD')).toBeInTheDocument();
});

test('swaps to the placeholder when the image fails to load', () => {
    render(<CoverImage src="https://cdn.example.com/missing.jpg" title="Systems Design" kind="book" />);
    fireEvent.error(screen.getByAltText('Cover of Systems Design'));
    expect(screen.queryByAltText('Cover of Systems Design')).not.toBeInTheDocument();
    expect(screen.getByText('SD')).toBeInTheDocument();
});

test('renders a glyph placeholder when a glyph is given', () => {
    const Glyph = () => <svg data-testid="glyph" />;
    render(<CoverImage src={null} title="Any Title" kind="music" glyph={Glyph} />);
    expect(screen.getByTestId('glyph')).toBeInTheDocument();
});
```

`resources/js/Components/__tests__/ItemModal.test.tsx`:

```tsx
import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { makeItem } from './collectedFixtures';

vi.mock('@inertiajs/react', () => ({
    Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
    router: { get: vi.fn() },
}));

import { ItemModal } from '@/Components/collected/ItemModal';
import type { CollectedItem } from '@/collectedTypes';

const annotated = makeItem({
    title: 'Thinking in Systems',
    annotation: 'A classic on feedback loops.',
    tags: [{ name: 'Systems', slug: 'systems' }],
});

test('renders dialog content with annotation, tags and a visit button', () => {
    render(<ItemModal item={annotated} onClose={() => {}} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('heading', { name: 'Thinking in Systems' })).toBeInTheDocument();
    expect(screen.getByText('A classic on feedback loops.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Systems' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Read/ })).toHaveAttribute('href', 'https://example.com/item');
});

test('calls onClose on Escape and on backdrop click', () => {
    const onClose = vi.fn();
    const { rerender } = render(<ItemModal item={annotated} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(<ItemModal item={annotated} onClose={onClose} />);
    const backdrop = screen.getByRole('dialog').parentElement as HTMLElement;
    fireEvent.mouseDown(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);
});

function Harness() {
    const [open, setOpen] = useState<CollectedItem | null>(null);
    return (
        <div>
            <button type="button" onClick={() => setOpen(annotated)}>
                open me
            </button>
            <ItemModal item={open} onClose={() => setOpen(null)} />
        </div>
    );
}

test('focuses the dialog on open and restores focus after close', async () => {
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'open me' });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = await screen.findByRole('dialog');
    expect(document.activeElement).toBe(dialog);

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(document.activeElement).toBe(trigger);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- Components/__tests__/ItemModal.test.tsx` → FAIL (module not found).

- [ ] **Step 3: Implement `resources/js/collectedTypes.ts`**

```ts
import type { LucideIcon } from 'lucide-react';
import { BookOpen, Bookmark, Disc3, Globe, Mic, Newspaper, Play, Quote, Wrench } from 'lucide-react';

export type ItemType = 'book' | 'article' | 'video' | 'podcast' | 'music' | 'tool' | 'quote' | 'website' | 'other';

export const ITEM_TYPES: ItemType[] = ['book', 'article', 'video', 'podcast', 'music', 'tool', 'quote', 'website', 'other'];

export const TYPE_LABELS: Record<ItemType, string> = {
    book: 'Books',
    article: 'Articles',
    video: 'Videos',
    podcast: 'Podcasts',
    music: 'Music',
    tool: 'Tools',
    quote: 'Quotes',
    website: 'Websites',
    other: 'Other',
};

export const TYPE_SEGMENTS: Record<ItemType, string> = {
    book: 'books',
    article: 'articles',
    video: 'videos',
    podcast: 'podcasts',
    music: 'music',
    tool: 'tools',
    quote: 'quotes',
    website: 'websites',
    other: 'others',
};

export const VISIT_VERBS: Record<ItemType, string> = {
    book: 'Read',
    article: 'Read',
    video: 'Watch',
    podcast: 'Listen',
    music: 'Listen',
    tool: 'Visit',
    quote: 'View',
    website: 'Visit',
    other: 'Open',
};

export const TYPE_GLYPHS: Record<ItemType, LucideIcon> = {
    book: BookOpen,
    article: Newspaper,
    video: Play,
    podcast: Mic,
    music: Disc3,
    tool: Wrench,
    quote: Quote,
    website: Globe,
    other: Bookmark,
};

export function coverKind(type: ItemType): 'book' | 'music' | 'video' | 'other' {
    if (type === 'book' || type === 'music' || type === 'video') return type;
    return 'other';
}

export type CollectedTag = { name: string; slug: string };

export type CollectedItem = {
    id: number;
    title: string;
    url: string | null;
    creator: string | null;
    item_type: ItemType;
    annotation: string | null;
    date: string;
    tags: CollectedTag[];
    cover_image: string | null;
};

export type PageLink = { url: string | null; label: string; active: boolean };

export type Paginated<T> = { data: T[]; links: PageLink[]; total: number };

export type CategoryTile = { type: ItemType; label: string; count: number; href: string };
```

- [ ] **Step 4: Implement `resources/js/motion.ts`**

```ts
function matches(query: string): boolean {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(query).matches
        : false;
}

export function isCoarsePointer(): boolean {
    return matches('(pointer: coarse)');
}

export function prefersReducedMotion(): boolean {
    return matches('(prefers-reduced-motion: reduce)');
}
```

- [ ] **Step 5: Implement `CoverImage.tsx`**

```tsx
import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';

type Kind = 'book' | 'music' | 'video' | 'other';

const RATIO: Record<Kind, string> = {
    book: 'aspect-[2/3]',
    music: 'aspect-square',
    video: 'aspect-video',
    other: 'aspect-[3/4]',
};

function initials(title: string): string {
    return title
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word.charAt(0))
        .join('')
        .toUpperCase();
}

export function CoverImage({
    src,
    title,
    kind = 'other',
    className = '',
    glyph,
    glyphClassName = 'h-6 w-6 text-meta',
}: {
    src: string | null;
    title: string;
    kind?: Kind;
    className?: string;
    glyph?: LucideIcon;
    glyphClassName?: string;
}) {
    const [failed, setFailed] = useState(false);
    const shell = `${RATIO[kind]} overflow-hidden ${className}`;

    if (!src || failed) {
        return (
            <div className={`${shell} flex items-center justify-center border border-hairline bg-surface`} aria-hidden="true">
                {glyph ? (
                    <glyph className={glyphClassName} strokeWidth={1.5} />
                ) : (
                    <span className="font-serif text-lg text-meta">{initials(title)}</span>
                )}
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={`Cover of ${title}`}
            loading="lazy"
            onError={() => setFailed(true)}
            className={`${shell} object-cover`}
        />
    );
}
```

- [ ] **Step 6: Implement `ItemTitle.tsx` + `ItemTags.tsx`**

`resources/js/Components/collected/ItemTitle.tsx`:

```tsx
import type { CollectedItem } from '@/collectedTypes';

export function ItemTitle({
    item,
    onOpen,
    className = '',
}: {
    item: CollectedItem;
    onOpen: (item: CollectedItem) => void;
    className?: string;
}) {
    if (item.annotation) {
        return (
            <button
                type="button"
                onClick={() => onOpen(item)}
                className={`cursor-pointer text-left hover:text-link ${className}`}
            >
                {item.title}
            </button>
        );
    }
    if (item.url) {
        return (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className={`hover:text-link ${className}`}>
                {item.title} <span aria-hidden="true">↗</span>
            </a>
        );
    }
    return <p className={className}>{item.title}</p>;
}
```

`resources/js/Components/collected/ItemTags.tsx`:

```tsx
import { Tag } from '@/Components/Tag';
import { TYPE_SEGMENTS, type CollectedItem } from '@/collectedTypes';

export function ItemTags({ item }: { item: CollectedItem }) {
    if (item.tags.length === 0) return null;

    return (
        <span className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
                <Tag
                    key={tag.slug}
                    label={tag.name}
                    href={`/collected/${TYPE_SEGMENTS[item.item_type]}?tag=${tag.slug}`}
                />
            ))}
        </span>
    );
}
```

- [ ] **Step 7: Implement `Button.tsx` external variant** — full file:

```tsx
import { Link } from '@inertiajs/react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost';
    href?: string;
    external?: boolean;
    children: ReactNode;
};

const styles = {
    primary: 'bg-primary text-white hover:opacity-80',
    secondary: 'bg-white text-ink border border-hairline hover:bg-surface',
    ghost: 'text-ink hover:underline',
};

export function Button({ variant = 'primary', href, external = false, className = '', children, ...rest }: Props) {
    const cls = `inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${styles[variant]} ${className}`;
    if (href && external) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
                {children}
            </a>
        );
    }
    if (href) {
        return (
            <Link href={href} className={cls}>
                {children}
            </Link>
        );
    }
    return (
        <button className={cls} {...rest}>
            {children}
        </button>
    );
}
```

- [ ] **Step 8: Implement `ItemModal.tsx`** — full file:

```tsx
import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { ExternalLink, X } from 'lucide-react';
import { Badge } from '@/Components/Badge';
import { Button } from '@/Components/Button';
import { CoverImage } from '@/Components/collected/CoverImage';
import { TYPE_SEGMENTS, VISIT_VERBS, coverKind, type CollectedItem } from '@/collectedTypes';

const FOCUSABLE = 'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])';
const SERIF_TYPES = new Set(['article', 'book', 'quote']);

export function ItemModal({ item, onClose }: { item: CollectedItem | null; onClose: () => void }) {
    const [visible, setVisible] = useState<CollectedItem | null>(item);
    const [closing, setClosing] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (item) {
            setClosing(false);
            setVisible(item);
            return;
        }
        if (!visible) return;
        setClosing(true);
        const timer = window.setTimeout(() => setVisible(null), 200);
        return () => window.clearTimeout(timer);
    }, [item, visible]);

    useEffect(() => {
        if (!visible) return;
        const previous = document.activeElement as HTMLElement | null;
        panelRef.current?.focus();

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onCloseRef.current();
                return;
            }
            if (event.key !== 'Tab' || !panelRef.current) return;
            const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
            if (nodes.length === 0) return;
            const first = nodes[0];
            const last = nodes[nodes.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', onKeyDown);
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = overflow;
            previous?.focus();
        };
    }, [visible]);

    if (!visible) return null;

    const coverBox = visible.item_type === 'video' ? 'w-full max-w-xs' : visible.item_type === 'book' ? 'w-28' : 'w-32';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-md animate-backdrop-in"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onCloseRef.current();
            }}
        >
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="item-modal-title"
                tabIndex={-1}
                className={`relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-hairline bg-white p-6 shadow-2xl focus:outline-none ${
                    closing ? 'animate-modal-out' : 'animate-modal-in'
                }`}
            >
                <button
                    type="button"
                    onClick={() => onCloseRef.current()}
                    aria-label="Close"
                    className="absolute right-4 top-4 rounded-md p-1 text-meta hover:bg-surface hover:text-ink"
                >
                    <X className="h-4 w-4" aria-hidden="true" />
                </button>

                <div className={`mx-auto mb-5 ${coverBox}`}>
                    <CoverImage src={visible.cover_image} title={visible.title} kind={coverKind(visible.item_type)} />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Badge>{visible.item_type}</Badge>
                    <span className="text-xs text-meta">{visible.date}</span>
                </div>
                <h2
                    id="item-modal-title"
                    className={`mt-2 text-2xl font-semibold tracking-tight ${SERIF_TYPES.has(visible.item_type) ? 'font-serif' : ''}`}
                >
                    {visible.title}
                </h2>
                {visible.creator && <p className="mt-1 text-sm text-meta">{visible.creator}</p>}
                {visible.annotation && (
                    <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{visible.annotation}</p>
                )}

                {visible.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                        {visible.tags.map((tag) => (
                            <button
                                key={tag.slug}
                                type="button"
                                className="cursor-pointer"
                                onClick={() => {
                                    router.get(`/collected/${TYPE_SEGMENTS[visible.item_type]}`, { tag: tag.slug });
                                    onCloseRef.current();
                                }}
                            >
                                <span className="inline-block rounded-sm border border-hairline px-2 py-0.5 text-xs text-meta hover:border-primary hover:text-ink">
                                    {tag.name}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {visible.url && (
                    <div className="mt-6 border-t border-hairline pt-4">
                        <Button external href={visible.url}>
                            {VISIT_VERBS[visible.item_type]}
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 9: Run tests**

Run: `npm test -- Components/__tests__/CollectedTypes.test.tsx Components/__tests__/CoverImage.test.tsx Components/__tests__/ItemModal.test.tsx` → PASS (2 + 4 + 3 = 9 tests).

- [ ] **Step 10: Commit**

```bash
git add resources/js/collectedTypes.ts resources/js/motion.ts resources/js/Components/collected resources/js/Components/Button.tsx resources/js/Components/__tests__/collectedFixtures.ts resources/js/Components/__tests__/CollectedTypes.test.tsx resources/js/Components/__tests__/CoverImage.test.tsx resources/js/Components/__tests__/ItemModal.test.tsx
git commit -m "feat: shared collected frontend types, cover image and item modal"
```

---

### Task 3: Admin cover field (Edit) + thumbnail (Index)

*Run this task immediately after Task 4 (it imports `@/collectedTypes`).*

**Files:** Modify `resources/js/Pages/Admin/Collected/Edit.tsx`, `resources/js/Pages/Admin/Collected/Index.tsx`; Test `resources/js/Components/__tests__/AdminCoverField.test.tsx`.

**Interfaces:**
- Consumes: `cover_image` in edit payload (raw) and index rows (resolved URL) from Task 2; `ITEM_TYPES`, `TYPE_LABELS` from Task 4.
- Produces: form data keys `cover_image: string`, `cover_image_file: File | null`, `cover_image_clear: boolean` posted to Task 2's endpoint.

- [ ] **Step 1: Failing test** — `resources/js/Components/__tests__/AdminCoverField.test.tsx`:

```tsx
import { test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@inertiajs/react', () => ({
    useForm: (initial: Record<string, unknown>) => ({
        data: initial,
        setData: vi.fn(),
        errors: {} as Record<string, string>,
        processing: false,
        put: vi.fn(),
        post: vi.fn(),
        transform: vi.fn(),
    }),
    router: { delete: vi.fn() },
    Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/Layouts/AdminLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/Components/Flash', () => ({ Flash: () => null }));

import CollectedEdit from '@/Pages/Admin/Collected/Edit';

test('shows the cover url field, file picker, remove toggle and ratio hint for an existing cover', () => {
    render(
        <CollectedEdit
            item={{
                id: 1,
                title: 'Covered',
                url: '',
                creator: '',
                item_type: 'book',
                annotation: '',
                visibility: 'public',
                tags: [],
                cover_image: 'covers/old.jpg',
            }}
        />,
    );

    expect(screen.getByLabelText('Cover image URL')).toHaveValue('covers/old.jpg');
    expect(screen.getByLabelText('Remove cover')).toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).not.toBeNull();
    expect(screen.getByText(/2:3 for books/)).toBeInTheDocument();
});

test('renders type options with display labels', () => {
    render(<CollectedEdit item={null} />);
    const select = screen.getByLabelText('Type');
    expect(select).toHaveTextContent('Books');
    expect(select).toHaveTextContent('Tools');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- Components/__tests__/AdminCoverField.test.tsx` → FAIL ("Cover image URL" not found).

- [ ] **Step 3: Implement `Edit.tsx`**

1. Add import `import { ITEM_TYPES, TYPE_LABELS } from '@/collectedTypes';`; delete `const types = ['book', …];` (line 36).
2. Types become:

```tsx
type ItemData = {
    id?: number;
    title: string;
    url: string;
    creator: string;
    item_type: string;
    annotation: string;
    visibility: string;
    tags: string[];
    cover_image: string | null;
};

type ItemForm = Omit<ItemData, 'tags' | 'cover_image'> & {
    tags: string;
    cover_image: string;
    cover_image_file: File | null;
    cover_image_clear: boolean;
};
```

3. `empty` gains `cover_image: '', cover_image_file: null, cover_image_clear: false,`.
4. `useForm` init:

```tsx
const { data, setData, put, post: submitCreate, processing, errors, transform } = useForm<ItemForm>({
    ...(item ?? empty),
    cover_image: item?.cover_image ?? '',
    cover_image_file: null,
    cover_image_clear: false,
    tags: (item?.tags ?? []).join(', '),
});
```

5. Type `<select>` options: `{ITEM_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}`.
6. Insert after the URL field block:

```tsx
<div>
    <label className="text-sm font-medium" htmlFor="item-cover-url">
        Cover image URL
    </label>
    <input
        id="item-cover-url"
        value={data.cover_image}
        onChange={(e) => {
            update('cover_image', e.target.value);
            setData('cover_image_clear', false);
        }}
        className={fieldClass}
        placeholder="https://…"
    />
    <p className="mt-1 text-xs text-meta">JPG, PNG or WebP · 2:3 for books, 1:1 for music, 16:9 for video · or paste an image URL</p>
    {errors.cover_image && <p className="mt-1 text-sm text-red-700">{errors.cover_image}</p>}
</div>
<div className="flex flex-wrap items-center gap-4">
    <div>
        <label className="text-sm font-medium" htmlFor="item-cover-file">
            Upload cover
        </label>
        <input
            id="item-cover-file"
            type="file"
            accept="image/*"
            onChange={(e) => {
                setData('cover_image_file', e.target.files?.[0] ?? null);
                setData('cover_image_clear', false);
            }}
            className="mt-1 block w-full text-sm text-meta file:mr-3 file:rounded-md file:border file:border-hairline file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-surface"
        />
        {errors.cover_image_file && <p className="mt-1 text-sm text-red-700">{errors.cover_image_file}</p>}
    </div>
    {(data.cover_image || data.cover_image_file) && (
        <label className="flex items-center gap-2 text-sm text-meta">
            <input
                type="checkbox"
                checked={data.cover_image_clear}
                onChange={(e) => setData('cover_image_clear', e.target.checked)}
            />
            Remove cover
        </label>
    )}
    {(data.cover_image || data.cover_image_file) && !data.cover_image_clear && (
        <img
            src={
                data.cover_image_file
                    ? URL.createObjectURL(data.cover_image_file)
                    : data.cover_image.startsWith('http')
                      ? data.cover_image
                      : `/storage/${data.cover_image}`
            }
            alt=""
            className="h-20 rounded-md border border-hairline object-cover"
        />
    )}
</div>
```

7. `transform` already spreads `...d`, so the `File` rides along — unchanged.

- [ ] **Step 4: Implement `Index.tsx`**

1. Add `import { ITEM_TYPES, TYPE_LABELS } from '@/collectedTypes';`, delete local `typeOptions` (lines 21–31), replace usage with:

```tsx
const typeOptions = ITEM_TYPES.map((t) => ({ label: TYPE_LABELS[t], value: t }));
```

2. `ItemRow` gains `cover_image: string | null;`.
3. Add header cell before `Title`:

```tsx
<th className="px-4 py-3">
    <span className="sr-only">Cover</span>
</th>
```

4. Add body cell before title cell:

```tsx
<td className="px-4 py-2">
    {i.cover_image ? (
        <img src={i.cover_image} alt="" loading="lazy" className="h-8 w-8 rounded-sm border border-hairline object-cover" />
    ) : (
        <span aria-hidden="true" className="block h-8 w-8 rounded-sm border border-hairline bg-surface" />
    )}
</td>
```

- [ ] **Step 5: Run test + build**

Run: `npm test -- Components/__tests__/AdminCoverField.test.tsx` → PASS (2 tests).
Run: `npm run build` → succeeds.

- [ ] **Step 6: Commit**

```bash
git add resources/js/Pages/Admin/Collected/Edit.tsx resources/js/Pages/Admin/Collected/Index.tsx resources/js/Components/__tests__/AdminCoverField.test.tsx
git commit -m "feat: admin cover image field and thumbnail"
```

---

### Task 5: `EditorialList` view

**Files:** Create `resources/js/Pages/Collected/views/EditorialList.tsx`; Test `resources/js/Components/__tests__/EditorialList.test.tsx`.

**Interfaces:**
- Consumes: `CollectedItem`, `ItemTitle`, `ItemTags` (Task 4).
- Produces: `EditorialList({ items, onOpen, lead = true })` + exported `EditorialListProps`. Used by drawer search results (`lead={false}`), shell fallback, and podcasts/quotes/other. `registry.ts` (Task 9) types views as `ComponentType<{ items: CollectedItem[]; onOpen: (item: CollectedItem) => void }>` — `EditorialListProps & { lead?: boolean }` satisfies it (optional extra prop).

- [ ] **Step 1: Failing test** — `resources/js/Components/__tests__/EditorialList.test.tsx`:

```tsx
import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditorialList } from '@/Pages/Collected/views/EditorialList';
import { makeItem } from './collectedFixtures';

const lead = makeItem({ id: 1, title: 'Lead Story', annotation: 'Featured note.', item_type: 'article' });
const row = makeItem({ id: 2, title: 'Second Story', annotation: 'Row note.', item_type: 'article', date: 'Oct 2, 2026' });
const external = makeItem({ id: 3, title: 'No Note', annotation: null, url: 'https://example.com/read', item_type: 'article' });

test('renders the first item as a serif lead story', () => {
    render(<EditorialList items={[lead, row]} onOpen={() => {}} />);
    expect(screen.getByRole('button', { name: 'Lead Story' }).className).toContain('font-serif');
    expect(screen.getByText('Featured note.')).toBeInTheDocument();
});

test('clicking an annotated title calls onOpen with the item', () => {
    const onOpen = vi.fn();
    render(<EditorialList items={[lead, row]} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'Second Story' }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 2, title: 'Second Story' }));
});

test('items without an annotation link out instead of opening', () => {
    render(<EditorialList items={[external]} onOpen={() => {}} lead={false} />);
    const link = screen.getByRole('link', { name: /No Note/ });
    expect(link).toHaveAttribute('href', 'https://example.com/read');
    expect(link).toHaveAttribute('target', '_blank');
});

test('lead=false renders every item as an equal row', () => {
    render(<EditorialList items={[lead, row]} onOpen={() => {}} lead={false} />);
    expect(screen.getByRole('button', { name: 'Lead Story' }).className).not.toContain('font-serif');
    expect(screen.getByRole('button', { name: 'Second Story' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- Components/__tests__/EditorialList.test.tsx` → FAIL (module not found).

- [ ] **Step 3: Implement the view** — `resources/js/Pages/Collected/views/EditorialList.tsx`:

```tsx
import { ItemTags } from '@/Components/collected/ItemTags';
import { ItemTitle } from '@/Components/collected/ItemTitle';
import type { CollectedItem } from '@/collectedTypes';

export type EditorialListProps = {
    items: CollectedItem[];
    onOpen: (item: CollectedItem) => void;
    lead?: boolean;
};

export function EditorialList({ items, onOpen, lead = true }: EditorialListProps) {
    if (items.length === 0) return null;

    const leadItem = lead ? items[0] : null;
    const rows = leadItem ? items.slice(1) : items;

    return (
        <div>
            {leadItem && (
                <article className="animate-row-in border-b border-hairline pb-8">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                        <span className="text-xs font-semibold uppercase tracking-wide text-meta">{leadItem.item_type}</span>
                        <span className="text-xs text-meta">{leadItem.date}</span>
                    </div>
                    <ItemTitle
                        item={leadItem}
                        onOpen={onOpen}
                        className="mt-2 block font-serif text-3xl font-semibold leading-tight tracking-tight text-ink"
                    />
                    {leadItem.creator && <p className="mt-2 text-sm text-meta">{leadItem.creator}</p>}
                    {leadItem.annotation && (
                        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink">{leadItem.annotation}</p>
                    )}
                    {leadItem.tags.length > 0 && (
                        <div className="mt-3">
                            <ItemTags item={leadItem} />
                        </div>
                    )}
                </article>
            )}
            <div className="divide-y divide-hairline">
                {rows.map((item) => (
                    <article key={item.id} className="animate-row-in py-5 transition hover:bg-surface/60 sm:px-2">
                        <div className="flex flex-wrap items-baseline gap-x-3">
                            <span className="text-xs font-semibold uppercase tracking-wide text-meta">{item.item_type}</span>
                            <span className="text-xs text-meta">{item.date}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                            <div className="min-w-0 flex-1">
                                <ItemTitle item={item} onOpen={onOpen} className="block text-xl font-medium text-ink" />
                                {item.creator && <p className="mt-0.5 text-sm text-meta">{item.creator}</p>}
                                {item.annotation && (
                                    <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-ink">{item.annotation}</p>
                                )}
                            </div>
                            <div className="shrink-0 pt-1">
                                <ItemTags item={item} />
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}
```

- [ ] **Step 4: Run to verify passes**

Run: `npm test -- Components/__tests__/EditorialList.test.tsx` → PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add resources/js/Pages/Collected/views/EditorialList.tsx resources/js/Components/__tests__/EditorialList.test.tsx
git commit -m "feat: editorial list view for collected articles"
```

---

### Task 6: Drawer payload — new `CollectedController::index`

**Files:** Modify `app/Http/Controllers/CollectedController.php`, `tests/Feature/CollectedPublicTest.php` (rewrite), `tests/Feature/PublicApiTest.php:142-143`.

**Interfaces:**
- Consumes: `CollectedTypes` (Task 1), `coverUrl()` (Task 2).
- Produces: `Collected/Index` props `{ categories: CategoryTile[]; items: Paginated|null; filters: { q: string|null } }`. Item payload = `{ id, title, url, creator, item_type, annotation, date, tags: [{name, slug}], cover_image }`. `items` is `null` unless `?q` is non-blank. `categories`: only public, only known types, count > 0, canonical order, `href = /collected/{segment}`.

- [ ] **Step 1: Rewrite failing test file** — `tests/Feature/CollectedPublicTest.php` (full replacement):

```php
<?php

use App\Models\CollectedItem;
use App\Models\Tag;

it('lists drawer categories with counts and plural hrefs', function () {
    CollectedItem::factory()->create(['title' => 'System Design', 'item_type' => 'book', 'visibility' => 'public']);
    CollectedItem::factory()->create(['title' => 'Second Book', 'item_type' => 'book', 'visibility' => 'public']);
    CollectedItem::factory()->create(['title' => 'Hidden Book', 'item_type' => 'book', 'visibility' => 'private']);
    CollectedItem::factory()->create(['title' => 'Hidden Music', 'item_type' => 'music', 'visibility' => 'private']);

    $this->get('/collected')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Collected/Index')
            ->where('categories', fn (array $c) => count($c) === 1)
            ->where('categories.0.type', 'book')
            ->where('categories.0.label', 'Books')
            ->where('categories.0.count', 2)
            ->where('categories.0.href', '/collected/books')
            ->where('items', null));
});

it('renders an empty drawer when nothing is public', function () {
    CollectedItem::factory()->create(['visibility' => 'private']);

    $this->get('/collected')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Collected/Index')
            ->where('categories', [])
            ->where('items', null));
});

it('searches annotations', function () {
    CollectedItem::factory()->create(['title' => 'Default', 'annotation' => 'Great systems thinking book', 'visibility' => 'public']);
    CollectedItem::factory()->create(['title' => 'Other', 'annotation' => 'unrelated', 'visibility' => 'public']);

    $this->get('/collected?q=systems')->assertInertia(fn ($p) => $p->where('items.data.0.title', 'Default'));
});

it('searches are case insensitive', function () {
    CollectedItem::factory()->create(['title' => 'Refactoring', 'annotation' => 'Essential Patterns', 'visibility' => 'public']);

    $this->get('/collected?q=PATTERNS')->assertInertia(fn ($p) => $p->where('items.data.0.title', 'Refactoring'));
});

it('keeps drawer categories alongside search results', function () {
    CollectedItem::factory()->create(['title' => 'Searchable', 'item_type' => 'video', 'visibility' => 'public']);
    CollectedItem::factory()->create(['title' => 'Not Matching', 'item_type' => 'book', 'visibility' => 'public']);

    $this->get('/collected?q=Searchable')->assertInertia(fn ($p) => $p
        ->has('categories', 2)
        ->where('items.data.0.title', 'Searchable')
        ->where('items.total', 1));
});

it('returns ids, tag slugs and resolved cover urls in payloads', function () {
    $item = CollectedItem::factory()->create([
        'title' => 'Covered Book',
        'item_type' => 'book',
        'annotation' => 'why it matters',
        'cover_image' => 'covers/abc.jpg',
        'visibility' => 'public',
    ]);
    $tag = Tag::create(['name' => 'Systems']);
    $item->tags()->attach($tag->id);

    $this->get('/collected?q=Covered')->assertInertia(fn ($p) => $p
        ->has('items.data.0.id')
        ->where('items.data.0.cover_image', '/storage/covers/abc.jpg')
        ->where('items.data.0.tags.0.name', 'Systems')
        ->where('items.data.0.tags.0.slug', 'systems'));
});

it('excludes private items from search results', function () {
    CollectedItem::factory()->create(['title' => 'Private Result', 'visibility' => 'private']);

    $this->get('/collected?q=Private')->assertInertia(fn ($p) => $p->where('items.total', 0));
});
```

In `tests/Feature/PublicApiTest.php` replace lines 142–143 with:

```php
    $this->get('/collected')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Collected/Index')->where('items', null)->where('categories', []));
```

- [ ] **Step 2: Run to verify failure**

Run: `php artisan test tests/Feature/CollectedPublicTest.php` → FAIL (`categories` missing / old `items.data` shape).

- [ ] **Step 3: Rewrite `app/Http/Controllers/CollectedController.php`** (full file; `show()` arrives in Task 8):

```php
<?php

namespace App\Http\Controllers;

use App\Models\CollectedItem;
use App\Models\Tag;
use App\Support\CollectedTypes;
use Illuminate\Http\Request;
use Inertia\{Inertia, Response};

class CollectedController extends Controller
{
    public function index(Request $request): Response
    {
        $q = trim((string) $request->query('q'));
        $items = null;

        if ($q !== '') {
            $needle = '%'.mb_strtolower($q).'%';
            $items = CollectedItem::publiclyVisible()
                ->with('tags')
                ->latest('created_at')
                ->where(fn ($w) => $w
                    ->whereRaw('LOWER(title) LIKE ?', [$needle])
                    ->orWhereRaw('LOWER(COALESCE(annotation, \'\')) LIKE ?', [$needle])
                    ->orWhereRaw('LOWER(COALESCE(creator, \'\')) LIKE ?', [$needle]))
                ->paginate(20)
                ->withQueryString()
                ->through(fn ($i) => $this->mapItem($i));
        }

        return Inertia::render('Collected/Index', [
            'categories' => $this->drawerCategories(),
            'items' => $items,
            'filters' => ['q' => $q !== '' ? $q : null],
        ]);
    }

    /** @return array<int, array{type: string, label: string, count: int, href: string}> */
    private function drawerCategories(): array
    {
        $rows = CollectedItem::publiclyVisible()
            ->selectRaw('item_type, COUNT(*) as total')
            ->groupBy('item_type')
            ->get();

        return $rows
            ->map(fn ($row) => [
                'type' => $row->item_type,
                'label' => CollectedTypes::label($row->item_type),
                'count' => (int) $row->total,
            ])
            ->filter(fn ($c) => $c['count'] > 0 && array_key_exists($c['type'], CollectedTypes::TYPES))
            ->sortBy(fn ($c) => array_search($c['type'], CollectedTypes::values(), true))
            ->values()
            ->map(fn ($c) => $c + ['href' => '/collected/'.CollectedTypes::segment($c['type'])])
            ->all();
    }

    private function mapItem(CollectedItem $i): array
    {
        return [
            'id' => $i->id,
            'title' => $i->title,
            'url' => $i->url,
            'creator' => $i->creator,
            'item_type' => $i->item_type,
            'annotation' => $i->annotation,
            'date' => $i->created_at->format('M j, Y'),
            'tags' => $i->tags->map(fn (Tag $t) => ['name' => $t->name, 'slug' => $t->slug])->values(),
            'cover_image' => $i->coverUrl(),
        ];
    }
}
```

- [ ] **Step 4: Run tests**

Run: `php artisan test tests/Feature/CollectedPublicTest.php tests/Feature/PublicApiTest.php tests/Feature/SearchTest.php` → PASS.

- [ ] **Step 5: Commit**

```bash
git add app/Http/Controllers/CollectedController.php tests/Feature/CollectedPublicTest.php tests/Feature/PublicApiTest.php
git commit -m "feat: collected drawer payload with category counts"
```

---

### Task 7: Drawer home (`Collected/Index.tsx` rewrite) + CSS motion

**Files:** Modify `resources/js/Pages/Collected/Index.tsx`, `resources/css/app.css`; Test `resources/js/Components/__tests__/CollectedDrawer.test.tsx`.

**Interfaces:**
- Consumes: Task 4 components/types + `EditorialList` (Task 5).
- Produces: drawer behavior — tiles are Inertia `<Link>`s whose click handler writes `--launch-x`/`--launch-y` (px, tile center) onto `document.documentElement` and adds the `animate-pushback` class; search section `aria-label="Search results"` + `aria-live="polite"`; CSS classes `animate-tile-in`, `animate-pushback`, `animate-row-in`, `animate-rail-in`, `animate-page-launch`, `animate-page-leave`, `animate-backdrop-in`, `animate-modal-in`, `animate-modal-out` defined in `app.css` (Tasks 9/4 consume the launch/modal ones).

- [ ] **Step 1: Failing test** — `resources/js/Components/__tests__/CollectedDrawer.test.tsx`:

```tsx
import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@inertiajs/react', () => ({
    Head: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode; onClick?: () => void }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
    router: { get: vi.fn() },
}));
vi.mock('@/Layouts/PublicLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/Components/SearchInput', () => ({
    SearchInput: ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
        <input aria-label={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    ),
}));
vi.mock('@/Pages/Collected/views/EditorialList', () => ({
    EditorialList: ({ items }: { items: { id: number; title: string }[] }) => (
        <ul data-testid="results">
            {items.map((i) => (
                <li key={i.id}>{i.title}</li>
            ))}
        </ul>
    ),
}));

import CollectedIndex from '@/Pages/Collected/Index';
import { makeItem } from './collectedFixtures';
import type { CategoryTile, Paginated } from '@/collectedTypes';

const categories: CategoryTile[] = [
    { type: 'book', label: 'Books', count: 3, href: '/collected/books' },
    { type: 'tool', label: 'Tools', count: 2, href: '/collected/tools' },
];

test('renders category tiles with counts, hrefs and accessible names', () => {
    render(<CollectedIndex categories={categories} items={null} filters={{ q: null }} />);

    const books = screen.getByRole('link', { name: 'Books, 3 items' });
    expect(books).toHaveAttribute('href', '/collected/books');
    expect(screen.getByRole('link', { name: 'Tools, 2 items' })).toHaveAttribute('href', '/collected/tools');
    expect(screen.getByRole('heading', { name: 'Collected' })).toBeInTheDocument();
});

test('shows an empty state when there is nothing to show', () => {
    render(<CollectedIndex categories={[]} items={null} filters={{ q: null }} />);
    expect(screen.getByText('Nothing collected yet')).toBeInTheDocument();
});

test('renders search results with a live count when items are present', () => {
    const items: Paginated<ReturnType<typeof makeItem>> = {
        data: [makeItem({ id: 1, title: 'Hit One' }), makeItem({ id: 2, title: 'Hit Two' })],
        links: [{ url: null, label: '1', active: true }],
        total: 2,
    };
    render(<CollectedIndex categories={categories} items={items} filters={{ q: 'hit' }} />);

    expect(screen.getByText('2 results for “hit”')).toBeInTheDocument();
    expect(screen.getByTestId('results')).toBeInTheDocument();
    expect(screen.getByText('Hit One')).toBeInTheDocument();
    expect(screen.getByLabelText('Search results')).toBeInTheDocument();
});

test('clicking a tile records the launch origin on the document', () => {
    render(<CollectedIndex categories={categories} items={null} filters={{ q: null }} />);
    fireEvent.click(screen.getByRole('link', { name: 'Books, 3 items' }));

    expect(document.documentElement.style.getPropertyValue('--launch-x')).not.toBe('');
    expect(document.documentElement.style.getPropertyValue('--launch-y')).not.toBe('');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- Components/__tests__/CollectedDrawer.test.tsx` → FAIL (page component shape/props mismatch or module errors).

- [ ] **Step 3: Add motion CSS** — append to `resources/css/app.css` (keyframes at top level, classes inside the existing `@layer components`):

```css
@keyframes tile-in {
    from { opacity: 0; transform: translateY(10px) scale(0.96); }
    to { opacity: 1; transform: none; }
}
@keyframes page-launch {
    from {
        opacity: 0;
        transform: translate(calc(var(--launch-x, 50vw) - 50vw), calc(var(--launch-y, 50vh) - 50vh)) scale(0.94);
    }
    to { opacity: 1; transform: none; }
}
@keyframes page-pushback {
    to { transform: scale(1.04); opacity: 0.5; }
}
@keyframes page-leave {
    to { opacity: 0; transform: translate(-32px, -24px) scale(0.97); }
}
@keyframes backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
}
@keyframes modal-in {
    from { opacity: 0; transform: translateY(14px) scale(0.94); }
    to { opacity: 1; transform: none; }
}
@keyframes modal-out {
    from { opacity: 1; transform: none; }
    to { opacity: 0; transform: translateY(8px) scale(0.97); }
}
@keyframes rail-in {
    from { opacity: 0; transform: translateX(28px); }
    to { opacity: 1; transform: none; }
}
@keyframes row-in {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: none; }
}
```

Inside the existing `@layer components { … }` block add:

```css
    .animate-tile-in { animation: tile-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
    .animate-page-launch { animation: page-launch 0.34s cubic-bezier(0.32, 0.72, 0, 1) both; }
    .animate-pushback { animation: page-pushback 0.3s cubic-bezier(0.32, 0.72, 0, 1) both; }
    .animate-page-leave { animation: page-leave 0.26s cubic-bezier(0.32, 0.72, 0, 1) both; }
    .animate-backdrop-in { animation: backdrop-in 0.18s ease-out both; }
    .animate-modal-in { animation: modal-in 0.3s cubic-bezier(0.32, 0.72, 0, 1) both; }
    .animate-modal-out { animation: modal-out 0.2s cubic-bezier(0.32, 0.72, 0, 1) both; }
    .animate-rail-in { animation: rail-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
    .animate-row-in { animation: row-in 0.35s ease-out both; }
```

- [ ] **Step 4: Rewrite `resources/js/Pages/Collected/Index.tsx`** (full file):

```tsx
import PublicLayout from '@/Layouts/PublicLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { SearchInput } from '@/Components/SearchInput';
import { Pagination } from '@/Components/Pagination';
import { EmptyState } from '@/Components/EmptyState';
import { ItemModal } from '@/Components/collected/ItemModal';
import { EditorialList } from '@/Pages/Collected/views/EditorialList';
import { TYPE_GLYPHS, type CategoryTile, type CollectedItem, type Paginated } from '@/collectedTypes';

type Props = {
    categories: CategoryTile[];
    items: Paginated<CollectedItem> | null;
    filters: { q: string | null };
};

export default function CollectedIndex({ categories, items, filters }: Props) {
    const [q, setQ] = useState(filters.q ?? '');
    const [open, setOpen] = useState<CollectedItem | null>(null);
    const [pushing, setPushing] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => setQ(filters.q ?? ''), [filters.q]);
    useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current);
    }, []);

    const onSearch = (next: string) => {
        setQ(next);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            router.get('/collected', { q: next || undefined }, { preserveState: true, preserveScroll: true });
        }, 300);
    };

    const launchFrom = (event: React.MouseEvent<HTMLAnchorElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const root = document.documentElement;
        root.style.setProperty('--launch-x', `${rect.left + rect.width / 2}px`);
        root.style.setProperty('--launch-y', `${rect.top + rect.height / 2}px`);
        setPushing(true);
    };

    return (
        <PublicLayout>
            <Head>
                <title>Collected — Timadey</title>
                <meta name="description" content="Books, articles, videos, and tools I keep coming back to." />
                <meta property="og:type" content="website" />
                <meta property="og:title" content="Collected — Timadey" />
                <meta property="og:description" content="Books, articles, videos, and tools I keep coming back to." />
                <meta property="og:url" content="/collected" />
                <link rel="canonical" href="/collected" />
                <meta name="twitter:card" content="summary" />
            </Head>
            <div className="mx-auto max-w-4xl px-4 pt-10 pb-16 sm:px-6">
                <h1 className="text-3xl font-semibold tracking-tight">Collected</h1>
                <p className="mt-2 text-meta">Books, articles, videos, and tools I keep coming back to.</p>

                <div className={`mt-8 overflow-hidden rounded-lg border border-hairline bg-white ${pushing ? 'animate-pushback' : ''}`}>
                    <div className="flex items-center gap-2 border-b border-hairline bg-surface px-4 py-2.5" aria-hidden="true">
                        <span className="h-3 w-3 rounded-full border border-hairline bg-white" />
                        <span className="h-3 w-3 rounded-full border border-hairline bg-white" />
                        <span className="h-3 w-3 rounded-full border border-hairline bg-white" />
                        <span className="ml-2 text-xs font-medium text-meta">Collected</span>
                    </div>

                    <div className="px-4 py-5 sm:px-6">
                        <div className="max-w-sm">
                            <SearchInput value={q} onChange={onSearch} placeholder="Search collection" />
                        </div>

                        {categories.length === 0 && items === null && (
                            <div className="mt-6">
                                <EmptyState title="Nothing collected yet" hint="Categories will appear here once there's something to show." />
                            </div>
                        )}

                        <ul className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4 sm:gap-6 lg:grid-cols-6" aria-label="Categories">
                            {categories.map((category, index) => {
                                const Glyph = TYPE_GLYPHS[category.type];
                                return (
                                    <li key={category.type} className="animate-tile-in" style={{ animationDelay: `${index * 35}ms` }}>
                                        <Link
                                            href={category.href}
                                            onClick={launchFrom}
                                            aria-label={`${category.label}, ${category.count} items`}
                                            className="group flex flex-col items-center gap-2 rounded-md p-2 transition hover:bg-surface/80"
                                        >
                                            <span className="relative">
                                                <span className="flex h-16 w-16 items-center justify-center rounded-[10px] border border-hairline bg-surface transition group-hover:border-meta/60 sm:h-[72px] sm:w-[72px]">
                                                    <Glyph className="h-7 w-7 text-ink" strokeWidth={1.5} aria-hidden="true" />
                                                </span>
                                                <span className="absolute -right-2 -top-2 min-w-5 rounded-full border border-hairline bg-white px-1.5 py-px text-center text-[10px] font-medium leading-4 text-meta">
                                                    {category.count}
                                                </span>
                                            </span>
                                            <span className="text-center text-sm text-ink">{category.label}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>

                        {items && (
                            <section className="mt-8 border-t border-hairline pt-6" aria-label="Search results" aria-live="polite">
                                <p className="text-sm text-meta">
                                    {items.total} {items.total === 1 ? 'result' : 'results'} for “{filters.q}”
                                </p>
                                <div className="mt-2">
                                    {items.data.length > 0 ? (
                                        <EditorialList items={items.data} onOpen={setOpen} lead={false} />
                                    ) : (
                                        <EmptyState title="No matches" hint="Try different words." />
                                    )}
                                </div>
                                <Pagination links={items.links} />
                            </section>
                        )}
                    </div>
                </div>
            </div>
            <ItemModal item={open} onClose={() => setOpen(null)} />
        </PublicLayout>
    );
}
```

- [ ] **Step 5: Run tests + build**

Run: `npm test -- Components/__tests__/CollectedDrawer.test.tsx` → PASS (4 tests).
Run: `npm test` → PASS (all Vitest suites green).
Run: `npm run build` → succeeds.

- [ ] **Step 6: Commit**

```bash
git add resources/js/Pages/Collected/Index.tsx resources/css/app.css resources/js/Components/__tests__/CollectedDrawer.test.tsx
git commit -m "feat: collected app drawer home with search and launch motion"
```

---

### Task 8: Category route + `CollectedController::show`

**Files:** Modify `routes/web.php:86`, `app/Http/Controllers/CollectedController.php`; Create `tests/Feature/CollectedShowTest.php`.

**Interfaces:**
- Consumes: `CollectedTypes`, `mapItem()` (Task 6).
- Produces: `GET /collected/{type}` (`where('type', '[a-z]+')`, named `collected.show`) rendering `Collected/Show` with `{ type: ItemType; label: string; segment: string; items: Paginated<CollectedItem>; tags: {label, slug}[]; filters: {tag: string|null} }` (`items.total` = filtered count).

- [ ] **Step 1: Failing test** — `tests/Feature/CollectedShowTest.php`:

```php
<?php

use App\Models\CollectedItem;
use App\Models\Tag;

it('renders a category page with its label and items', function () {
    CollectedItem::factory()->create(['title' => 'Thinking in Systems', 'item_type' => 'book', 'visibility' => 'public']);

    $this->get('/collected/books')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Collected/Show')
            ->where('type', 'book')
            ->where('label', 'Books')
            ->where('segment', 'books')
            ->where('items.data.0.title', 'Thinking in Systems'));
});

it('renders every known category segment', function () {
    foreach (['books' => 'book', 'articles' => 'article', 'videos' => 'video', 'podcasts' => 'podcast', 'music' => 'music', 'tools' => 'tool', 'quotes' => 'quote', 'websites' => 'website', 'others' => 'other'] as $segment => $type) {
        CollectedItem::factory()->create(['item_type' => $type, 'visibility' => 'public']);
        $this->get("/collected/{$segment}")->assertOk()
            ->assertInertia(fn ($p) => $p->component('Collected/Show')->where('type', $type));
    }
});

it('404s on an unknown category', function () {
    $this->get('/collected/nope')->assertNotFound();
});

it('404s when a category has no public items', function () {
    CollectedItem::factory()->create(['item_type' => 'book', 'visibility' => 'private']);
    CollectedItem::factory()->create(['item_type' => 'music', 'visibility' => 'public']);

    $this->get('/collected/books')->assertNotFound();
    $this->get('/collected/tools')->assertNotFound(); // nothing at all
});

it('excludes private items from a category', function () {
    CollectedItem::factory()->create(['title' => 'Public Book', 'item_type' => 'book', 'visibility' => 'public']);
    CollectedItem::factory()->create(['title' => 'Secret Book', 'item_type' => 'book', 'visibility' => 'private']);

    $this->get('/collected/books')->assertOk()
        ->assertInertia(fn ($p) => $p
            ->where('items.total', 1)
            ->where('items.data.0.title', 'Public Book'));
});

it('filters a category by tag and exposes the category tag list', function () {
    $tagged = CollectedItem::factory()->create(['title' => 'Tagged Book', 'item_type' => 'book', 'visibility' => 'public']);
    CollectedItem::factory()->create(['title' => 'Plain Book', 'item_type' => 'book', 'visibility' => 'public']);
    $tag = Tag::create(['name' => 'Systems']);
    $tagged->tags()->attach($tag->id);

    $this->get('/collected/books?tag=systems')->assertOk()
        ->assertInertia(fn ($p) => $p
            ->where('items.total', 1)
            ->where('items.data.0.title', 'Tagged Book')
            ->where('tags.0.label', 'Systems')
            ->where('tags.0.slug', 'systems')
            ->where('filters.tag', 'systems'));
});

it('renders an empty result set when a tag matches nothing', function () {
    CollectedItem::factory()->create(['item_type' => 'book', 'visibility' => 'public']);

    $this->get('/collected/books?tag=missing')->assertOk()
        ->assertInertia(fn ($p) => $p->where('items.total', 0)->where('items.data', []));
});
```

- [ ] **Step 2: Run to verify failure**

Run: `php artisan test tests/Feature/CollectedShowTest.php` → FAIL (404 — route missing).

- [ ] **Step 3: Register the route** — `routes/web.php` after the existing `/collected` line (86):

```php
Route::get('/collected/{type}', [\App\Http\Controllers\CollectedController::class, 'show'])
    ->where('type', '[a-z]+')
    ->name('collected.show');
```

- [ ] **Step 4: Add `show()` to `CollectedController`**

Add `use App\Models\Tag;` already present from Task 6; append this method (keep `index`/`mapItem`/`drawerCategories` untouched):

```php
public function show(Request $request, string $type): Response
{
    $singular = CollectedTypes::fromSegment($type);
    abort_unless($singular !== null, 404);

    abort_unless(
        CollectedItem::publiclyVisible()->where('item_type', $singular)->exists(),
        404
    );

    $query = CollectedItem::publiclyVisible()
        ->where('item_type', $singular)
        ->with('tags')
        ->latest('created_at');

    if ($tag = $request->query('tag')) {
        $query->whereHas('tags', fn ($t) => $t->where('slug', $tag));
    }

    $tags = Tag::whereHas('collectedItems', fn ($q) => $q
            ->where('collected_items.item_type', $singular)
            ->where('visibility', 'public'))
        ->orderBy('name')
        ->get(['name', 'slug'])
        ->map(fn ($t) => ['label' => $t->name, 'slug' => $t->slug])
        ->values();

    return Inertia::render('Collected/Show', [
        'type' => $singular,
        'label' => CollectedTypes::label($singular),
        'segment' => $type,
        'items' => $query->paginate(20)->withQueryString()->through(fn ($i) => $this->mapItem($i)),
        'tags' => $tags,
        'filters' => $request->only(['tag']),
    ]);
}
```

- [ ] **Step 5: Run tests**

Run: `php artisan test tests/Feature/CollectedShowTest.php tests/Feature/CollectedPublicTest.php` → PASS.

- [ ] **Step 6: Commit**

```bash
git add routes/web.php app/Http/Controllers/CollectedController.php tests/Feature/CollectedShowTest.php
git commit -m "feat: collected category pages with tag filters"
```

---

### Task 9: Category shell (`Collected/Show.tsx`) + view registry + launch/leave motion

**Files:** Create `resources/js/Pages/Collected/Show.tsx`, `resources/js/Pages/Collected/views/registry.ts`; Test `resources/js/Components/__tests__/CollectedShowShell.test.tsx`.

**Interfaces:**
- Consumes: Task 8 props; `EditorialList` (Task 5); `ItemModal`, `TYPE_SEGMENTS`, `Paginated` (Task 4); `prefersReducedMotion` (`motion.ts`); `animate-page-launch` / `animate-page-leave` (Task 7 CSS).
- Produces: `views/registry.ts` exporting `ViewProps = { items: CollectedItem[]; onOpen: (item: CollectedItem) => void }`, `ViewComponent = ComponentType<ViewProps>`, `resolveView(type: ItemType): ViewComponent` (registry initially: `article, podcast, quote, other → EditorialList`, everything else falls back to `EditorialList`; Tasks 10–14 add entries). Shell sets `ItemModal` state, back-link behavior (writes nothing; adds `animate-page-leave` then `router.get('/collected')` after 200ms unless reduced motion), and reads/clears `--launch-x` on mount to apply `animate-page-launch`.

- [ ] **Step 1: Failing test** — `resources/js/Components/__tests__/CollectedShowShell.test.tsx`:

```tsx
import { test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@inertiajs/react', () => ({
    Head: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
    router: { get: vi.fn() },
}));
vi.mock('@/Layouts/PublicLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import CollectedShow from '@/Pages/Collected/Show';
import { makeItem } from './collectedFixtures';
import type { Paginated } from '@/collectedTypes';

const items: Paginated<ReturnType<typeof makeItem>> = {
    data: [
        makeItem({ id: 1, title: 'First Other', item_type: 'other' }),
        makeItem({ id: 2, title: 'Second Other', item_type: 'other', annotation: null }),
    ],
    links: [
        { url: null, label: '&laquo; Previous', active: false },
        { url: '/collected/others?page=1', label: '1', active: true },
        { url: null, label: 'Next &raquo;', active: false },
    ],
    total: 2,
};

test('renders the shell header, count, back link and fallback view', () => {
    render(
        <CollectedShow type="other" label="Other" segment="others" items={items} tags={[]} filters={{ tag: null }} />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Other' })).toBeInTheDocument();
    expect(screen.getByText('2 items')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Collected' })).toHaveAttribute('href', '/collected');
    expect(screen.getByRole('button', { name: 'First Other' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Second Other/ })).toBeInTheDocument();
});

test('renders tag chips with the active state', () => {
    render(
        <CollectedShow
            type="other"
            label="Other"
            segment="others"
            items={items}
            tags={[{ label: 'Systems', slug: 'systems' }]}
            filters={{ tag: 'systems' }}
        />,
    );

    const tags = screen.getByRole('navigation', { name: 'Filter by tag' });
    expect(tags).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Systems' }).className).toContain('bg-primary');
    expect(screen.getByRole('link', { name: 'All' })).toHaveAttribute('href', '/collected/others');
});

test('shows an empty state instead of the view when the tag matches nothing', () => {
    render(
        <CollectedShow
            type="other"
            label="Other"
            segment="others"
            items={{ ...items, data: [], total: 0 }}
            tags={[]}
            filters={{ tag: 'missing' }}
        />,
    );

    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- Components/__tests__/CollectedShowShell.test.tsx` → FAIL (module not found).

- [ ] **Step 3: Create `views/registry.ts`**

```ts
import type { ComponentType } from 'react';
import type { CollectedItem, ItemType } from '@/collectedTypes';
import { EditorialList } from './EditorialList';

export type ViewProps = {
    items: CollectedItem[];
    onOpen: (item: CollectedItem) => void;
};
export type ViewComponent = ComponentType<ViewProps>;

const REGISTRY: Partial<Record<ItemType, ViewComponent>> = {
    article: EditorialList,
    podcast: EditorialList,
    quote: EditorialList,
    other: EditorialList,
};

export function resolveView(type: ItemType): ViewComponent {
    return REGISTRY[type] ?? EditorialList;
}
```

- [ ] **Step 4: Create `Pages/Collected/Show.tsx`** (full file):

```tsx
import PublicLayout from '@/Layouts/PublicLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { EmptyState } from '@/Components/EmptyState';
import { Pagination } from '@/Components/Pagination';
import { Tag } from '@/Components/Tag';
import { ItemModal } from '@/Components/collected/ItemModal';
import { prefersReducedMotion } from '@/motion';
import type { CollectedItem, ItemType, Paginated } from '@/collectedTypes';
import { resolveView } from './views/registry';

type Props = {
    type: ItemType;
    label: string;
    segment: string;
    items: Paginated<CollectedItem>;
    tags: { label: string; slug: string }[];
    filters: { tag?: string | null };
};

export default function CollectedShow({ type, label, segment, items, tags, filters }: Props) {
    const [open, setOpen] = useState<CollectedItem | null>(null);
    const shellRef = useRef<HTMLDivElement>(null);

    const launchClass =
        typeof document !== 'undefined' && document.documentElement.style.getPropertyValue('--launch-x')
            ? 'animate-page-launch'
            : '';

    useEffect(() => {
        if (!launchClass) return;
        const root = document.documentElement;
        const timer = window.setTimeout(() => {
            root.style.removeProperty('--launch-x');
            root.style.removeProperty('--launch-y');
        }, 600);
        return () => window.clearTimeout(timer);
    }, [launchClass]);

    const goBack = (event: React.MouseEvent<HTMLAnchorElement>) => {
        if (prefersReducedMotion()) return;
        event.preventDefault();
        shellRef.current?.classList.add('animate-page-leave');
        window.setTimeout(() => router.get('/collected'), 200);
    };

    const View = resolveView(type);

    return (
        <PublicLayout>
            <Head>
                <title>{label} — Collected — Timadey</title>
                <meta name="description" content={`Things I've collected: ${label.toLowerCase()}.`} />
                <link rel="canonical" href={`/collected/${segment}`} />
                <meta property="og:type" content="website" />
                <meta property="og:title" content={`${label} — Collected — Timadey`} />
                <meta name="twitter:card" content="summary" />
            </Head>
            <div ref={shellRef} className={`mx-auto max-w-5xl px-6 pt-10 pb-16 ${launchClass}`}>
                <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline pb-4">
                    <Link
                        href="/collected"
                        onClick={goBack}
                        aria-label="Back to Collected"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-hairline text-ink hover:bg-surface"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <h1 className="text-2xl font-semibold tracking-tight">{label}</h1>
                    <span className="text-sm text-meta">
                        {items.total} {items.total === 1 ? 'item' : 'items'}
                    </span>
                </header>

                {tags.length > 0 && (
                    <nav className="mt-4 flex flex-wrap gap-2" aria-label="Filter by tag">
                        <Tag label="All" href={`/collected/${segment}`} active={!filters.tag} />
                        {tags.map((tag) => (
                            <Tag
                                key={tag.slug}
                                label={tag.label}
                                href={`/collected/${segment}?tag=${tag.slug}`}
                                active={filters.tag === tag.slug}
                            />
                        ))}
                    </nav>
                )}

                <div className="mt-6">
                    {items.data.length > 0 ? (
                        <View items={items.data} onOpen={setOpen} />
                    ) : (
                        <EmptyState title="Nothing here yet" hint="Try another tag." />
                    )}
                </div>

                <Pagination links={items.links} />
            </div>
            <ItemModal item={open} onClose={() => setOpen(null)} />
        </PublicLayout>
    );
}
```

Note: `Tag` with `href` renders Inertia `<Link>`; `active` styling applies to both branches (existing component behavior).

- [ ] **Step 5: Run tests + build**

Run: `npm test -- Components/__tests__/CollectedShowShell.test.tsx` → PASS (3 tests).
Run: `npm run build` → succeeds.

- [ ] **Step 6: Commit**

```bash
git add resources/js/Pages/Collected/Show.tsx resources/js/Pages/Collected/views/registry.ts resources/js/Components/__tests__/CollectedShowShell.test.tsx
git commit -m "feat: collected category shell with launch transitions"
```

---

### Task 10: Books shelf (`BooksGrid`)

**Files:** Create `resources/js/Pages/Collected/views/BooksGrid.tsx`; Test `resources/js/Components/__tests__/BooksGrid.test.tsx`; Modify `views/registry.ts` (one line).

**Interfaces:**
- Consumes: `CoverImage`, `ItemTitle`, `ViewProps` (registry), `resolveView` (Task 9).
- Produces: `BooksGrid({ items, onOpen })`; registry entry `book: BooksGrid`.

- [ ] **Step 1: Failing test** — `resources/js/Components/__tests__/BooksGrid.test.tsx`:

```tsx
import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BooksGrid } from '@/Pages/Collected/views/BooksGrid';
import { makeItem } from './collectedFixtures';

const books = [
    makeItem({ id: 1, title: 'Thinking in Systems', cover_image: 'https://cdn.example.com/1.jpg', item_type: 'book' }),
    makeItem({ id: 2, title: 'Design of Everyday Things', cover_image: null, item_type: 'book', creator: 'Don Norman' }),
];

test('renders the Library rail and the full grid with covers', () => {
    render(<BooksGrid items={books} onOpen={() => {}} />);

    expect(screen.getByRole('region', { name: 'Library' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'All books' })).toBeInTheDocument();
    expect(screen.getAllByAltText('Cover of Thinking in Systems').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Do').length).toBeGreaterThan(0); // serif initials for coverless book (Design of…)
});

test('tapping an annotated book title opens it', () => {
    const onOpen = vi.fn();
    render(<BooksGrid items={books} onOpen={onOpen} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Thinking in Systems' })[0]);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
});

test('books without annotation link out', () => {
    render(<BooksGrid items={[books[1]]} onOpen={() => {}} />);
    const link = screen.getAllByRole('link', { name: /Design of Everyday Things/ })[0];
    expect(link).toHaveAttribute('target', '_blank');
});
```

- [ ] **Step 2: Run to verify failure** → `npm test -- Components/__tests__/BooksGrid.test.tsx` FAIL (module not found).

- [ ] **Step 3: Implement the view** — `resources/js/Pages/Collected/views/BooksGrid.tsx`:

```tsx
import { CoverImage } from '@/Components/collected/CoverImage';
import { ItemTitle } from '@/Components/collected/ItemTitle';
import type { CollectedItem } from '@/collectedTypes';

export type BooksGridProps = {
    items: CollectedItem[];
    onOpen: (item: CollectedItem) => void;
};

function BookCell({ item, onOpen }: { item: CollectedItem; onOpen: BooksGridProps['onOpen'] }) {
    return (
        <div className="animate-row-in">
            <CoverImage src={item.cover_image} title={item.title} kind="book" className="rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.12)]" />
            <ItemTitle item={item} onOpen={onOpen} className="mt-2.5 block line-clamp-2 text-sm font-medium text-ink" />
            {item.creator && <p className="truncate text-xs text-meta">{item.creator}</p>}
        </div>
    );
}

export function BooksGrid({ items, onOpen }: BooksGridProps) {
    const rail = items.slice(0, 8);

    return (
        <div className="space-y-10">
            <section aria-label="Library">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-meta">Library</h2>
                <ul className="mt-3 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-3">
                    {rail.map((item, index) => (
                        <li
                            key={item.id}
                            className="w-36 shrink-0 snap-start animate-rail-in sm:w-44"
                            style={{ animationDelay: `${index * 30}ms` }}
                        >
                            <BookCell item={item} onOpen={onOpen} />
                        </li>
                    ))}
                </ul>
            </section>

            <section aria-label="All books">
                <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                    {items.map((item) => (
                        <BookCell key={item.id} item={item} onOpen={onOpen} />
                    ))}
                </div>
            </section>
        </div>
    );
}
```

Registry line — in `views/registry.ts` `REGISTRY` add:

```ts
    book: BooksGrid,
```

with `import { BooksGrid } from './BooksGrid';` at top.

- [ ] **Step 4: Run to verify passes** → `npm test -- Components/__tests__/BooksGrid.test.tsx` PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add resources/js/Pages/Collected/views/BooksGrid.tsx resources/js/Pages/Collected/views/registry.ts resources/js/Components/__tests__/BooksGrid.test.tsx
git commit -m "feat: apple books style shelf for collected books"
```

---

### Task 11: Video grid (`VideoGrid`)

**Files:** Create `resources/js/Pages/Collected/views/VideoGrid.tsx`; Test `resources/js/Components/__tests__/VideoGrid.test.tsx`; Modify `views/registry.ts`.

**Interfaces:**
- Consumes: `CoverImage` (`glyph`, `glyphClassName`), `ItemTitle`, `ItemTags`, `ViewProps`.
- Produces: `VideoGrid({ items, onOpen })`; registry entry `video: VideoGrid`.

- [ ] **Step 1: Failing test** — `resources/js/Components/__tests__/VideoGrid.test.tsx`:

```tsx
import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoGrid } from '@/Pages/Collected/views/VideoGrid';
import { makeItem } from './collectedFixtures';

const withCover = makeItem({ id: 1, title: 'Product Talk', item_type: 'video', cover_image: 'https://cdn.example.com/v.jpg' });
const noCover = makeItem({ id: 2, title: 'No Cover Talk', item_type: 'video', cover_image: null, annotation: 'watch me' });

test('renders a 16:9 tile with the cover and the title scrim', () => {
    render(<VideoGrid items={[withCover]} onOpen={() => {}} />);
    expect(screen.getByAltText('Cover of Product Talk')).toBeInTheDocument();
    expect(screen.getAllByText('Product Talk').length).toBeGreaterThan(0); // overlay + ItemTitle
});

test('renders the play glyph placeholder without a cover', () => {
    render(<VideoGrid items={[noCover]} onOpen={() => {}} />);
    expect(screen.queryByAltText('Cover of No Cover Talk')).not.toBeInTheDocument();
    expect(screen.getAllByText('No Cover Talk').length).toBeGreaterThan(0);
});

test('annotated videos open the modal, plain videos link out', () => {
    const onOpen = vi.fn();
    const { rerender } = render(<VideoGrid items={[noCover]} onOpen={onOpen} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'No Cover Talk' })[0]);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));

    rerender(<VideoGrid items={[{ ...noCover, annotation: null }]} onOpen={onOpen} />);
    expect(screen.getAllByRole('link', { name: /No Cover Talk/ })[0]).toHaveAttribute('target', '_blank');
});
```

- [ ] **Step 2: Run to verify failure** → FAIL (module not found).

- [ ] **Step 3: Implement** — `resources/js/Pages/Collected/views/VideoGrid.tsx`:

```tsx
import { Play } from 'lucide-react';
import { CoverImage } from '@/Components/collected/CoverImage';
import { ItemTags } from '@/Components/collected/ItemTags';
import { ItemTitle } from '@/Components/collected/ItemTitle';
import type { CollectedItem } from '@/collectedTypes';

export type VideoGridProps = {
    items: CollectedItem[];
    onOpen: (item: CollectedItem) => void;
};

export function VideoGrid({ items, onOpen }: VideoGridProps) {
    return (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
                <li key={item.id} className="animate-row-in">
                    <div className="group relative overflow-hidden rounded-lg border border-hairline">
                        <CoverImage
                            src={item.cover_image}
                            title={item.title}
                            kind="video"
                            glyph={Play}
                            glyphClassName="h-12 w-12 rounded-full border border-hairline bg-white/80 p-3 text-ink"
                            className="w-full"
                        />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.6),transparent)] p-3">
                            <p className="truncate text-sm font-medium text-white">{item.title}</p>
                            {item.creator && <p className="truncate text-xs text-white/80">{item.creator}</p>}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
                            <ItemTitle item={item} onOpen={onOpen} className="min-w-0 flex-1 truncate text-sm font-medium text-ink" />
                            <span className="text-xs text-meta">{item.date}</span>
                        </div>
                        <div className="px-1 pb-1">
                            <ItemTags item={item} />
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    );
}
```

Registry: add `video: VideoGrid,` to `REGISTRY` + import.

Note: the `ItemTitle` outside the overlay is the real click target (button/anchor per mixed rule) so the whole tile reads as clickable; the overlay title is decorative duplication (pointer-events-none).

- [ ] **Step 4: Run to verify passes** → `npm test -- Components/__tests__/VideoGrid.test.tsx` PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add resources/js/Pages/Collected/views/VideoGrid.tsx resources/js/Pages/Collected/views/registry.ts resources/js/Components/__tests__/VideoGrid.test.tsx
git commit -m "feat: video grid view for collected videos"
```

---

### Task 12: Music shelf (`MusicShelf`)

**Files:** Create `resources/js/Pages/Collected/views/MusicShelf.tsx`; Test `resources/js/Components/__tests__/MusicShelf.test.tsx`; Modify `views/registry.ts`.

**Interfaces:**
- Consumes: `CoverImage` (kind `music`, `glyph={Disc3}`), `ItemTitle`, `ItemTags`, `ViewProps`.
- Produces: `MusicShelf({ items, onOpen })`; registry entry `music: MusicShelf`.

- [ ] **Step 1: Failing test** — `resources/js/Components/__tests__/MusicShelf.test.tsx`:

```tsx
import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MusicShelf } from '@/Pages/Collected/views/MusicShelf';
import { makeItem } from './collectedFixtures';

const tracks = [
    makeItem({ id: 1, title: 'Blue Train', item_type: 'music', creator: 'John Coltrane', cover_image: null }),
    makeItem({ id: 2, title: 'So What', item_type: 'music', creator: 'Miles Davis', cover_image: 'https://cdn.example.com/a.jpg' }),
];

test('renders the Recently added rail and the full grid', () => {
    render(<MusicShelf items={tracks} onOpen={() => {}} />);
    expect(screen.getByRole('region', { name: 'Recently added' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'All music' })).toBeInTheDocument();
    expect(screen.getAllByAltText('Cover of So What').length).toBeGreaterThan(0);
    expect(screen.getAllByText('John Coltrane').length).toBeGreaterThan(0);
});

test('annotated albums open on click', () => {
    const onOpen = vi.fn();
    render(<MusicShelf items={tracks} onOpen={onOpen} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Blue Train' })[0]);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
});
```

- [ ] **Step 2: Run to verify failure** → FAIL (module not found).

- [ ] **Step 3: Implement** — `resources/js/Pages/Collected/views/MusicShelf.tsx`:

```tsx
import { Disc3 } from 'lucide-react';
import { CoverImage } from '@/Components/collected/CoverImage';
import { ItemTags } from '@/Components/collected/ItemTags';
import { ItemTitle } from '@/Components/collected/ItemTitle';
import type { CollectedItem } from '@/collectedTypes';

export type MusicShelfProps = {
    items: CollectedItem[];
    onOpen: (item: CollectedItem) => void;
};

function AlbumCell({ item, onOpen }: { item: CollectedItem; onOpen: MusicShelfProps['onOpen'] }) {
    return (
        <div className="animate-row-in">
            <CoverImage src={item.cover_image} title={item.title} kind="music" glyph={Disc3} className="rounded-md border border-hairline" />
            <ItemTitle item={item} onOpen={onOpen} className="mt-2 block truncate text-sm font-medium text-ink" />
            {item.creator && <p className="truncate text-xs text-meta">{item.creator}</p>}
            <div className="mt-1">
                <ItemTags item={item} />
            </div>
        </div>
    );
}

export function MusicShelf({ items, onOpen }: MusicShelfProps) {
    const rail = items.slice(0, 8);

    return (
        <div className="space-y-10">
            <section aria-label="Recently added">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-meta">Recently added</h2>
                <ul className="mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
                    {rail.map((item, index) => (
                        <li
                            key={item.id}
                            className="w-36 shrink-0 snap-start animate-rail-in sm:w-44"
                            style={{ animationDelay: `${index * 40}ms` }}
                        >
                            <AlbumCell item={item} onOpen={onOpen} />
                        </li>
                    ))}
                </ul>
            </section>

            <section aria-label="All music">
                <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
                    {items.map((item) => (
                        <AlbumCell key={item.id} item={item} onOpen={onOpen} />
                    ))}
                </div>
            </section>
        </div>
    );
}
```

Registry: add `music: MusicShelf,` + import.

- [ ] **Step 4: Run to verify passes** → PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add resources/js/Pages/Collected/views/MusicShelf.tsx resources/js/Pages/Collected/views/registry.ts resources/js/Components/__tests__/MusicShelf.test.tsx
git commit -m "feat: apple music style shelf for collected music"
```

---

### Task 13: Finder tools (`FinderTools`) — the showpiece

**Files:** Create `resources/js/Pages/Collected/views/FinderTools.tsx`; Test `resources/js/Components/__tests__/FinderTools.test.tsx`; Modify `views/registry.ts`.

**Interfaces:**
- Consumes: `CoverImage` (glyph tiles via `TYPE_GLYPHS[item.item_type]`), `isCoarsePointer` (`motion.ts`), `ViewProps`.
- Produces: `FinderTools({ items, onOpen })` — **always calls `onOpen(item)` on activation** (Tools exception to the mixed rule); registry entry `tool: FinderTools`.

**ARIA decision (refines the spec):** the spec said `role="grid"`/`gridcell`, but valid ARIA requires `row` wrappers under `grid`, while the interaction model is selection through a focusable container. Implement as `role="listbox"` + `role="option"` + `aria-activedescendant` — same behavior (spatial arrow keys, single selection, Enter opens), valid ARIA, no wrapper surgery.

- [ ] **Step 1: Failing test** — `resources/js/Components/__tests__/FinderTools.test.tsx`:

```tsx
import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FinderTools } from '@/Pages/Collected/views/FinderTools';
import { makeItem } from './collectedFixtures';

const tools = Array.from({ length: 12 }, (_, index) =>
    makeItem({
        id: index + 1,
        title: `Tool ${index + 1}`,
        item_type: 'tool',
        url: `https://tool${index + 1}.example.com`,
        annotation: `What it does: ${index + 1}`,
    }),
);

test('renders a labelled listbox of options with the finder hint', () => {
    render(<FinderTools items={tools} onOpen={() => {}} />);

    const listbox = screen.getByRole('listbox', { name: 'Tools' });
    expect(listbox).toHaveAttribute('tabindex', '0');
    expect(screen.getAllByRole('option')).toHaveLength(12);
    expect(screen.getByText(/Enter to open/)).toBeInTheDocument();
    expect(listbox.getAttribute('aria-activedescendant')).toBeNull();
});

test('arrow keys move the selection and Enter opens the selected tool', () => {
    const onOpen = vi.fn();
    render(<FinderTools items={tools} onOpen={onOpen} />);
    const listbox = screen.getByRole('listbox', { name: 'Tools' });
    const options = screen.getAllByRole('option');

    fireEvent.keyDown(listbox, { key: 'ArrowRight' });
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(listbox).toHaveAttribute('aria-activedescendant', 'tool-opt-1');

    fireEvent.keyDown(listbox, { key: 'ArrowRight' });
    expect(options[1]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(listbox, { key: 'Enter' });
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ title: 'Tool 2' }));
});

test('first click selects, second click opens; Escape deselects', () => {
    const onOpen = vi.fn();
    render(<FinderTools items={tools} onOpen={onOpen} />);
    const options = screen.getAllByRole('option');

    fireEvent.click(options[3]);
    expect(options[3]).toHaveAttribute('aria-selected', 'true');
    expect(onOpen).not.toHaveBeenCalled();

    fireEvent.click(options[3]);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ title: 'Tool 4' }));

    fireEvent.click(options[3]); // re-selects after open (modal returned focus)
    fireEvent.keyDown(screen.getByRole('listbox', { name: 'Tools' }), { key: 'Escape' });
    expect(options[3]).toHaveAttribute('aria-selected', 'false');
});

test('tools always open the modal, even without an annotation', () => {
    const onOpen = vi.fn();
    const bare = [{ ...tools[0], annotation: null }];
    render(<FinderTools items={bare} onOpen={onOpen} />);

    const options = screen.getAllByRole('option');
    fireEvent.click(options[0]);
    fireEvent.click(options[0]);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ annotation: null }));
});
```

- [ ] **Step 2: Run to verify failure** → `npm test -- Components/__tests__/FinderTools.test.tsx` FAIL (module not found).

- [ ] **Step 3: Implement** — `resources/js/Pages/Collected/views/FinderTools.tsx`:

```tsx
import { useRef, useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { CoverImage } from '@/Components/collected/CoverImage';
import { TYPE_GLYPHS, type CollectedItem } from '@/collectedTypes';
import { isCoarsePointer } from '@/motion';

export type FinderToolsProps = {
    items: CollectedItem[];
    onOpen: (item: CollectedItem) => void;
};

export function FinderTools({ items, onOpen }: FinderToolsProps) {
    const listRef = useRef<HTMLDivElement>(null);
    const cellRefs = useRef<Array<HTMLDivElement | null>>([]);
    const pan = useRef({ active: false, x: 0, y: 0, sx: 0, sy: 0, moved: false });
    const [selected, setSelected] = useState<number | null>(null);

    const columnCount = (): number => {
        const el = listRef.current;
        if (!el) return 1;
        const columns = getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean);
        return Math.max(columns.length, 1);
    };

    const activate = (index: number) => {
        const item = items[index];
        if (item) onOpen(item);
    };

    const focusCell = (index: number) => {
        cellRefs.current[index]?.scrollIntoView({ block: 'nearest' });
        listRef.current?.focus();
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (items.length === 0) return;
        const columns = columnCount();

        if (selected === null) {
            if (['ArrowRight', 'ArrowDown'].includes(event.key)) {
                event.preventDefault();
                setSelected(0);
                focusCell(0);
            } else if (event.key === 'End') {
                event.preventDefault();
                setSelected(items.length - 1);
                focusCell(items.length - 1);
            } else if (event.key === 'Home') {
                event.preventDefault();
                setSelected(0);
                focusCell(0);
            }
            return;
        }

        let next = selected;
        switch (event.key) {
            case 'ArrowRight':
                next = Math.min(selected + 1, items.length - 1);
                break;
            case 'ArrowLeft':
                next = Math.max(selected - 1, 0);
                break;
            case 'ArrowDown':
                next = Math.min(selected + columns, items.length - 1);
                break;
            case 'ArrowUp':
                next = Math.max(selected - columns, 0);
                break;
            case 'Home':
                next = 0;
                break;
            case 'End':
                next = items.length - 1;
                break;
            case 'Enter':
event.preventDefault();
                activate(selected);
                return;
            case 'Escape':
                event.preventDefault();
                setSelected(null);
                return;
            default:
                return;
        }

        event.preventDefault();
        setSelected(next);
        focusCell(next);
    };

    const onCellClick = (index: number) => {
        if (pan.current.moved) {
            pan.current.moved = false;
            return;
        }
        if (isCoarsePointer()) {
            activate(index);
            return;
        }
        if (selected === index) {
            activate(index);
        } else {
            setSelected(index);
            listRef.current?.focus();
        }
    };

    const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.pointerType !== 'mouse') return;
        const el = listRef.current;
        if (!el) return;
        pan.current = { active: true, x: event.clientX, y: event.clientY, sx: el.scrollLeft, sy: el.scrollTop, moved: false };
    };

    const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const el = listRef.current;
        if (!pan.current.active || !el) return;
        const dx = event.clientX - pan.current.x;
        const dy = event.clientY - pan.current.y;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) pan.current.moved = true;
        el.scrollLeft = pan.current.sx - dx;
        el.scrollTop = pan.current.sy - dy;
    };

    const endPan = () => {
        pan.current.active = false;
    };

    return (
        <div>
            <div className="overflow-hidden rounded-lg border border-hairline bg-white">
                <div className="flex items-center gap-2 border-b border-hairline bg-surface px-3 py-2" aria-hidden="true">
                    <span className="h-3 w-3 rounded-full border border-hairline bg-white" />
                    <span className="h-3 w-3 rounded-full border border-hairline bg-white" />
                    <span className="h-3 w-3 rounded-full border border-hairline bg-white" />
                    <span className="ml-2 text-xs font-medium text-meta">Tools</span>
                    <span className="ml-auto flex items-center gap-2 text-meta">
                        <LayoutGrid className="h-3.5 w-3.5" />
                        <List className="h-3.5 w-3.5" />
                    </span>
                </div>

                <div
                    ref={listRef}
                    role="listbox"
                    aria-label="Tools"
                    aria-activedescendant={selected !== null && items[selected] ? `tool-opt-${items[selected].id}` : undefined}
                    tabIndex={0}
                    onKeyDown={onKeyDown}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endPan}
                    onPointerLeave={endPan}
                    className="max-h-[70vh] min-h-64 cursor-grab overflow-auto p-4 active:cursor-grabbing focus-visible:outline-2"
                >
                    <div
                        className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8"
                        onClick={(event) => {
                            if (event.target === event.currentTarget) setSelected(null);
                        }}
                    >
                        {items.map((item, index) => (
                            <div
                                key={item.id}
                                id={`tool-opt-${item.id}`}
                                role="option"
                                aria-selected={selected === index}
                                ref={(el) => {
                                    cellRefs.current[index] = el;
                                }}
                                onClick={() => onCellClick(index)}
                                className={`flex cursor-pointer select-none flex-col items-center gap-1.5 rounded-md border p-2 text-center transition ${
                                    selected === index ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-surface'
                                }`}
                            >
                                <CoverImage
                                    src={item.cover_image}
                                    title={item.title}
                                    kind="other"
                                    glyph={TYPE_GLYPHS[item.item_type]}
                                    glyphClassName="h-7 w-7 text-ink"
                                    className="h-14 w-14 rounded-xl"
                                />
                                <span className="w-full truncate text-xs text-ink">{item.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <p className="mt-2 text-xs text-meta">Click to select · Enter to open · Drag or arrow keys to move</p>
        </div>
    );
}
```

Registry: add `tool: FinderTools,` + import.

- [ ] **Step 4: Run to verify passes** → `npm test -- Components/__tests__/FinderTools.test.tsx` PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add resources/js/Pages/Collected/views/FinderTools.tsx resources/js/Pages/Collected/views/registry.ts resources/js/Components/__tests__/FinderTools.test.tsx
git commit -m "feat: finder style tools view with selection and swipe"
```

---

### Task 14: Website cards (`WebsiteCards`)

**Files:** Create `resources/js/Pages/Collected/views/WebsiteCards.tsx`; Test `resources/js/Components/__tests__/WebsiteCards.test.tsx`; Modify `views/registry.ts`.

**Interfaces:**
- Consumes: `ItemTitle`, `ItemTags`, `ViewProps`.
- Produces: `WebsiteCards({ items, onOpen })`; registry entry `website: WebsiteCards`.

- [ ] **Step 1: Failing test** — `resources/js/Components/__tests__/WebsiteCards.test.tsx`:

```tsx
import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WebsiteCards } from '@/Pages/Collected/views/WebsiteCards';
import { makeItem } from './collectedFixtures';

const sites = [
    makeItem({ id: 1, title: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/', item_type: 'website', creator: 'Mozilla' }),
    makeItem({ id: 2, title: 'Annotated Site', url: 'https://www.example.com/path', item_type: 'website', annotation: 'Great reference.' }),
];

test('frames each site in a browser card with the bare hostname', () => {
    render(<WebsiteCards items={sites} onOpen={() => {}} />);
    expect(screen.getByText('developer.mozilla.org')).toBeInTheDocument();
    expect(screen.getByText('example.com')).toBeInTheDocument(); // www stripped
    expect(screen.getByText('Great reference.')).toBeInTheDocument();
});

test('annotated sites open the modal, plain sites link out', () => {
    const onOpen = vi.fn();
    render(<WebsiteCards items={sites} onOpen={onOpen} />);

    fireEvent.click(screen.getByRole('button', { name: 'Annotated Site' }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));

    const link = screen.getByRole('link', { name: /MDN Web Docs/ });
    expect(link).toHaveAttribute('href', 'https://developer.mozilla.org/en-US/');
    expect(link).toHaveAttribute('target', '_blank');
});
```

- [ ] **Step 2: Run to verify failure** → FAIL (module not found).

- [ ] **Step 3: Implement** — `resources/js/Pages/Collected/views/WebsiteCards.tsx`:

```tsx
import { ItemTags } from '@/Components/collected/ItemTags';
import { ItemTitle } from '@/Components/collected/ItemTitle';
import type { CollectedItem } from '@/collectedTypes';

export type WebsiteCardsProps = {
    items: CollectedItem[];
    onOpen: (item: CollectedItem) => void;
};

function hostname(url: string | null): string {
    if (!url) return 'link';
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return 'link';
    }
}

export function WebsiteCards({ items, onOpen }: WebsiteCardsProps) {
    return (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
                <li key={item.id} className="h-full animate-row-in">
                    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-hairline bg-white transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                        <div className="flex items-center gap-2 border-b border-hairline bg-surface px-3 py-2" aria-hidden="true">
                            <span className="h-2.5 w-2.5 rounded-full border border-hairline bg-white" />
                            <span className="h-2.5 w-2.5 rounded-full border border-hairline bg-white" />
                            <span className="h-2.5 w-2.5 rounded-full border border-hairline bg-white" />
                            <span className="ml-1 truncate text-xs text-meta">{hostname(item.url)}</span>
                        </div>
                        <div className="flex flex-1 flex-col gap-2 p-4">
                            <ItemTitle
                                item={item}
                                onOpen={onOpen}
                                className="block font-serif text-lg font-semibold leading-snug text-ink"
                            />
                            {item.creator && <p className="text-sm text-meta">{item.creator}</p>}
                            {item.annotation && <p className="line-clamp-3 text-sm text-ink">{item.annotation}</p>}
                            <div className="mt-auto pt-1">
                                <ItemTags item={item} />
                            </div>
                        </div>
                    </article>
                </li>
            ))}
        </ul>
    );
}
```

Registry: add `website: WebsiteCards,` + import.

- [ ] **Step 4: Run to verify passes + full JS suite**

Run: `npm test -- Components/__tests__/WebsiteCards.test.tsx` → PASS (2 tests).
Run: `npm test` → PASS (all suites).
Run: `npm run build` → succeeds.

- [ ] **Step 5: Commit**

```bash
git add resources/js/Pages/Collected/views/WebsiteCards.tsx resources/js/Pages/Collected/views/registry.ts resources/js/Components/__tests__/WebsiteCards.test.tsx
git commit -m "feat: browser card view for collected websites"
```

---

### Task 15: Cover images in demo seed data

**Files:** Modify `database/seeders/DemoContentSeeder.php`.

**Interfaces:**
- Consumes: `cover_image` column (Task 2).
- Produces: four demo items with real cover URLs so local/QA browsers render covers without running `import:cover`.

- [ ] **Step 1: Add cover URLs** — locate four existing `CollectedItem::create([...])` entries in `DemoContentSeeder` (one `book`, one `music`, one `video`, one `website`) and add a `cover_image` value using picsum (works offline-free in QA, stable seeds):

```php
'cover_image' => 'https://picsum.photos/seed/timadey-book-1/640/960',
```

Seed values: `book → /seed/timadey-book-1/640/960`, `music → /seed/timadey-music-1/640/640`, `video → /seed/timadey-video-1/1280/720`, `website → /seed/timadey-site-1/1200/630`. Leave the other demo items with `cover_image => null` so placeholder fallbacks stay visible.

- [ ] **Step 2: Verify**

Run: `php artisan migrate:fresh --seed` (local dev DB only — confirm with user first if shared) then:

```bash
php artisan tinker --execute="dump(\App\Models\CollectedItem::whereNotNull('cover_image')->count());"
```

→ `4`.

- [ ] **Step 3: Commit**

```bash
git add database/seeders/DemoContentSeeder.php
git commit -m "chore: add demo cover images to seeder"
```

---

### Task 16: End-to-end verification (all suites)

**Files:** none new; may fix regressions surfaced in earlier files.

- [ ] **Step 1: Full backend suite**

Run: `php artisan test` → all PASS. If `CollectedShowTest` or rewritten `CollectedPublicTest` fail, fix implementation (never weaken assertions unless the spec decision changed).

- [ ] **Step 2: Full JS unit suite**

Run: `npm test` → all PASS.

- [ ] **Step 3: Type-check + production build**

Run: `npx tsc --noEmit` (if configured in `npm run build`, the build alone suffices) then `npm run build` → succeeds, no TS errors.

- [ ] **Step 4: Lint**

Run: `npm run lint` (if script exists) → no new errors in touched files.

- [ ] **Step 5: Playwright E2E** — create `e2e/collected-drawer.spec.ts` (full spec below) before running:

```ts
import { test, expect } from '@playwright/test';

test.describe('collected app drawer', () => {
    test('drawer tiles deep-link into category pages', async ({ page }) => {
        await page.goto('/collected');
        await expect(page.getByRole('heading', { level: 1, name: 'Collected' })).toBeVisible();

        const booksTile = page.getByRole('link', { name: /Books/ });
        await booksTile.click();
        await expect(page).toHaveURL('/collected/books');
        await expect(page.getByRole('heading', { level: 1, name: 'Books' })).toBeVisible();
    });

    test('back link returns to the drawer', async ({ page }) => {
        await page.goto('/collected/books');
        await page.getByRole('link', { name: 'Back to Collected' }).click();
        await expect(page).toHaveURL('/collected');
    });

    test('annotated item opens the detail modal with backdrop blur', async ({ page }) => {
        await page.goto('/collected');
        const tile = page.getByRole('link', { name: /Thinking in Systems/ }).first();
        await tile.click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await expect(page.locator('.backdrop-blur-md')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible();
    });

    test('category tags filter the list', async ({ page }) => {
        await page.goto('/collected/books');
        await page.getByRole('link', { name: 'Systems' }).click();
        await expect(page).toHaveURL('/collected/books?tag=systems');
    });

    test('unknown category returns 404', async ({ page }) => {
        await page.goto('/collected/nope');
        await expect(page.locator('h1')).toContainText(/not found|404/i);
    });

    test('spotlight search filters the drawer only', async ({ page }) => {
        await page.goto('/collected');
        await page.getByPlaceholder('Search collection').fill('hit');
        await expect(page.getByText('1 results for')).toBeVisible();
    });
});
```

Adjust result-count assertion to match actual seeded data after running (inspect `items.total` for query `hit`), keeping the assertion intent: filtered count > 0 and category sections reflect the filter.

Run: `npm run test:e2e` → all PASS.

- [ ] **Step 6: Visual sanity (manual, reduced motion included)**

Start dev server; visit `/collected` and each category. Toggle OS "Reduce motion" and re-check no transforms stuck mid-flight (launch animation skipped via `prefers-reduced-motion`). Confirm tiles are monochrome, video scrim readable, modal blurs backdrop, `?tag=` empty renders EmptyState.

- [ ] **Step 7: Final commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix: collected drawer e2e and polish fixes"
```

---

## Self-review findings (resolved during writing)

1. **Task 9 launch-class reads `--launch-x` during render** — on SSR-less Vite CSR this is safe (client-only), but the check runs on every render; it is guarded by `typeof document !== 'undefined'` and only reads a style property (cheap). OK.
2. **VideoGrid duplicate titles** (overlay + ItemTitle) — tests use `getAllByText`; noted in task.
3. **FinderTools ARIA** — switched `role="grid"` → `role="listbox"/"option"` (valid ARIA for selection + `aria-activedescendant`); spec deviation documented in Task 13.
4. **Tag component `active` prop** — verified: `resources/js/Components/Tag.tsx:3` accepts `{ label, href?, active? }` and active renders `border-primary bg-primary text-white` when `href` is set, matching Task 9's test assertion. No adaptation needed.
5. **Task 15 DB note** — `migrate:fresh --seed` warns in QA instructions; executor must not run destructive migrations against anything but local dev.

