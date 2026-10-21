# Notes Feed Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the public notes list as a feed (no headlines, no dividers) with inline expand at 280 chars — replacing PostRow with a new NoteFeedItem component.

**Architecture:** `NoteController::index` adds `body_html` (rendered markdown) to each note's payload. New `NoteFeedItem` component renders meta line + teaser + "read more" button that swaps in the full `<Prose>` body on click. `Notes/Index.tsx` swaps `PostRow` for `NoteFeedItem`. Permalinks, search, filter, pagination, admin, API all untouched.

**Tech Stack:** React 19 + Inertia, Tiptap (unchanged), vitest + @testing-library/react (jsdom, Range polyfill in `resources/js/setupTests.ts`), Pest, Playwright.

## Global Constraints

- TDD: every task writes the failing test FIRST and watches it fail for the feature-missing reason before implementing.
- Tests live only under `resources/js/Components/__tests__/` — `app.tsx`/`ssr.tsx` glob `./Pages/**/*.tsx` into the production bundle; a test under `Pages/` would ship.
- Teaser stays 280 chars (`streamTeaser(280)` default — no server truncation change).
- Permalinks (`/notes/{slug}`) stay untouched.
- `PostRow` component stays (Writing still uses it).
- Out of scope: admin notes, QuickComposer, API, RSS, sitemap, nav entry.
- Never kill user's dev stack (port 8000).
- Kill stray QA servers before playwright: `lsof -iTCP:8892 -sTCP:LISTEN -t | xargs -r kill -9`.

---

### Task 0: Commit spec and plan (docs)

**Files:**
- Create (already written): `docs/superpowers/specs/2026-10-20-notes-feed-redesign-design.md`
- Create (this file): `docs/superpowers/plans/2026-10-20-notes-feed-redesign.md`

- [ ] **Step 1: Commit docs**

```bash
git add docs/superpowers/specs/2026-10-20-notes-feed-redesign-design.md docs/superpowers/plans/2026-10-20-notes-feed-redesign.md
git commit -m "docs: design and plan for notes feed redesign"
```

Expected: `[phase-1 <sha>] docs: design and plan for notes feed redesign`

---

### Task 1: Add body_html to note index payload

**Files:**
- Modify: `app/Http/Controllers/NoteController.php:12-37` (index method)
- Test: `tests/Feature/NoteSnippetTest.php`

**Interfaces:**
- Consumes: `App\Services\MarkdownService::render(string $markdown): string` (already used by `show()`).
- Produces: each note in `notes.data` now includes `body_html` (rendered markdown string) alongside existing `slug`, `headline`, `teaser`, `date`, `tags`.

- [ ] **Step 1: Write the failing test** — update the existing `exposes headline and teaser in the notes stream payload` test in `tests/Feature/NoteSnippetTest.php` to also assert `body_html` is present:

Replace lines 49-72 with:

```php
it('exposes headline, teaser, and body_html in the notes stream payload', function () {
    $long = 'Why does there seem to be such an intense, adversarial divide between genders today? '
        .'Living in the West, it often feels as though both men and women are intent on mutual destruction rather than finding common ground. '
        .str_repeat('More observations to push this past the teaser limit. ', 8);
    makeTitlelessNote(['body' => $long, 'slug' => 'long-note']);

    $this->get('/notes')->assertInertia(fn ($page) => $page
        ->component('Notes/Index')
        ->where('notes.data.0', function ($note) {
            if (! isset($note['headline'], $note['teaser'], $note['body_html'])) {
                return false;
            }
            $base = rtrim($note['headline'], '…');

            return str_ends_with($note['headline'], '…')
                && mb_strlen($note['headline']) <= 91
                && str_starts_with($note['headline'], 'Why does there seem')
                && $note['teaser'] !== ''
                && mb_strlen($note['teaser']) <= 281
                && ! str_starts_with($note['teaser'], $base)
                && $note['body_html'] !== ''
                && str_contains($note['body_html'], '<p>');
        })
        ->missing('notes.data.0.excerpt_text'));
});
```

- [ ] **Step 2: Run test to verify it fails for the right reason**

Run: `./vendor/bin/pest --filter=exposes`
Expected: FAIL — `body_html` is missing from the payload (the `isset` check returns false, or the `where` closure fails).

- [ ] **Step 3: Write the implementation** — update `NoteController::index`:

