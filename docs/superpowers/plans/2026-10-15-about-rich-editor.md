# About Rich-Text Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the multi-section markdown About admin with a single rich-text body stored in the `about_body` setting, rendered on the public `/about` page.

**Architecture:** One `settings` row (`about_body`, sanitized HTML) replaces the `about_sections` table. The public controller passes `body_html` from that setting; the admin page reuses the shared Tiptap `RichEditor` with `StoreAboutRequest` running the existing `HtmlSanitizer`. A final task drops the table, model, and seeder block.

**Tech Stack:** Laravel 12 / PHP 8.4, Inertia React, Tiptap `RichEditor` (already shipped), Pest, Vitest + Testing Library.

## Global Constraints

- PHP 8.4, Laravel 12, Node 22, native PostgreSQL (never Docker unless asked). No new npm or PHP dependencies.
- TDD hard rule: every task writes the failing test first, watches it fail for a **feature-missing** reason, then implements, then watches it pass.
- Gates before the feature is "done": `./vendor/bin/pest` green, `npm test` green, `npx tsc --noEmit` clean, `npm run build` succeeds, `npx playwright test` green (full suite).
- Never delete or clobber `public/hot` (user's dev stack runs on port 8000).
- QA e2e env: kill stray servers first (`lsof -iTCP:8892 -sTCP:LISTEN -t | xargs -r kill -9`), then `DB_DATABASE=timadey_qa_browser php artisan migrate --force` before Playwright; playwright.config.ts manages the `php artisan serve` on 8892 with `VITE_HOT_FILE=public/hot-e2e`.
- Run new migrations on dev (`php artisan migrate --force`) and QA as part of Task 4.
- Storage contract: HTML only for `about_body`; markdown notes (`post_type = note`) untouched everywhere.
- Existing selectors that must keep working: e2e crawl `/admin/about` requires `main input, textarea, select` count > 0 (the editor's "Text style" `select` satisfies it); public `/about` must render `h1` "About".

---

## File Structure

| File | Change | Responsibility |
|------|--------|----------------|
| `tests/Feature/AboutNowTest.php` | Modify | Public `/about` contract: `body_html` from setting + empty state |
| `app/Http/Controllers/AboutController.php` | Modify | Read `about_body` setting, drop `MarkdownService`/`AboutSection` |
| `resources/js/Pages/About.tsx` | Modify | Single `<Prose html={body_html}>` or empty state |
| `tests/Feature/AdminSiteContentTest.php` | Modify | Admin PUT stores setting; unsafe markup → 422 `errors.body` |
| `app/Http/Requests/StoreAboutRequest.php` | Create | Validate + sanitize `body` |
| `app/Http/Controllers/Admin/AboutController.php` | Modify | `edit` reads setting, `update(StoreAboutRequest)` writes it |
| `resources/js/Pages/Admin/About.tsx` | Modify | Single RichEditor form (Projects pattern) |
| `resources/js/Pages/Admin/__tests__/About.test.tsx` | Create | Page wiring: editor + stored body + Save |
| `tests/Feature/SeedersTest.php` | Modify | Seeding covers Now only; `about_sections` gone |
| `database/migrations/2026_10_15_000004_drop_about_sections.php` | Create | Drop `about_sections` (down recreates schema) |
| `database/seeders/DemoContentSeeder.php` | Modify | Remove About block + `AboutSection` import |
| `app/Models/AboutSection.php` | Delete | Model no longer exists |

---

### Task 1: Public `/about` renders `body_html` from the setting

**Files:**
- Modify: `tests/Feature/AboutNowTest.php`
- Modify: `app/Http/Controllers/AboutController.php`
- Modify: `resources/js/Pages/About.tsx`

**Interfaces:**
- Consumes: `Setting::get(string $key, ?string $default = null): ?string` (`app/Models/Setting.php`), `Setting::set(string $key, ?string $value): void`.
- Produces: Inertia prop `body_html: string` on the `About` page (Task 2 does not consume this; the admin page uses prop `body: string` instead).

- [ ] **Step 1: Rewrite the about section of AboutNowTest (failing tests)**

Replace the first test and the import line; add the empty-state test. The file's other three tests (social links, now page ×2) stay exactly as they are.

```php
<?php

use App\Models\{NowSection, Setting, SocialLink};

it('renders the stored about body html', function () {
    Setting::set('about_body', '<p>Hello <strong>world</strong></p>');

    $this->get('/about')->assertOk()
        ->assertInertia(fn ($p) => $p->component('About')
            ->where('body_html', '<p>Hello <strong>world</strong></p>'));
});

it('shows empty state when about body is missing', function () {
    $this->get('/about')->assertOk()
        ->assertInertia(fn ($p) => $p->component('About')->where('body_html', ''));
});
```

(The rest of the file — `it('shows social links on about'…)`, `it('shows now page with last-updated timestamp'…)`, `it('hides empty now sections'…)` — remains untouched.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `./vendor/bin/pest tests/Feature/AboutNowTest.php`
Expected: 2 FAIL — `body_html` missing (`sections` prop still passed instead); remaining tests PASS. This is the feature-missing failure.

- [ ] **Step 3: Implement the public controller**

Full replacement for `app/Http/Controllers/AboutController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\{Setting, SocialLink};
use Inertia\{Inertia, Response};

class AboutController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('About', [
            'body_html' => (string) Setting::get('about_body'),
            'social_links' => SocialLink::where('visible', true)->orderBy('sort_order')
                ->get(['platform', 'url', 'label']),
            'contact_email' => Setting::get('contact_email'),
        ]);
    }
}
```

- [ ] **Step 4: Implement the public page**

In `resources/js/Pages/About.tsx`: delete the `Section` type, change the props type to `{ body_html: string; social_links: SocialLink[]; contact_email: string | null }`, and replace the entire `<div className="mt-8 space-y-10">…</div>` block (sections map + empty check) with:

```tsx
<div className="mt-8 space-y-10">
    {body_html ? <Prose html={body_html} /> : <p className="text-meta">Nothing here yet.</p>}
</div>
```

Everything else on the page (Head meta, h1, contact/social section) stays identical.

- [ ] **Step 5: Run tests to verify they pass**

Run: `./vendor/bin/pest tests/Feature/AboutNowTest.php`
Expected: all PASS.

- [ ] **Step 6: Type-check the frontend**

Run: `npx tsc --noEmit`
Expected: no output (clean).

- [ ] **Step 7: Commit**

```bash
git add tests/Feature/AboutNowTest.php app/Http/Controllers/AboutController.php resources/js/Pages/About.tsx
git commit -m "feat: render public about page from about_body setting"
```

---

### Task 2: Admin stores sanitized `about_body` via RichEditor

**Files:**
- Modify: `tests/Feature/AdminSiteContentTest.php`
- Create: `resources/js/Pages/Admin/__tests__/About.test.tsx`
- Create: `app/Http/Requests/StoreAboutRequest.php`
- Modify: `app/Http/Controllers/Admin/AboutController.php`
- Modify: `resources/js/Pages/Admin/About.tsx`

**Interfaces:**
- Consumes: `App\Support\HtmlSanitizer::sanitize(string $html, string $field = 'body'): string` (throws `ValidationException` keyed by `$field` on disallowed markup), `RichEditor` props `{ value: string; onChange: (html: string) => void }`, `Setting::set`.
- Produces: `PUT /admin/about` accepts `body` (nullable HTML string ≤ 500000) and stores it at `about_body`; admin Inertia prop `body: string` on `Admin/About`.

- [ ] **Step 1: Rewrite the admin about test (failing tests)**

In `tests/Feature/AdminSiteContentTest.php`: change line 3 to drop `AboutSection` from the import —

```php
use App\Models\{CollectedItem, NowSection, Post, Project, Setting, SocialLink, Tag, User};
```

— and replace the whole `it('updates about sections', …)` test with:

```php
it('updates the about body', function () {
    $this->actingAs($this->owner)->put('/admin/about', [
        'body' => '<p>New <strong>intro</strong></p>',
    ])->assertRedirect();

    expect(Setting::get('about_body'))->toBe('<p>New <strong>intro</strong></p>');
});

it('rejects unsafe about markup', function () {
    $this->actingAs($this->owner)->put('/admin/about', [
        'body' => '<p>ok</p><script>alert(1)</script><img src="https://evil.test/x.png">',
    ])->assertSessionHasErrors('body');
});
```

- [ ] **Step 2: Run the Pest tests to verify they fail**

Run: `./vendor/bin/pest tests/Feature/AdminSiteContentTest.php`
Expected: `updates the about body` FAIL (controller ignores `body`, so `Setting::get('about_body')` is `null`); `rejects unsafe about markup` FAIL (no `body` validation error). Feature-missing failures.

- [ ] **Step 3: Write the failing Vitest page test**

Create `resources/js/Pages/Admin/__tests__/About.test.tsx`:

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
    }),
}));
vi.mock('@/Layouts/AdminLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/Components/Flash', () => ({ Flash: () => null }));