```php
public function index(Request $request, MarkdownService $markdown): Response
{
    $query = Post::publiclyVisible()->ofType('note')->with('tags')->latest('published_at');

    if ($q = $request->query('q')) {
        $needle = '%'.mb_strtolower($q).'%';
        $query->where(fn ($w) => $w
            ->whereRaw('LOWER(title) LIKE ?', [$needle])
            ->orWhereRaw('LOWER(body) LIKE ?', [$needle]));
    }
    if ($tag = $request->query('tag')) {
        $query->whereHas('tags', fn ($t) => $t->where('slug', $tag));
    }

    return Inertia::render('Notes/Index', [
        'notes' => $query->paginate(15)->withQueryString()->through(fn ($p) => [
            'slug' => $p->slug,
            'headline' => $p->streamHeadline(),
            'teaser' => $p->streamTeaser(),
            'body_html' => $markdown->render((string) $p->body),
            'date' => $p->published_at?->format('M j, Y'),
            'tags' => $p->tags->pluck('name'),
        ]),
        'tags' => Tag::whereHas('posts', fn ($q2) => $q2->where('post_type', 'note'))
            ->orderBy('name')->get(['name', 'slug']),
        'filters' => $request->only(['q', 'tag']),
    ]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `./vendor/bin/pest --filter=exposes`
Expected: PASS

- [ ] **Step 5: Run full Pest suite**

Run: `./vendor/bin/pest`
Expected: 200 PASS (or more if test count changed — the renamed test still counts as 1).

- [ ] **Step 6: Commit**

```bash
git add app/Http/Controllers/NoteController.php tests/Feature/NoteSnippetTest.php
git commit -m "feat: include rendered body_html in notes index payload"
```

---

### Task 2: NoteFeedItem component

**Files:**
- Create: `resources/js/Components/NoteFeedItem.tsx`
- Test: `resources/js/Components/__tests__/NoteFeedItem.test.tsx`

**Interfaces:**
- Consumes: `MetaLine` (`{ date?: string; items?: string[] }` — `type`/`readingTime` omitted), `Prose` (`{ html: string; className?: string }`).
- Produces: `<NoteFeedItem teaser bodyHtml date tags />` — renders `<article>` with meta line, teaser + "read more" button (or full `<Prose>` when expanded).

- [ ] **Step 1: Write the failing test** — create `resources/js/Components/__tests__/NoteFeedItem.test.tsx`:

```tsx
import { test, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NoteFeedItem } from '../NoteFeedItem';

const TEASER = 'A short teaser for the note.';
const BODY_HTML = '<p>A short teaser for the note. And some more text that was cut off.</p>';

test('renders teaser with a read more button', () => {
    render(<NoteFeedItem teaser={TEASER} bodyHtml={BODY_HTML} date="Oct 20, 2026" tags={['writing']} />);

    expect(screen.getByText(TEASER)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'read more' })).toBeInTheDocument();
});

test('clicking read more expands the full body and hides the button', () => {
    render(<NoteFeedItem teaser={TEASER} bodyHtml={BODY_HTML} date="Oct 20, 2026" tags={['writing']} />);

    fireEvent.click(screen.getByRole('button', { name: 'read more' }));

    expect(screen.getByText('And some more text that was cut off.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'read more' })).not.toBeInTheDocument();
});

test('renders date and tags in the meta line', () => {
    render(<NoteFeedItem teaser={TEASER} bodyHtml={BODY_HTML} date="Oct 20, 2026" tags={['writing', 'life']} />);

    expect(screen.getByText(/Oct 20, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/writing/)).toBeInTheDocument();
    expect(screen.getByText(/life/)).toBeInTheDocument();
});

test('short notes without a teaser boundary still render read more when teaser is provided', () => {
    render(<NoteFeedItem teaser="Tiny note." bodyHtml="<p>Tiny note.</p>" date={null} tags={[]} />);

    expect(screen.getByText('Tiny note.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'read more' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails for the right reason**

Run: `npm test -- NoteFeedItem`
Expected: FAIL — `Cannot find module '../NoteFeedItem'` (component doesn't exist).

- [ ] **Step 3: Write the implementation** — create `resources/js/Components/NoteFeedItem.tsx`:

```tsx
import { useState } from 'react';
import { MetaLine } from '@/Components/MetaLine';
import { Prose } from '@/Components/Prose';

export function NoteFeedItem({
    teaser,
    bodyHtml,
    date,
    tags,
}: {
    teaser: string;
    bodyHtml: string;
    date: string | null;
    tags: string[];
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <article className="py-6">
            <MetaLine date={date ?? undefined} items={tags} />
            {expanded ? (
                <div className="mt-2">
                    <Prose html={bodyHtml} />
                </div>
            ) : (
                <p className="mt-2 text-[15px] leading-relaxed text-ink">
                    {teaser}{' '}
                    <button
                        type="button"
                        onClick={() => setExpanded(true)}
                        className="text-link hover:underline"
                    >
                        read more
                    </button>
                </p>
            )}
        </article>
    );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- NoteFeedItem`
Expected: 4 PASS.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add resources/js/Components/NoteFeedItem.tsx resources/js/Components/__tests__/NoteFeedItem.test.tsx
git commit -m "feat: add NoteFeedItem component with inline read more expansion"
```

---

### Task 3: Swap PostRow for NoteFeedItem in Notes/Index

**Files:**
- Modify: `resources/js/Pages/Notes/Index.tsx` (type on line 11, imports lines 8-9, loop lines 66-84)

**Interfaces:**
- Consumes: `NoteFeedItem` from Task 2 (`{ teaser, bodyHtml, date, tags }`), `body_html` field from Task 1 payload.
- Produces: Notes index page renders feed-style items instead of PostRow.

- [ ] **Step 1: Update the type and imports** — replace lines 1-11 of `Notes/Index.tsx`:

```tsx
import PublicLayout from '@/Layouts/PublicLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { SearchInput } from '@/Components/SearchInput';
import { FilterBar } from '@/Components/FilterBar';
import { Pagination } from '@/Components/Pagination';
import { EmptyState } from '@/Components/EmptyState';
import { NoteFeedItem } from '@/Components/NoteFeedItem';

type NoteRow = { slug: string; teaser: string; body_html: string; date: string | null; tags: string[] };
```

(Remove `MetaLine` and `PostRow` imports — no longer used. Remove `headline` from `NoteRow` type — no longer rendered in the feed.)

- [ ] **Step 2: Replace the PostRow loop** — replace lines 66-84:

```tsx
<div className="mt-10">
    {notes.data.map((note) => (
        <NoteFeedItem
            key={note.slug}
            teaser={note.teaser}
            bodyHtml={note.body_html}
            date={note.date}
            tags={note.tags}
        />
    ))}
    {notes.data.length === 0 && (
        <div className="py-8">
            <EmptyState
                title="Couldn’t find anything"
                hint="I haven’t written a note matching that — try a different word or tag."
            />
        </div>
    )}
</div>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: clean (no `PostRow` or `MetaLine` references remain).

- [ ] **Step 4: Run full vitest**

Run: `npm test`
Expected: 48 PASS (44 existing + 4 new NoteFeedItem tests). No existing tests break because no vitest test imports `Notes/Index` directly.

- [ ] **Step 5: Commit**

```bash
git add resources/js/Pages/Notes/Index.tsx
git commit -m "feat: render notes as feed with NoteFeedItem instead of PostRow"
```

---

### Task 4: Update e2e tests for inline expand

**Files:**
- Modify: `e2e/quick-note.spec.ts:27-34` (test 1 click-through → inline expand)

**Interfaces:**
- Consumes: `NoteFeedItem` rendered on `/notes` — "read more" button visible on long notes, `<article>` still the row element.
- Produces: e2e test 1 asserts inline expand instead of permalink navigation. `public-render.spec.ts` `note detail renders at 1440px` still covers the permalink (unchanged).

- [ ] **Step 1: Update quick-note.spec.ts test 1** — replace lines 27-34:

```ts
    await page.goto('/notes');
    const row = page.locator('main article').filter({ hasText: `Drawer note ${stamp}` });
    await expect(row).toBeVisible();
    await shot(page, 'notes-stream-truncated');

    await row.getByRole('button', { name: 'read more' }).click();
    await expect(row.getByText('More than two hundred eighty characters so the stream truncates it.')).toBeVisible();
```

- [ ] **Step 2: Run the updated e2e test**

```bash
lsof -iTCP:8892 -sTCP:LISTEN -t | xargs -r kill -9
npx playwright test e2e/quick-note.spec.ts
```

Expected: 3 PASS (test 1 now uses inline expand; tests 2-3 unchanged).

- [ ] **Step 3: Run full playwright suite**

```bash
lsof -iTCP:8892 -sTCP:LISTEN -t | xargs -r kill -9
npx playwright test
```

Expected: 52 PASS. Risks: `search-filter.spec.ts` notes tag filter uses `main article` locator — NoteFeedItem still renders `<article>` so this passes unchanged. `public-render.spec.ts` note detail test still covers permalink.

- [ ] **Step 4: Commit**

```bash
git add e2e/quick-note.spec.ts
git commit -m "test: update quick-note e2e to use inline expand instead of permalink click"
```

---

### Task 5: Full verification gates

**Files:** none modified (verification only).

- [ ] **Step 1: Full vitest**

Run: `npm test`
Expected: 48 PASS (44 existing + 4 NoteFeedItem).

- [ ] **Step 2: Type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean tsc; vite build completes.

- [ ] **Step 3: Pest**

Run: `./vendor/bin/pest`
Expected: 200 PASS.

- [ ] **Step 4: Playwright**

```bash
lsof -iTCP:8892 -sTCP:LISTEN -t | xargs -r kill -9
npx playwright test
```

Expected: 52 PASS.

- [ ] **Step 5: Report** — summarize commits + gate counts.