import About from '../About';

test('renders the rich editor with the stored body and a save button', async () => {
    render(<About body="<p>Stored intro</p>" />);

    expect(await screen.findByLabelText('Text style')).toBeInTheDocument();
    expect(await screen.findByText('Stored intro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
});
```

- [ ] **Step 4: Run the Vitest test to verify it fails**

Run: `npm test -- resources/js/Pages/Admin/__tests__/About.test.tsx`
Expected: FAIL — current `Admin/About` takes `sections`, renders no "Text style" control (timeout on `findByLabelText`).

- [ ] **Step 5: Create the form request**

Create `app/Http/Requests/StoreAboutRequest.php`:

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAboutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isOwner() ?? false;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('body'))) {
            $this->merge([
                'body' => \App\Support\HtmlSanitizer::sanitize($this->input('body')),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'body' => ['nullable', 'string', 'max:500000'],
        ];
    }
}
```

- [ ] **Step 6: Rewrite the admin controller**

Full replacement for `app/Http/Controllers/Admin/AboutController.php`:

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAboutRequest;
use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Inertia\{Inertia, Response};

class AboutController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('Admin/About', [
            'body' => (string) Setting::get('about_body'),
        ]);
    }

    public function update(StoreAboutRequest $request): RedirectResponse
    {
        Setting::set('about_body', (string) $request->validated('body'));

        return redirect()->route('admin.about.edit')->with('status', 'About page updated.');
    }
}
```

(The route `PUT admin/about` in `routes/web.php:59` is unchanged — Laravel resolves the FormRequest from the controller signature.)

- [ ] **Step 7: Rewrite the admin page**

Full replacement for `resources/js/Pages/Admin/About.tsx`:

```tsx
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm } from '@inertiajs/react';
import { Button } from '@/Components/Button';
import { Flash } from '@/Components/Flash';
import { RichEditor } from '@/Components/RichEditor';

export default function About({ body }: { body: string }) {
    const { data, setData, put, processing, errors } = useForm<{ body: string }>({ body });

    const save = (e: React.FormEvent) => {
        e.preventDefault();
        put('/admin/about', { preserveScroll: true });
    };

    return (
        <AdminLayout title="About page">
            <Flash />
            <form onSubmit={save} className="space-y-4">
                <div>
                    <span className="text-sm font-medium">About</span>
                    <div className="mt-1">
                        <RichEditor value={data.body} onChange={(html) => setData('body', html)} />
                    </div>
                    {errors.body && <p className="mt-1 text-sm text-red-700">{errors.body}</p>}
                </div>

                <Button type="submit" disabled={processing}>
                    {processing ? 'Saving…' : 'Save about page'}
                </Button>
            </form>
        </AdminLayout>
    );
}
```

- [ ] **Step 8: Run both test suites to verify they pass**

Run: `./vendor/bin/pest tests/Feature/AdminSiteContentTest.php`
Expected: all PASS (sanitizer 422 → `errors.body` on the script/foreign-image payload).

Run: `npm test -- resources/js/Pages/Admin/__tests__/About.test.tsx`
Expected: PASS.

- [ ] **Step 9: Type-check the frontend**

Run: `npx tsc --noEmit`
Expected: no output (clean).

- [ ] **Step 10: Commit**

```bash
git add app/Http/Requests/StoreAboutRequest.php app/Http/Controllers/Admin/AboutController.php \
  resources/js/Pages/Admin/About.tsx resources/js/Pages/Admin/__tests__/About.test.tsx \
  tests/Feature/AdminSiteContentTest.php
git commit -m "feat: single rich-text about editor in admin"
```

---

### Task 3: Drop `about_sections` (migration, model, seeder)

**Files:**
- Modify: `tests/Feature/SeedersTest.php`
- Create: `database/migrations/2026_10_15_000004_drop_about_sections.php`
- Modify: `database/seeders/DemoContentSeeder.php`
- Delete: `app/Models/AboutSection.php`

**Interfaces:**
- Consumes: table shape from `2026_10_13_000002_create_site_tables.php` (for `down()`), `DemoContentSeeder` line 5 import + the `$aboutSections` block after the Now sections loop.
- Produces: no `about_sections` table and no `AboutSection` model anywhere; seeding still creates ≥ 8 `NowSection`s. After this task `grep -rn "AboutSection\|about_sections" app tests database resources e2e` must return nothing outside `database/migrations/2026_10_13_000002_create_site_tables.php` and the new migration.

- [ ] **Step 1: Rewrite the seeder test (failing test)**

In `tests/Feature/SeedersTest.php`, replace `it('seeds default now and about sections', …)` with:

```php
it('seeds default now sections and no about content', function () {
    $this->seed(\Database\Seeders\DemoContentSeeder::class);

    expect(\App\Models\NowSection::count())->toBeGreaterThanOrEqual(8)
        ->and(\Schema::hasTable('about_sections'))->toBeFalse();
});
```

(The other two seeder tests stay untouched.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `./vendor/bin/pest tests/Feature/SeedersTest.php`
Expected: FAIL — `about_sections` table still exists (assertion `toBeFalse()` gets `true`).

- [ ] **Step 3: Create the drop migration**

Create `database/migrations/2026_10_15_000004_drop_about_sections.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('about_sections');
    }

    public function down(): void
    {
        Schema::create('about_sections', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('title');
            $table->text('body')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('visible')->default(true);
            $table->timestamps();
        });
    }
};
```

- [ ] **Step 4: Remove the seeder block and import**

In `database/seeders/DemoContentSeeder.php`:

1. Line 5: remove `AboutSection, ` from `use App\Models\{…};`.
2. Delete the entire `$aboutSections = [ … ];` array and its `foreach ($aboutSections as $i => $s) { … }` loop (the block between the Now sections loop and `SocialLink::updateOrCreate(`).

- [ ] **Step 5: Delete the model**

```bash
git rm app/Models/AboutSection.php
```

- [ ] **Step 6: Run the seeder test, then verify no references remain**

Run: `./vendor/bin/pest tests/Feature/SeedersTest.php`
Expected: all PASS.

Run: `grep -rn "AboutSection\|about_sections" app tests database resources e2e --include="*.php" --include="*.tsx" --include="*.ts"`
Expected: only `database/migrations/2026_10_13_000002_create_site_tables.php` and `2026_10_15_000004_drop_about_sections.php`. If anything else appears, remove that reference (it is part of this task).

- [ ] **Step 7: Run the full PHP suite**

Run: `./vendor/bin/pest`
Expected: all PASS (≈200 tests).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: drop about_sections table, model, and demo seeding"
```

---

### Task 4: Verification gates + dev/QA migration

**Files:** none created; DB state only.

**Interfaces:**
- Consumes: everything from Tasks 1–3.
- Produces: green gate report (test counts) for the feature.

- [ ] **Step 1: Frontend gates**

Run: `npm test`
Expected: all PASS (34 existing + 1 new = 35).

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 2: Migrate dev and QA databases**

Run: `php artisan migrate --force`
Expected: `2026_10_15_000004_drop_about_sections` ran (000002/000003 already applied earlier).

Run: `DB_DATABASE=timadey_qa_browser php artisan migrate --force`
Expected: same migration ran.

- [ ] **Step 3: Full Playwright suite**

Run: `lsof -iTCP:8892 -sTCP:LISTEN -t | xargs -r kill -9` then `npx playwright test`
Expected: all PASS (52 existing specs; `/admin/about` crawl passes because the editor renders the "Text style" `select`; public `/about` a11y + render specs pass with empty state or stored body).

- [ ] **Step 4: Final PHP suite + report**

Run: `./vendor/bin/pest`
Expected: all PASS. Report final counts (pest / vitest / tsc / build / playwright) to the user.

---

## Self-Review (done at write time)

1. **Spec coverage:** setting key + public render + empty state → Task 1; admin sanitize/store/422 + RichEditor wiring + vitest page test → Task 2; table/model/seeder drop + SeedersTest rewrite → Task 3; gates + dual-DB migration → Task 4; e2e `expectsForm` dependency documented in Global Constraints; Now/Collected out of scope (absent from plan).
2. **Placeholder scan:** every step contains complete code or exact commands; no TBDs, no "similar to Task N".
3. **Type consistency:** public prop `body_html` (controller + page + tests) vs admin prop `body` (controller + page + tests) — each used consistently within its own contract; `Setting::set/`get` are the real APIs (spec typo `Setting::put` corrected); `HtmlSanitizer::sanitize($html)` default field `body` matches `errors.body` assertions; `RichEditor` `value`/`onChange` matches the shipped component's test usage.
