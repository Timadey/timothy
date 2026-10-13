# Timadey Phase 1 — Functional Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Phase 1 of Timadey: a working Laravel + Inertia + React personal platform with public pages (Home, Writing, Notes, Projects, Collected, About, Now, Search), secure admin content management, SEO/RSS, and clearly-labelled demo seed content.

**Architecture:** Single Laravel 12 app with Inertia.js (React 19 + TypeScript) for pages; SSR enabled for public pages in production. PostgreSQL (DBngin) as the database with full-text search. Two React shells (public editorial, admin sidebar). Markdown rendered server-side via league/commonmark. REST API endpoints exposed in parallel for public content.

**Tech Stack:** Laravel 12, PHP 8.4, Inertia.js, React 19, TypeScript, Tailwind CSS v4, Lucide React, Vite, Pest, PostgreSQL 16+ (DBngin), league/commonmark.

## Global Constraints

- Design direction: **Macbook-inspired, black/simple/classic** — text `#1D1D1F`, primary `#000000`, background `#FFFFFF`, subtle surface `#F5F5F7`, metadata `#86868B`, border `#D2D2D7`, link `#0066CC`. Monochrome badges. No gradients, no colored cards. Radius 6–8px max. (Deviation from spec §3 palette is owner-approved; do not reintroduce ivory/forest.)
- Fonts: Inter for UI/headings (tight tracking -0.02em), Source Serif 4 for article body prose only.
- Public content queries MUST filter `status = 'published' AND visibility = 'public'`; drafts/private must 404 for guests.
- All admin operations enforced server-side (middleware + policies), never by hiding UI.
- Secrets only in `.env`; `.env.example` must list every variable.
- Demo seed rows flagged `is_demo = true` and must be removable from admin Settings.
- No fabricated analytics, live states, or placeholder links that do nothing.
- Slugs unique, auto-generated with numeric suffix on collision.
- Reading time = `ceil(wordCount / 220)` minutes, computed on save.
- Icons: Lucide only (never emoji as icons).
- Commit after every task with conventional commit messages.
- Postgres connection (DBngin): host `127.0.0.1`, port `5432`, user `postgres`, database `timadey` (password per DBngin config, often empty locally).
- Keep every task's tests green before committing.

---

### Task 1: Scaffold Laravel + Inertia + React + Tailwind + Pest

**Files:**
- Create: entire Laravel skeleton in project root (moved from temp dir)
- Create: `resources/js/app.tsx`, `resources/js/ssr.tsx`, `resources/js/types/index.d.ts`
- Create: `resources/css/app.css`
- Create: `vite.config.ts`, `tsconfig.json`, `postcss` config (none needed for TW4)
- Modify: `composer.json`, `package.json`, `.env`, `.env.example`
- Test: `tests/Pest.php`, `tests/Feature/ExampleTest.php` (replace default)

**Interfaces:**
- Produces: bootable app at project root; Inertia page resolution (`resources/js/Pages/**/*.tsx`); Tailwind v4 via `@import "tailwindcss"` in `resources/css/app.css`; `.env.example` entries for DB and admin seed creds.

- [ ] **Step 1: Create Laravel skeleton in a temp dir (root is non-empty)**

```bash
composer create-project laravel/laravel /tmp/timadey-scaffold "12.*" --prefer-dist
rsync -a /tmp/timadey-scaffold/ /Users/macbook/WebstormProjects/timadey/
rm -rf /tmp/timadey-scaffold
```

Expected: project root now contains `artisan`, `composer.json`, `app/`, etc. Existing `the-genesis.txt` and `docs/` untouched.

- [ ] **Step 2: Require backend packages**

```bash
composer require inertiajs/inertia-laravel league/commonmark --no-interaction
composer require pestphp/pest pestphp/pest-plugin-laravel --dev --no-interaction
./vendor/bin/pest --init
```

Expected: `tests/Pest.php` exists.

- [ ] **Step 3: Install frontend deps**

```bash
npm install @inertiajs/react react react-dom lucide-react
npm install -D typescript @types/react @types/react-dom @vitejs/plugin-react tailwindcss @tailwindcss/vite vite
```

- [ ] **Step 4: Configure Vite (`vite.config.ts`)**

```ts
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx', 'resources/js/ssr.tsx'],
            ssr: 'resources/js/ssr.tsx',
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
});
```

- [ ] **Step 5: Create `resources/js/app.tsx`**

```tsx
import '../css/app.css';
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';

createInertiaApp({
    resolve: (name) =>
        resolvePageComponent(`./Pages/${name}.tsx`, import.meta.glob('./Pages/**/*.tsx')),
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
});
```

- [ ] **Step 6: Create `resources/js/ssr.tsx`**

```tsx
import { createInertiaApp } from '@inertiajs/react';
import { createServerRoot } from 'react-dom/server';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';

createInertiaApp({
    resolve: (name) =>
        resolvePageComponent(`./Pages/${name}.tsx`, import.meta.glob('./Pages/**/*.tsx')),
    setup({ App, props }) {
        return createServerRoot(props.element, () => <App {...props} />);
    },
});
```

- [ ] **Step 7: Create `resources/css/app.css` (design tokens)**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap');
@import "tailwindcss";

@theme {
    --color-ink: #1d1d1f;
    --color-primary: #000000;
    --color-surface: #f5f5f7;
    --color-meta: #86868b;
    --color-hairline: #d2d2d7;
    --color-link: #0066cc;
    --font-sans: "Inter", system-ui, sans-serif;
    --font-serif: "Source Serif 4", Georgia, serif;
    --radius-sm: 6px;
    --radius-md: 8px;
}

@layer base {
    body {
        @apply bg-white text-ink font-sans antialiased;
    }
    a { @apply text-link; }
    :focus-visible { @apply outline-2 outline-primary outline-offset-2; }
    @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
    }
}
```

- [ ] **Step 8: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "types": ["vite/client"],
    "baseUrl": ".",
    "paths": { "@/*": ["resources/js/*"] }
  },
  "include": ["resources/js/**/*.ts", "resources/js/**/*.tsx"]
}
```

- [ ] **Step 9: Configure database in `.env` and `.env.example`**

`.env` additions:

```
APP_URL=http://localhost:8000
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=timadey
DB_USERNAME=postgres
DB_PASSWORD=
ADMIN_EMAIL=owner@timadey.test
ADMIN_PASSWORD=change-me-in-production
```

Append the same keys (with `ADMIN_PASSWORD=` empty guidance comment) to `.env.example`.

- [ ] **Step 10: Create the Postgres database**

```bash
php artisan db:create
```

Expected: `Database [timadey] created successfully.` If DBngin Postgres is not running, start it from the DBngin app first. If `db:create` fails due to auth, create via DBngin's GUI or `php -r` PDO snippet with the configured credentials.

- [ ] **Step 11: Wire Inertia into the default route**

Replace `routes/web.php` with:

```php
<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Home', ['welcome' => 'Timadey']);
});
```

Replace `resources/views/app.blade.php` with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    @vite(['resources/css/app.css', 'resources/js/app.tsx'])
    @inertiaHead
</head>
<body>
    @inertia
</body>
</html>
```

- [ ] **Step 12: Create minimal `resources/js/Pages/Home.tsx`**

```tsx
export default function Home() {
    return <main className="mx-auto max-w-3xl px-6 py-16"><h1 className="text-4xl font-bold tracking-tight">Timadey</h1></main>;
}
```

- [ ] **Step 13: Verify boot + tests**

```bash
php artisan migrate:status && npm run build && ./vendor/bin/pest
```

Expected: build succeeds, Pest default test passes (update `tests/Feature/ExampleTest.php` to assert 200 on `/` using `Inertia\Testing\AssertableInertia` or plain `$this->get('/')->assertOk()`).

- [ ] **Step 14: Commit**

```bash
git add -A && git commit -m "chore: scaffold Laravel + Inertia + React + Tailwind v4 + Pest"
```

---

### Task 2: Design-system components + public AppShell

**Files:**
- Create: `resources/js/Components/Button.tsx`, `Badge.tsx`, `MetaLine.tsx`, `EmptyState.tsx`, `Skeleton.tsx`, `Tag.tsx`, `SearchInput.tsx`, `FilterBar.tsx`, `Pagination.tsx`, `Prose.tsx`, `MobileNav.tsx`
- Create: `resources/js/Layouts/PublicLayout.tsx`
- Create: `resources/js/Components/__tests__/EmptyState.test.tsx`
- Modify: `resources/js/Pages/Home.tsx`

**Interfaces:**
- Produces: `PublicLayout` (props: `children: React.ReactNode`, optional `title?: string`) wrapping header (wordmark + nav links + mobile drawer) and footer; `Button` (props: `variant?: 'primary'|'secondary'|'ghost'`, `href?`, standard button attrs); `Badge` (`children`, monochrome); `MetaLine` (props: `type?: string`, `date?: string`, `readingTime?: number`); `EmptyState` (props: `title: string`, `hint?: string`); `Tag` (props: `label: string`, `active?: boolean`); `Prose` (props: `html: string`); `Pagination` (props: `links: {url: string|null, label: string, active: boolean}[]`).

- [ ] **Step 1: Write failing component test**

Create `resources/js/Components/__tests__/EmptyState.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

test('renders title and hint', () => {
    render(<EmptyState title="No published writing yet" hint="Check back soon" />);
    expect(screen.getByText('No published writing yet')).toBeInTheDocument();
    expect(screen.getByText('Check back soon')).toBeInTheDocument();
});
```

- [ ] **Step 2: Install Vitest + Testing Library and configure**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Add to `package.json` scripts: `"test": "vitest run"`. Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: { environment: 'jsdom', setupFiles: ['resources/js/setupTests.ts'], globals: true },
});
```

Create `resources/js/setupTests.ts`: `import '@testing-library/jest-dom';`

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `EmptyState` not found.

- [ ] **Step 4: Implement components**

`resources/js/Components/EmptyState.tsx`:

```tsx
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
    return (
        <div className="border border-hairline rounded-md px-6 py-12 text-center">
            <p className="text-ink font-medium">{title}</p>
            {hint && <p className="mt-1 text-sm text-meta">{hint}</p>}
        </div>
    );
}
```

`resources/js/Components/Button.tsx`:

```tsx
import { Link } from '@inertiajs/react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost';
    href?: string;
    children: ReactNode;
};

const styles = {
    primary: 'bg-primary text-white hover:opacity-80',
    secondary: 'bg-white text-ink border border-hairline hover:bg-surface',
    ghost: 'text-ink hover:underline',
};

export function Button({ variant = 'primary', href, className = '', children, ...rest }: Props) {
    const cls = `inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${styles[variant]} ${className}`;
    if (href) return <Link href={href} className={cls}>{children}</Link>;
    return <button className={cls} {...rest}>{children}</button>;
}
```

`resources/js/Components/Badge.tsx`:

```tsx
export function Badge({ children }: { children: React.ReactNode }) {
    return <span className="inline-block rounded-sm border border-hairline bg-surface px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-meta">{children}</span>;
}
```

`resources/js/Components/MetaLine.tsx`:

```tsx
export function MetaLine({ type, date, readingTime }: { type?: string; date?: string; readingTime?: number }) {
    const parts = [type, date, readingTime ? `${readingTime} min read` : null].filter(Boolean);
    return <p className="text-xs text-meta tracking-wide uppercase">{parts.join(' · ')}</p>;
}
```

`resources/js/Components/Tag.tsx`:

```tsx
import { Link } from '@inertiajs/react';

export function Tag({ label, active = false, href }: { label: string; active?: boolean; href?: string }) {
    const cls = `inline-block rounded-sm border px-2 py-0.5 text-xs ${active ? 'border-primary bg-primary text-white' : 'border-hairline text-meta hover:border-primary hover:text-ink'}`;
    return href ? <Link href={href} className={cls}>{label}</Link> : <span className={cls}>{label}</span>;
}
```

`resources/js/Components/Skeleton.tsx`:

```tsx
export function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`animate-pulse rounded-sm bg-surface ${className}`} aria-hidden="true" />;
}
```

`resources/js/Components/SearchInput.tsx`:

```tsx
import { Search } from 'lucide-react';

export function SearchInput({ value, onChange, placeholder = 'Search' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <label className="relative block">
            <span className="sr-only">{placeholder}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-meta" />
            <input
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-md border border-hairline bg-white py-2 pl-9 pr-3 text-sm text-ink placeholder:text-meta focus:border-primary"
            />
        </label>
    );
}
```

`resources/js/Components/FilterBar.tsx`:

```tsx
import { Tag } from './Tag';

export type FilterOption = { label: string; value: string };

export function FilterBar({ options, active, onSelect, allLabel = 'All' }: { options: FilterOption[]; active: string; onSelect: (value: string) => void; allLabel?: string }) {
    return (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filters">
            <Tag label={allLabel} active={active === ''} />
            {options.map((o) => (
                <button key={o.value} type="button" onClick={() => onSelect(o.value)} className="cursor-pointer">
                    <Tag label={o.label} active={active === o.value} />
                </button>
            ))}
        </div>
    );
}
```

`resources/js/Components/Pagination.tsx`:

```tsx
import { Link } from '@inertiajs/react';

export type PageLink = { url: string | null; label: string; active: boolean };

export function Pagination({ links }: { links: PageLink[] }) {
    if (links.length <= 3) return null;
    return (
        <nav className="mt-8 flex flex-wrap gap-1" aria-label="Pagination">
            {links.map((l, i) =>
                l.url ? (
                    <Link key={i} href={l.url} preserveScroll
                        className={`rounded-sm px-3 py-1 text-sm ${l.active ? 'bg-primary text-white' : 'text-ink hover:bg-surface'}`}
                        dangerouslySetInnerHTML={{ __html: l.label }} />
                ) : (
                    <span key={i} className="px-3 py-1 text-sm text-meta" dangerouslySetInnerHTML={{ __html: l.label }} />
                )
            )}
        </nav>
    );
}
```

`resources/js/Components/Prose.tsx`:

```tsx
export function Prose({ html, className = '' }: { html: string; className?: string }) {
    return (
        <div
            className={`prose-custom max-w-[65ch] text-[1.0625rem] leading-[1.7] ${className}`}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
```

Add `.prose-custom` styles to `resources/css/app.css`:

```css
@layer components {
    .prose-custom { @apply text-ink; }
    .prose-custom h1, .prose-custom h2, .prose-custom h3 { @apply font-sans font-semibold tracking-tight mt-8 mb-3 text-ink; }
    .prose-custom h1 { @apply text-3xl; } .prose-custom h2 { @apply text-2xl; } .prose-custom h3 { @apply text-xl; }
    .prose-custom p { @apply mb-4; }
    .prose-custom a { @apply text-link underline underline-offset-2; }
    .prose-custom ul { @apply list-disc pl-6 mb-4 space-y-1; }
    .prose-custom ol { @apply list-decimal pl-6 mb-4 space-y-1; }
    .prose-custom blockquote { @apply border-l-2 border-hairline pl-4 italic text-meta mb-4; }
    .prose-custom pre { @apply bg-ink text-white rounded-md p-4 overflow-x-auto text-sm mb-4; }
    .prose-custom code { @apply bg-surface rounded-sm px-1 py-0.5 text-sm; }
    .prose-custom pre code { @apply bg-transparent p-0; }
    .prose-custom img { @apply rounded-md mb-4; }
    .prose-custom h1 a, .prose-custom h2 a, .prose-custom h3 a { @apply no-underline; }
    .prose-custom { font-family: var(--font-serif); }
    .prose-custom h1, .prose-custom h2, .prose-custom h3, .prose-custom pre, .prose-custom code { font-family: var(--font-sans); }
}
```

- [ ] **Step 5: Implement `MobileNav.tsx` + `PublicLayout.tsx`**

`resources/js/Components/MobileNav.tsx`:

```tsx
import { useState } from 'react';
import { Link } from '@inertiajs/react';
import { Menu, X } from 'lucide-react';
import { navItems } from '@/nav';

export function MobileNav({ current }: { current: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="md:hidden">
            <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'}
                className="rounded-md p-2 text-ink hover:bg-surface">
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            {open && (
                <nav className="absolute inset-x-0 top-14 z-40 border-b border-hairline bg-white px-6 py-4 md:hidden">
                    {navItems.map((item) => (
                        <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                            className={`block py-2 text-sm font-medium ${current === item.href ? 'text-primary' : 'text-ink hover:text-link'}`}>
                            {item.label}
                        </Link>
                    ))}
                </nav>
            )}
        </div>
    );
}
```

Create `resources/js/nav.ts`:

```ts
export const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Writing', href: '/writing' },
    { label: 'Notes', href: '/notes' },
    { label: 'Projects', href: '/projects' },
    { label: 'Collected', href: '/collected' },
    { label: 'Now', href: '/now' },
    { label: 'About', href: '/about' },
    { label: 'Ask', href: '/ask' },
];
```

`resources/js/Layouts/PublicLayout.tsx`:

```tsx
import { Link, usePage } from '@inertiajs/react';
import { MobileNav } from '@/Components/MobileNav';
import { navItems } from '@/nav';
import type { ReactNode } from 'react';

export default function PublicLayout({ children }: { children: ReactNode }) {
    const { url } = usePage();
    const current = url.split('?')[0];
    return (
        <div className="min-h-screen flex flex-col">
            <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-primary focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
            <header className="sticky top-0 z-30 border-b border-hairline bg-white/90 backdrop-blur">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
                    <Link href="/" className="text-lg font-bold tracking-tight text-primary">Timadey</Link>
                    <nav className="hidden gap-5 md:flex" aria-label="Primary">
                        {navItems.map((item) => (
                            <Link key={item.href} href={item.href}
                                className={`text-sm font-medium ${current === item.href ? 'text-primary' : 'text-meta hover:text-ink'}`}>
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                    <MobileNav current={current} />
                </div>
            </header>
            <main id="main" className="flex-1">{children}</main>
            <footer className="border-t border-hairline">
                <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-8 text-xs text-meta sm:flex-row sm:justify-between">
                    <span>© {new Date().getFullYear()} Timadey</span>
                    <div className="flex gap-4">
                        <Link href="/rss.xml" className="hover:text-ink">RSS</Link>
                        <Link href="/writing" className="hover:text-ink">Writing</Link>
                        <Link href="/ask" className="hover:text-ink">Ask Timadey</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
```

- [ ] **Step 6: Wrap Home in PublicLayout, run tests + build**

Update `resources/js/Pages/Home.tsx` to render inside `PublicLayout`.

Run: `npm test && npm run build`
Expected: PASS + successful build.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: design-system components and public app shell"
```

---

### Task 3: Database migrations + Eloquent models

**Files:**
- Create: `database/migrations/2026_10_13_000001_create_users_table.php` (adjust: Laravel default users migration exists — modify it instead)
- Create: migrations for `posts`, `topics`, `tags`, `taggables`, `topicables`, `projects`, `project_meta` not needed — `collected_items`, `now_sections`, `now_updates`, `about_sections`, `social_links`, `settings`
- Create: `app/Models/Post.php`, `Topic.php`, `Tag.php`, `Project.php`, `CollectedItem.php`, `NowSection.php`, `NowUpdate.php`, `AboutSection.php`, `SocialLink.php`, `Setting.php`, `User.php` (modify existing)
- Test: `tests/Feature/ModelsTest.php`

**Interfaces:**
- Produces: `Post::published()` / `Post::publiclyVisible()` scopes returning builder; `Post::readingTimeFromBody(string): int` static; `Project::publiclyVisible()`; `CollectedItem::publiclyVisible()`; slug helpers `HasSlug` trait with `generateSlug(string $title): string` on each model; relationships `Post::tags()`, `Post::topics()`, `Post::author()`, `Project::tags()`, `CollectedItem::tags()`.

- [ ] **Step 1: Write failing model tests**

Create `tests/Feature/ModelsTest.php`:

```php
<?php

use App\Models\{Post, Project, User, CollectedItem};

it('scopes published public posts', function () {
    $author = User::factory()->create();
    Post::factory()->create(['status' => 'published', 'visibility' => 'public', 'published_at' => now()->subDay(), 'author_id' => $author->id]);
    Post::factory()->create(['status' => 'draft', 'author_id' => $author->id]);
    Post::factory()->create(['status' => 'published', 'visibility' => 'private', 'author_id' => $author->id]);

    expect(Post::published()->count())->toBe(1);
});

it('generates unique slugs', function () {
    $author = User::factory()->create();
    $a = Post::factory()->create(['title' => 'Hello World', 'slug' => 'hello-world', 'author_id' => $author->id]);
    $b = Post::factory()->create(['title' => 'Hello World', 'author_id' => $author->id]);

    expect($a->slug)->toBe('hello-world')->and($b->slug)->toBe('hello-world-2');
});

it('computes reading time', function () {
    expect(Post::readingTimeFromBody(str_repeat('word ', 440)))->toBe(2);
});

it('hides unpublished projects from public scope', function () {
    Project::factory()->create(['visibility' => 'public', 'status' => 'building']);
    Project::factory()->create(['visibility' => 'private']);

    expect(Project::publiclyVisible()->count())->toBe(1);
});

it('loads tags on posts', function () {
    $author = User::factory()->create();
    $post = Post::factory()->create(['author_id' => $author->id]);
    $post->tags()->attach(\App\Models\Tag::firstOrCreate(['slug' => 'tech'], ['name' => 'Tech']));

    expect($post->fresh()->tags)->toHaveCount(1);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `./vendor/bin/pest tests/Feature/ModelsTest.php`
Expected: FAIL (tables/scopes missing).

- [ ] **Step 3: Modify users migration + write all migrations**

Modify `database/migrations/0001_01_01_000000_create_users_table.php` users section to add after `password`:

```php
$table->string('display_name')->nullable();
$table->string('avatar')->nullable();
$table->string('role')->default('admin');
$table->timestamps();
```

(keep `remember_token` etc.)

Create `database/migrations/2026_10_13_000001_create_content_tables.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('excerpt')->nullable();
            $table->longText('body')->nullable();
            $table->string('post_type')->default('article');
            $table->string('status')->default('draft');
            $table->string('visibility')->default('public');
            $table->boolean('featured')->default(false);
            $table->string('cover_image')->nullable();
            $table->string('meta_title')->nullable();
            $table->string('meta_description')->nullable();
            $table->string('og_image')->nullable();
            $table->unsignedInteger('reading_time')->default(0);
            $table->boolean('is_demo')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->softDeletes();
            $table->timestamps();
            $table->index(['status', 'post_type', 'published_at']);
        });

        Schema::create('topics', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('tags', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->timestamps();
        });

        Schema::create('taggables', function (Blueprint $table) {
            $table->foreignId('tag_id')->constrained()->cascadeOnDelete();
            $table->morphs('taggable');
            $table->primary(['tag_id', 'taggable_id', 'taggable_type']);
        });

        Schema::create('topicables', function (Blueprint $table) {
            $table->foreignId('topic_id')->constrained()->cascadeOnDelete();
            $table->morphs('topicable');
            $table->primary(['topic_id', 'topicable_id', 'topicable_type']);
        });

        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('summary')->nullable();
            $table->longText('description')->nullable();
            $table->string('status')->default('idea');
            $table->string('visibility')->default('public');
            $table->string('cover_image')->nullable();
            $table->string('repository_url')->nullable();
            $table->string('live_url')->nullable();
            $table->date('started_at')->nullable();
            $table->date('completed_at')->nullable();
            $table->boolean('featured')->default(false);
            $table->boolean('is_demo')->default(false);
            $table->softDeletes();
            $table->timestamps();
            $table->index(['status', 'visibility']);
        });

        Schema::create('collected_items', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('url')->nullable();
            $table->string('creator')->nullable();
            $table->string('item_type')->default('other');
            $table->text('annotation')->nullable();
            $table->string('visibility')->default('public');
            $table->boolean('is_demo')->default(false);
            $table->timestamps();
            $table->index(['item_type', 'visibility']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('collected_items');
        Schema::dropIfExists('projects');
        Schema::dropIfExists('topicables');
        Schema::dropIfExists('taggables');
        Schema::dropIfExists('tags');
        Schema::dropIfExists('topics');
        Schema::dropIfExists('posts');
    }
};
```

Create `database/migrations/2026_10_13_000002_create_site_tables.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('now_sections', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('label');
            $table->text('body')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('visible')->default(true);
            $table->timestamps();
        });

        Schema::create('now_updates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('now_section_id')->constrained()->cascadeOnDelete();
            $table->string('text');
            $table->timestamp('occurred_at')->nullable();
            $table->boolean('visible')->default(true);
            $table->timestamps();
        });

        Schema::create('about_sections', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('title');
            $table->text('body')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('visible')->default(true);
            $table->timestamps();
        });

        Schema::create('social_links', function (Blueprint $table) {
            $table->id();
            $table->string('platform');
            $table->string('url');
            $table->string('label')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('visible')->default(true);
            $table->timestamps();
        });

        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
        Schema::dropIfExists('social_links');
        Schema::dropIfExists('about_sections');
        Schema::dropIfExists('now_updates');
        Schema::dropIfExists('now_sections');
    }
};
```

- [ ] **Step 4: Create HasSlug trait**

`app/Models/Concerns/HasSlug.php`:

```php
<?php

namespace App\Models\Concerns;

use Illuminate\Support\Str;

trait HasSlug
{
    public static function makeSlug(string $title): string
    {
        $base = Str::slug($title) ?: 'item';
        $slug = $base;
        $i = 2;
        while (static::withoutTrashed()->where('slug', $slug)->exists()) {
            $slug = $base . '-' . $i++;
        }
        return $slug;
    }
}
```

- [ ] **Step 5: Create models**

`app/Models/Post.php`:

```php
<?php

namespace App\Models;

use App\Models\Concerns\HasSlug;
use Illuminate\Database\Eloquent\{Builder, Model, SoftDeletes};
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\{BelongsTo, MorphToMany};

class Post extends Model
{
    use HasFactory, SoftDeletes, HasSlug;

    protected $fillable = [
        'author_id', 'title', 'slug', 'excerpt', 'body', 'post_type', 'status',
        'visibility', 'featured', 'cover_image', 'meta_title', 'meta_description',
        'og_image', 'reading_time', 'is_demo', 'published_at',
    ];

    protected $casts = [
        'featured' => 'boolean',
        'is_demo' => 'boolean',
        'published_at' => 'datetime',
    ];

    public function author(): BelongsTo { return $this->belongsTo(User::class, 'author_id'); }

    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable')->orderBy('name');
    }

    public function topics(): MorphToMany
    {
        return $this->morphToMany(Topic::class, 'topicable')->orderBy('name');
    }

    public function scopePublished(Builder $q): Builder
    {
        return $q->where('status', 'published')->whereNotNull('published_at')->where('published_at', '<=', now());
    }

    public function scopePubliclyVisible(Builder $q): Builder
    {
        return $q->published()->where('visibility', 'public');
    }

    public function scopeOfType(Builder $q, string $type): Builder
    {
        return $q->where('post_type', $type);
    }

    public static function readingTimeFromBody(string $body): int
    {
        $text = trim(strip_tags($body));
        $words = str_word_count($text);
        return max(1, (int) ceil($words / 220));
    }

    protected static function booted(): void
    {
        static::saving(function (Post $post) {
            if ($post->isDirty('slug') || !$post->slug) {
                $post->slug = static::makeSlug($post->title);
            }
            $post->reading_time = static::readingTimeFromBody((string) $post->body);
            if ($post->status === 'published' && !$post->published_at) {
                $post->published_at = now();
            }
        });
    }
}
```

`app/Models/Project.php`:

```php
<?php

namespace App\Models;

use App\Models\Concerns\HasSlug;
use Illuminate\Database\Eloquent\{Builder, Model, SoftDeletes};
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\MorphToMany;

class Project extends Model
{
    use HasFactory, SoftDeletes, HasSlug;

    protected $fillable = [
        'name', 'slug', 'summary', 'description', 'status', 'visibility',
        'cover_image', 'repository_url', 'live_url', 'started_at', 'completed_at',
        'featured', 'is_demo',
    ];

    protected $casts = [
        'featured' => 'boolean',
        'is_demo' => 'boolean',
        'started_at' => 'date',
        'completed_at' => 'date',
    ];

    public function tags(): MorphToMany { return $this->morphToMany(Tag::class, 'taggable')->orderBy('name'); }
    public function topics(): MorphToMany { return $this->morphToMany(Topic::class, 'topicable')->orderBy('name'); }

    public function scopePubliclyVisible(Builder $q): Builder
    {
        return $q->where('visibility', 'public');
    }

    protected static function booted(): void
    {
        static::saving(function (Project $project) {
            if ($project->isDirty('slug') || !$project->slug) {
                $project->slug = static::makeSlug($project->name);
            }
        });
    }
}
```

`app/Models/CollectedItem.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\{Builder, Model};
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\MorphToMany;

class CollectedItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'title', 'url', 'creator', 'item_type', 'annotation', 'visibility', 'is_demo',
    ];

    protected $casts = ['is_demo' => 'boolean'];

    public function tags(): MorphToMany { return $this->morphToMany(Tag::class, 'taggable')->orderBy('name'); }

    public function scopePubliclyVisible(Builder $q): Builder
    {
        return $q->where('visibility', 'public');
    }
}
```

Create the remaining thin models (`Topic`, `Tag`, `NowSection`, `NowUpdate`, `AboutSection`, `SocialLink`, `Setting`) with `$fillable`, casts, and relations (`Tag`/`Topic` get `morphedByMany` for posts/projects/collectedItems; `NowSection hasMany NowUpdate`). Example `app/Models/Tag.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphToMany;

class Tag extends Model
{
    protected $fillable = ['name', 'slug'];

    public function posts(): MorphToMany { return $this->morphedByMany(Post::class, 'taggable'); }
    public function projects(): MorphToMany { return $this->morphedByMany(Project::class, 'taggable'); }
    public function collectedItems(): MorphToMany { return $this->morphedByMany(CollectedItem::class, 'taggable'); }

    protected static function booted(): void
    {
        static::saving(function (Tag $tag) {
            if (!$tag->slug) $tag->slug = \Illuminate\Support\Str::slug($tag->name);
        });
    }
}
```

`Topic` mirrors `Tag` with `topicable` relations. `Setting` gets `static function get(string $key, $default = null)` and `static function set(string $key, $value)`.

- [ ] **Step 6: Run migrations and tests**

```bash
php artisan migrate:fresh && ./vendor/bin/pest tests/Feature/ModelsTest.php
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: content schema and Eloquent models with public scopes"
```

---

### Task 4: Markdown rendering service

**Files:**
- Create: `app/Services/MarkdownService.php`
- Test: `tests/Feature/MarkdownServiceTest.php`

**Interfaces:**
- Produces: `MarkdownService::render(string $markdown): string` (safe HTML); `MarkdownService::toPlainText(string $markdown): string` (for search excerpts).

- [ ] **Step 1: Write failing test**

`tests/Feature/MarkdownServiceTest.php`:

```php
<?php

use App\Services\MarkdownService;

it('renders markdown to html', function () {
    $html = app(MarkdownService::class)->render('# Title\n\nSome **bold** text');
    expect($html)->toContain('<h1>')->toContain('<strong>bold</strong>');
});

it('strips raw html for safety', function () {
    $html = app(MarkdownService::class)->render('Hello <script>alert(1)</script>');
    expect($html)->not->toContain('<script>');
});

it('renders fenced code blocks', function () {
    $html = app(MarkdownService::class)->render("```php\necho 1;\n```");
    expect($html)->toContain('<pre>')->toContain('echo 1;');
});

it('converts to plain text', function () {
    $text = app(MarkdownService::class)->toPlainText('# Hello\n\nWorld');
    expect($text)->toContain('Hello')->toContain('World')->not->toContain('#');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./vendor/bin/pest tests/Feature/MarkdownServiceTest.php`
Expected: FAIL (class not found).

- [ ] **Step 3: Implement service**

`app/Services/MarkdownService.php`:

```php
<?php

namespace App\Services;

use League\CommonMark\Environment\Environment;
use League\CommonMark\Extension\CommonMark\CommonMarkCoreExtension;
use League\CommonMark\Extension\FencedCode\FencedCodeExtension;
use League\CommonMark\Extension\Table\TableExtension;
use League\CommonMark\MarkdownConverter;

class MarkdownService
{
    private MarkdownConverter $converter;

    public function __construct()
    {
        $config = [
            'html_input' => 'strip',
            'allow_unsafe_links' => false,
            'renderer' => ['block_separator' => "\n", 'inner_separator' => "\n", 'soft_break' => "<br />\n"],
        ];
        $environment = new Environment($config);
        $environment->addExtension(new CommonMarkCoreExtension());
        $environment->addExtension(new FencedCodeExtension());
        $environment->addExtension(new TableExtension());
        $this->converter = new MarkdownConverter($environment);
    }

    public function render(string $markdown): string
    {
        return (string) $this->converter->convert($markdown);
    }

    public function toPlainText(string $markdown): string
    {
        return trim(preg_replace('/\s+/', ' ', strip_tags($this->render($markdown))));
    }
}
```

- [ ] **Step 4: Run tests**

Run: `./vendor/bin/pest tests/Feature/MarkdownServiceTest.php`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: safe markdown rendering service"
```

---

### Task 5: Admin authentication (login, middleware, owner seeding)

**Files:**
- Create: `app/Http/Controllers/Admin/AuthController.php`
- Create: `app/Http/Middleware/EnsureOwner.php`
- Create: `resources/js/Pages/Admin/Login.tsx`
- Modify: `routes/web.php`, `bootstrap/app.php`, `app/Models/User.php`
- Create: `database/seeders/OwnerSeeder.php`
- Test: `tests/Feature/AuthTest.php`

**Interfaces:**
- Consumes: `User` model with `role` field.
- Produces: `GET /admin/login` (public), `POST /admin/login` (rate-limited 5/min), `POST /admin/logout`; middleware alias `owner` applied to the `/admin` route group; `User::isOwner(): bool`.

- [ ] **Step 1: Write failing auth tests**

`tests/Feature/AuthTest.php`:

```php
<?php

use App\Models\User;

it('shows login page to guests', function () {
    $this->get('/admin/login')->assertOk();
});

it('redirects guests from admin dashboard', function () {
    $this->get('/admin')->assertRedirect('/admin/login');
});

it('allows owner to log in and see dashboard', function () {
    $owner = User::factory()->create(['email' => 'owner@test.dev', 'password' => bcrypt('secret-123'), 'role' => 'owner']);
    $this->post('/admin/login', ['email' => 'owner@test.dev', 'password' => 'secret-123'])
        ->assertRedirect('/admin');
    $this->actingAs($owner)->get('/admin')->assertOk();
});

it('rejects wrong password with generic error', function () {
    User::factory()->create(['email' => 'owner@test.dev', 'password' => bcrypt('secret-123')]);
    $this->from('/admin/login')
        ->post('/admin/login', ['email' => 'owner@test.dev', 'password' => 'wrong'])
        ->assertRedirect('/admin/login')
        ->assertSessionHasErrors('email');
});

it('rate limits login attempts', function () {
    User::factory()->create(['email' => 'owner@test.dev', 'password' => bcrypt('secret-123')]);
    foreach (range(1, 6) as $i) {
        $this->post('/admin/login', ['email' => 'owner@test.dev', 'password' => 'wrong']);
    }
    $this->post('/admin/login', ['email' => 'owner@test.dev', 'password' => 'secret-123'])
        ->assertStatus(429);
});

it('blocks non-owner from admin even when authenticated', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $this->actingAs($admin)->get('/admin')->assertForbidden();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./vendor/bin/pest tests/Feature/AuthTest.php`
Expected: FAIL.

- [ ] **Step 3: Implement User changes + middleware + controller**

`app/Models/User.php` — add to `$fillable`: `'display_name', 'avatar', 'role'`; add:

```php
public function isOwner(): bool { return $this->role === 'owner'; }
public function posts(): \Illuminate\Database\Eloquent\Relations\HasMany { return $this->hasMany(Post::class, 'author_id'); }
```

Ensure `password` is in `$hidden` and casts include `'password' => 'hashed'`.

`app/Http/Middleware/EnsureOwner.php`:

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOwner
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user() || !$request->user()->isOwner()) {
            abort(403);
        }
        return $next($request);
    }
}
```

Register alias in `bootstrap/app.php`:

```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias(['owner' => \App\Http\Middleware\EnsureOwner::class]);
})
```

`app/Http/Controllers/Admin/AuthController.php`:

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\{RedirectResponse, Request};
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Admin/Login');
    }

    public function store(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ], [], ['email' => 'Email']);

        $remember = (bool) $request->boolean('remember');

        if (!Auth::attempt($credentials + ['role' => ['owner', 'admin']], $remember)) {
            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        $request->session()->regenerate();

        return redirect()->intended('/admin');
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/admin/login');
    }
}
```

Note: `Auth::attempt` doesn't accept array values for extra conditions in all versions — instead validate manually:

```php
$user = \App\Models\User::where('email', $credentials['email'])->first();
if (!$user || !\Illuminate\Support\Facades\Hash::check($credentials['password'], $user->password) || !$user->isOwner()) {
    throw ValidationException::withMessages(['email' => __('auth.failed')]);
}
Auth::login($user, $remember);
$request->session()->regenerate();
return redirect()->intended('/admin');
```

Use this manual version in the final controller (it also blocks non-owner logins).

- [ ] **Step 4: Routes**

In `routes/web.php` add above the home route:

```php
Route::middleware('guest')->group(function () {
    Route::get('/admin/login', [\App\Http\Controllers\Admin\AuthController::class, 'create'])->name('login');
    Route::post('/admin/login', [\App\Http\Controllers\Admin\AuthController::class, 'store'])
        ->middleware('throttle:5,1');
});

Route::post('/admin/logout', [\App\Http\Controllers\Admin\AuthController::class, 'destroy'])
    ->middleware('auth')->name('logout');

Route::prefix('admin')->name('admin.')->middleware(['auth', 'owner'])->group(function () {
    Route::get('/', fn () => \Inertia\Inertia::render('Admin/Dashboard'))->name('dashboard');
});
```

- [ ] **Step 5: Login page UI**

`resources/js/Pages/Admin/Login.tsx`:

```tsx
import { useForm } from '@inertiajs/react';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({ email: '', password: '' });

    return (
        <div className="flex min-h-screen items-center justify-center bg-surface px-4">
            <form
                onSubmit={(e) => { e.preventDefault(); post('/admin/login'); }}
                className="w-full max-w-sm rounded-md border border-hairline bg-white p-8"
            >
                <h1 className="text-xl font-semibold tracking-tight">Timadey Admin</h1>
                <p className="mt-1 text-sm text-meta">Sign in to manage your site.</p>
                <label className="mt-6 block text-sm font-medium">Email
                    <input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)}
                        className="mt-1 w-full rounded-md border border-hairline px-3 py-2 text-sm focus:border-primary"
                        autoComplete="email" required />
                </label>
                {errors.email && <p className="mt-1 text-sm text-red-700">{errors.email}</p>}
                <label className="mt-4 block text-sm font-medium">Password
                    <input type="password" value={data.password} onChange={(e) => setData('password', e.target.value)}
                        className="mt-1 w-full rounded-md border border-hairline px-3 py-2 text-sm focus:border-primary"
                        autoComplete="current-password" required />
                </label>
                <button type="submit" disabled={processing}
                    className="mt-6 w-full rounded-md bg-primary py-2 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50">
                    {processing ? 'Signing in…' : 'Sign in'}
                </button>
            </form>
        </div>
    );
}
```

- [ ] **Step 6: Owner seeder**

`database/seeders/OwnerSeeder.php`:

```php
<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class OwnerSeeder extends Seeder
{
    public function run(): void
    {
        $email = config('timadey.admin_email', env('ADMIN_EMAIL'));
        $password = config('timadey.admin_password', env('ADMIN_PASSWORD'));
        if (!$email || !$password) return;

        User::updateOrCreate(
            ['email' => $email],
            ['password' => $password, 'display_name' => 'Timadey', 'role' => 'owner']
        );
    }
}
```

The `password` cast (`hashed`) handles hashing. Add `OwnerSeeder` to `DatabaseSeeder`.

- [ ] **Step 7: Run tests**

```bash
php artisan migrate:fresh --seed && ./vendor/bin/pest tests/Feature/AuthTest.php
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: secure admin authentication with rate-limited login"
```

---

### Task 6: Admin shell + dashboard

**Files:**
- Create: `resources/js/Layouts/AdminLayout.tsx`
- Create: `resources/js/Pages/Admin/Dashboard.tsx`
- Modify: `routes/web.php` (dashboard now renders with stats)
- Test: `tests/Feature/AdminDashboardTest.php`

**Interfaces:**
- Produces: `AdminLayout` (props: `children`, `title: string`) with sidebar nav items: Dashboard `/admin`, Posts `/admin/posts`, Projects `/admin/projects`, Collected `/admin/collected`, Now `/admin/now`, About `/admin/about`, Social `/admin/social`, Tags `/admin/tags`, Settings `/admin/settings`; dashboard Inertia props: `{ stats: { publishedPosts, draftPosts, publishedNotes, projects, collectedItems, recentPosts: {id,title,status,created_at}[] } }`.

- [ ] **Step 1: Write failing dashboard test**

`tests/Feature/AdminDashboardTest.php`:

```php
<?php

use App\Models\{Post, User};

it('shows dashboard with real counts for owner', function () {
    $owner = User::factory()->create(['role' => 'owner']);
    $author = User::factory()->create();
    Post::factory()->count(2)->create(['status' => 'published', 'author_id' => $author->id]);
    Post::factory()->create(['status' => 'draft', 'author_id' => $author->id]);

    $this->actingAs($owner)->get('/admin')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Admin/Dashboard')
            ->where('stats.publishedPosts', 2)
            ->where('stats.draftPosts', 1));
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./vendor/bin/pest tests/Feature/AdminDashboardTest.php`
Expected: FAIL.

- [ ] **Step 3: Implement AdminLayout**

`resources/js/Layouts/AdminLayout.tsx`:

```tsx
import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Menu, X, ExternalLink } from 'lucide-react';

const items = [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Posts', href: '/admin/posts' },
    { label: 'Projects', href: '/admin/projects' },
    { label: 'Collected', href: '/admin/collected' },
    { label: 'Now', href: '/admin/now' },
    { label: 'About', href: '/admin/about' },
    { label: 'Social', href: '/admin/social' },
    { label: 'Tags & Topics', href: '/admin/tags' },
    { label: 'Settings', href: '/admin/settings' },
];

export default function AdminLayout({ children, title }: { children: React.ReactNode; title: string }) {
    const { url, auth } = usePage().props as any;
    const current = url.split('?')[0];
    const [open, setOpen] = useState(false);

    const nav = (
        <nav className="flex flex-col gap-1" aria-label="Admin">
            {items.map((item) => (
                <Link key={item.href} href={item.href}
                    className={`rounded-sm px-3 py-2 text-sm font-medium ${current === item.href || (item.href !== '/admin' && current.startsWith(item.href)) ? 'bg-primary text-white' : 'text-ink hover:bg-surface'}`}>
                    {item.label}
                </Link>
            ))}
            <Link href="/" className="mt-4 flex items-center gap-1 rounded-sm px-3 py-2 text-sm text-meta hover:text-ink">
                View site <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <Link href="/admin/logout" method="post" as="button" className="rounded-sm px-3 py-2 text-left text-sm text-meta hover:text-ink">
                Sign out
            </Link>
        </nav>
    );

    return (
        <div className="min-h-screen bg-surface">
            <header className="flex items-center justify-between border-b border-hairline bg-white px-4 py-3 md:hidden">
                <span className="font-semibold tracking-tight">Timadey Admin</span>
                <button type="button" onClick={() => setOpen(!open)} aria-label="Toggle menu" className="p-2">
                    {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </header>
            {open && <div className="border-b border-hairline bg-white p-3 md:hidden">{nav}</div>}
            <div className="mx-auto flex max-w-6xl">
                <aside className="hidden w-56 shrink-0 border-r border-hairline bg-white p-4 md:block md:min-h-screen">
                    <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-meta">Timadey</p>
                    {nav}
                </aside>
                <main className="flex-1 p-6 md:p-8">
                    <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                    <div className="mt-6">{children}</div>
                </main>
            </div>
        </div>
    );
}
```

- [ ] **Step 4: Dashboard controller + page**

Replace the inline dashboard closure in `routes/web.php` with:

```php
Route::get('/', [\App\Http\Controllers\Admin\DashboardController::class, 'index'])->name('dashboard');
```

Create `app/Http/Controllers/Admin/DashboardController.php`:

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\{CollectedItem, Post, Project};
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'publishedPosts' => Post::publiclyVisible()->ofType('article')->count(),
                'draftPosts' => Post::where('status', 'draft')->count(),
                'publishedNotes' => Post::publiclyVisible()->ofType('note')->count(),
                'projects' => Project::count(),
                'collectedItems' => CollectedItem::count(),
                'recentPosts' => Post::latest()->limit(5)->get(['id', 'title', 'status', 'created_at'])
                    ->map(fn ($p) => ['id' => $p->id, 'title' => $p->title, 'status' => $p->status, 'created_at' => $p->created_at->format('Y-m-d')]),
            ],
        ]);
    }
}
```

Create `resources/js/Pages/Admin/Dashboard.tsx`:

```tsx
import AdminLayout from '@/Layouts/AdminLayout';
import { Link } from '@inertiajs/react';

type Stats = {
    publishedPosts: number; draftPosts: number; publishedNotes: number;
    projects: number; collectedItems: number;
    recentPosts: { id: number; title: string; status: string; created_at: string }[];
};

export default function Dashboard({ stats }: { stats: Stats }) {
    const cards = [
        { label: 'Published articles', value: stats.publishedPosts, href: '/admin/posts?type=article' },
        { label: 'Drafts', value: stats.draftPosts, href: '/admin/posts?status=draft' },
        { label: 'Published notes', value: stats.publishedNotes, href: '/admin/posts?type=note' },
        { label: 'Projects', value: stats.projects, href: '/admin/projects' },
        { label: 'Collected items', value: stats.collectedItems, href: '/admin/collected' },
    ];
    return (
        <AdminLayout title="Dashboard">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((c) => (
                    <Link key={c.label} href={c.href}
                        className="rounded-md border border-hairline bg-white p-5 hover:border-primary">
                        <p className="text-3xl font-semibold tracking-tight">{c.value}</p>
                        <p className="mt-1 text-sm text-meta">{c.label}</p>
                    </Link>
                ))}
            </div>
            <section className="mt-8 rounded-md border border-hairline bg-white">
                <h2 className="border-b border-hairline px-5 py-3 text-sm font-semibold">Recent posts</h2>
                <ul>
                    {stats.recentPosts.map((p) => (
                        <li key={p.id} className="flex items-center justify-between border-b border-hairline px-5 py-3 last:border-0">
                            <Link href={`/admin/posts/${p.id}/edit`} className="text-sm hover:text-link">{p.title}</Link>
                            <span className="text-xs uppercase text-meta">{p.status} · {p.created_at}</span>
                        </li>
                    ))}
                    {stats.recentPosts.length === 0 && <li className="px-5 py-6 text-sm text-meta">No posts yet.</li>}
                </ul>
            </section>
        </AdminLayout>
    );
}
```

- [ ] **Step 5: Run tests**

Run: `./vendor/bin/pest tests/Feature/AdminDashboardTest.php tests/Feature/AuthTest.php`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: admin shell and dashboard with real content counts"
```

---

### Task 7: Admin posts management (list, editor, publish, delete)

**Files:**
- Create: `app/Http/Controllers/Admin/PostController.php`
- Create: `resources/js/Pages/Admin/Posts/Index.tsx`, `resources/js/Pages/Admin/Posts/Edit.tsx`
- Create: `app/Http/Requests/StorePostRequest.php`
- Modify: `routes/web.php`
- Test: `tests/Feature/AdminPostsTest.php`

**Interfaces:**
- Produces: `GET /admin/posts` (list, filters `?status=`, `?type=`), `GET /admin/posts/create`, `GET /admin/posts/{post}/edit`, `POST /admin/posts` (validated), `PUT /admin/posts/{post}`, `DELETE /admin/posts/{post}`; validation: `title required max:200`, `post_type in:article,note,question`, `status in:draft,published,archived`, `visibility in:public,private`, `body nullable string`, `slug nullable unique`, `featured boolean`, `excerpt nullable max:500`, meta fields nullable; preview at `GET /admin/posts/{post}/preview`.

- [ ] **Step 1: Write failing tests**

`tests/Feature/AdminPostsTest.php`:

```php
<?php

use App\Models\{Post, User};

beforeEach(function () {
    $this->owner = User::factory()->create(['role' => 'owner']);
});

it('lists posts for owner', function () {
    $author = User::factory()->create();
    Post::factory()->create(['title' => 'Listed Post', 'author_id' => $author->id]);
    $this->actingAs($this->owner)->get('/admin/posts')
        ->assertOk()
        ->assertInertia(fn ($p) => $p->component('Admin/Posts/Index'));
});

it('creates a published post', function () {
    $this->actingAs($this->owner)->post('/admin/posts', [
        'title' => 'A Fresh Idea',
        'body' => 'Body text here',
        'post_type' => 'article',
        'status' => 'published',
        'visibility' => 'public',
        'featured' => false,
        'excerpt' => 'An excerpt',
    ])->assertRedirect();

    $post = Post::where('slug', 'a-fresh-idea')->firstOrFail();
    expect($post->status)->toBe('published')->and($post->published_at)->not->toBeNull()
        ->and($post->reading_time)->toBeGreaterThan(0);
});

it('validates required fields', function () {
    $this->actingAs($this->owner)->post('/admin/posts', ['title' => ''])
        ->assertSessionHasErrors('title');
});

it('updates a post', function () {
    $author = User::factory()->create();
    $post = Post::factory()->create(['author_id' => $author->id, 'title' => 'Old']);
    $this->actingAs($this->owner)->put("/admin/posts/{$post->id}", [
        'title' => 'New Title', 'post_type' => 'article', 'status' => 'draft', 'visibility' => 'public',
    ])->assertRedirect();
    expect($post->fresh()->title)->toBe('New Title');
});

it('deletes a post', function () {
    $author = User::factory()->create();
    $post = Post::factory()->create(['author_id' => $author->id]);
    $this->actingAs($this->owner)->delete("/admin/posts/{$post->id}")->assertRedirect();
    expect(Post::withTrashed()->find($post->id)->deleted_at)->not->toBeNull();
});

it('guests cannot create posts', function () {
    $this->post('/admin/posts', ['title' => 'x'])->assertRedirect('/admin/login');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./vendor/bin/pest tests/Feature/AdminPostsTest.php`
Expected: FAIL.

- [ ] **Step 3: Form request**

`app/Http/Requests/StorePostRequest.php`:

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePostRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->isOwner() ?? false; }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:200'],
            'slug' => ['nullable', 'string', 'max:220', Rule::unique('posts', 'slug')->ignore($this->route('post'))],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'body' => ['nullable', 'string'],
            'post_type' => ['required', Rule::in(['article', 'note', 'question'])],
            'status' => ['required', Rule::in(['draft', 'published', 'archived'])],
            'visibility' => ['required', Rule::in(['public', 'private'])],
            'featured' => ['boolean'],
            'cover_image' => ['nullable', 'string', 'max:500'],
            'meta_title' => ['nullable', 'string', 'max:200'],
            'meta_description' => ['nullable', 'string', 'max:300'],
            'tags' => ['array'],
            'tags.*' => ['string', 'max:50'],
            'topics' => ['array'],
            'topics.*' => ['string', 'max:50'],
        ];
    }
}
```

- [ ] **Step 4: Controller**

`app/Http/Controllers/Admin/PostController.php`:

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePostRequest;
use App\Models\{Post, Tag, Topic};
use Illuminate\Http\{RedirectResponse, Request};
use Inertia\{Inertia, Response};

class PostController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Post::latest()->with(['tags', 'topics']);

        if ($status = $request->query('status')) $query->where('status', $status);
        if ($type = $request->query('type')) $query->where('post_type', $type);
        if ($search = $request->query('q')) $query->where(fn ($q) => $q->where('title', 'like', "%{$search}%")->orWhere('excerpt', 'like', "%{$search}%"));

        return Inertia::render('Admin/Posts/Index', [
            'posts' => $query->paginate(15)->withQueryString()->through(fn ($p) => [
                'id' => $p->id, 'title' => $p->title, 'slug' => $p->slug, 'post_type' => $p->post_type,
                'status' => $p->status, 'visibility' => $p->visibility, 'featured' => $p->featured,
                'published_at' => $p->published_at?->format('Y-m-d'),
            ]),
            'filters' => $request->only(['status', 'type', 'q']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Posts/Edit', ['post' => null]);
    }

    public function store(StorePostRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['author_id'] = $request->user()->id;
        $data['slug'] = $data['slug'] ?: Post::makeSlug($data['title']);
        $tags = $data['tags'] ?? []; $topics = $data['topics'] ?? [];
        unset($data['tags'], $data['topics']);

        $post = Post::create($data);
        $this->syncRelations($post, $tags, $topics);

        return redirect()->route('admin.posts.edit', $post)->with('status', 'Post created.');
    }

    public function edit(Post $post): Response
    {
        $post->load(['tags', 'topics']);
        return Inertia::render('Admin/Posts/Edit', [
            'post' => [
                'id' => $post->id, 'title' => $post->title, 'slug' => $post->slug, 'excerpt' => $post->excerpt,
                'body' => $post->body, 'post_type' => $post->post_type, 'status' => $post->status,
                'visibility' => $post->visibility, 'featured' => $post->featured, 'cover_image' => $post->cover_image,
                'meta_title' => $post->meta_title, 'meta_description' => $post->meta_description,
                'reading_time' => $post->reading_time, 'published_at' => $post->published_at?->format('Y-m-d H:i'),
                'tags' => $post->tags->pluck('name'), 'topics' => $post->topics->pluck('name'),
                'preview_url' => "/admin/posts/{$post->id}/preview",
            ],
        ]);
    }

    public function update(StorePostRequest $request, Post $post): RedirectResponse
    {
        $data = $request->validated();
        $tags = $data['tags'] ?? []; $topics = $data['topics'] ?? [];
        unset($data['tags'], $data['topics']);
        if (empty($data['slug'])) $data['slug'] = Post::makeSlug($data['title']);

        $post->update($data);
        $this->syncRelations($post, $tags, $topics);

        return redirect()->route('admin.posts.edit', $post)->with('status', 'Post updated.');
    }

    public function destroy(Post $post): RedirectResponse
    {
        $post->delete();
        return redirect()->route('admin.posts.index')->with('status', 'Post deleted.');
    }

    public function preview(Post $post)
    {
        return redirect("/{$post->post_type === 'article' ? 'writing' : 'notes'}/{$post->slug}?preview=1");
    }

    private function syncRelations(Post $post, array $tags, array $topics): void
    {
        $tagIds = collect($tags)->filter()->map(fn ($name) =>
            Tag::firstOrCreate(['slug' => \Illuminate\Support\Str::slug($name)], ['name' => $name])->id)->all();
        $topicIds = collect($topics)->filter()->map(fn ($name) =>
            Topic::firstOrCreate(['slug' => \Illuminate\Support\Str::slug($name)], ['name' => $name])->id)->all();
        $post->tags()->sync($tagIds);
        $post->topics()->sync($topicIds);
    }
}
```

Routes inside the admin group:

```php
Route::get('posts', [\App\Http\Controllers\Admin\PostController::class, 'index'])->name('posts.index');
Route::get('posts/create', [\App\Http\Controllers\Admin\PostController::class, 'create'])->name('posts.create');
Route::post('posts', [\App\Http\Controllers\Admin\PostController::class, 'store'])->name('posts.store');
Route::get('posts/{post}/edit', [\App\Http\Controllers\Admin\PostController::class, 'edit'])->name('posts.edit');
Route::put('posts/{post}', [\App\Http\Controllers\Admin\PostController::class, 'update'])->name('posts.update');
Route::delete('posts/{post}', [\App\Http\Controllers\Admin\PostController::class, 'destroy'])->name('posts.destroy');
Route::get('posts/{post}/preview', [\App\Http\Controllers\Admin\PostController::class, 'preview'])->name('posts.preview');
```

- [ ] **Step 5: Index page UI**

`resources/js/Pages/Admin/Posts/Index.tsx`:

```tsx
import AdminLayout from '@/Layouts/AdminLayout';
import { Link, router } from '@inertiajs/react';
import { Button } from '@/Components/Button';
import { SearchInput } from '@/Components/SearchInput';
import { FilterBar } from '@/Components/FilterBar';
import { Badge } from '@/Components/Badge';

type PostRow = { id: number; title: string; slug: string; post_type: string; status: string; visibility: string; featured: boolean; published_at: string | null };
type Paginated = { data: PostRow[]; links: { url: string | null; label: string; active: boolean }[] };

export default function PostsIndex({ posts, filters }: { posts: Paginated; filters: { status?: string; type?: string; q?: string } }) {
    const setFilter = (key: string, value: string) =>
        router.get('/admin/posts', { ...filters, [key]: value || undefined }, { preserveState: true, preserveScroll: true });

    return (
        <AdminLayout title="Posts">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <Button href="/admin/posts/create">New post</Button>
                <div className="w-64"><SearchInput value={filters.q ?? ''} onChange={(v) => setFilter('q', v)} placeholder="Search posts" /></div>
            </div>
            <div className="mb-4 flex gap-6">
                <FilterBar options={[{ label: 'Articles', value: 'article' }, { label: 'Notes', value: 'note' }, { label: 'Questions', value: 'question' }]}
                    active={filters.type ?? ''} onSelect={(v) => setFilter('type', v)} />
                <FilterBar options={[{ label: 'Draft', value: 'draft' }, { label: 'Published', value: 'published' }, { label: 'Archived', value: 'archived' }]}
                    active={filters.status ?? ''} onSelect={(v) => setFilter('status', v)} />
            </div>
            <div className="overflow-x-auto rounded-md border border-hairline bg-white">
                <table className="w-full text-left text-sm">
                    <thead className="border-b border-hairline text-xs uppercase text-meta">
                        <tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Visibility</th><th className="px-4 py-3">Published</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr>
                    </thead>
                    <tbody>
                        {posts.data.map((p) => (
                            <tr key={p.id} className="border-b border-hairline last:border-0">
                                <td className="px-4 py-3 font-medium">{p.featured && '★ '}{p.title}</td>
                                <td className="px-4 py-3 text-meta">{p.post_type}</td>
                                <td className="px-4 py-3"><Badge>{p.status}</Badge></td>
                                <td className="px-4 py-3 text-meta">{p.visibility}</td>
                                <td className="px-4 py-3 text-meta">{p.published_at ?? '—'}</td>
                                <td className="px-4 py-3 text-right">
                                    <Link href={`/admin/posts/${p.id}/edit`} className="text-sm text-link hover:underline">Edit</Link>
                                </td>
                            </tr>
                        ))}
                        {posts.data.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-meta">No posts found.</td></tr>}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 flex flex-wrap gap-1">
                {posts.links.map((l, i) => l.url ? (
                    <Link key={i} href={l.url} preserveScroll className={`rounded-sm px-3 py-1 text-sm ${l.active ? 'bg-primary text-white' : 'bg-white border border-hairline'}`} dangerouslySetInnerHTML={{ __html: l.label }} />
                ) : <span key={i} className="px-3 py-1 text-sm text-meta" dangerouslySetInnerHTML={{ __html: l.label }} />)}
            </div>
        </AdminLayout>
    );
}
```

- [ ] **Step 6: Editor page UI with autosave + preview**

`resources/js/Pages/Admin/Posts/Edit.tsx`:

```tsx
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/Components/Button';
import { Prose } from '@/Components/Prose';
import { PreviewPane } from '@/Components/PreviewPane';

type PostData = {
    id?: number; title: string; slug: string; excerpt: string; body: string; post_type: string;
    status: string; visibility: string; featured: boolean; cover_image: string;
    meta_title: string; meta_description: string; tags: string[]; topics: string[];
    reading_time?: number; published_at?: string | null;
};

const empty: PostData = { title: '', slug: '', excerpt: '', body: '', post_type: 'article', status: 'draft', visibility: 'public', featured: false, cover_image: '', meta_title: '', meta_description: '', tags: [], topics: [] };

export default function PostEdit({ post }: { post: PostData | null }) {
    const { data, setData, put, post: store, processing, errors, transform } = useForm<PostData>(post ?? empty);
    const [preview, setPreview] = useState(false);
    const [savedAt, setSavedAt] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const save = () => {
        const opts = { preserveScroll: true, onSuccess: () => { setDirty(false); setSavedAt(new Date().toLocaleTimeString()); } };
        if (post?.id) put(`/admin/posts/${post.id}`, opts);
        else store('/admin/posts', { ...opts, onSuccess: () => setDirty(false) });
    };

    useEffect(() => {
        if (!dirty) return;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(save, 30000);
        return () => { if (timer.current) clearTimeout(timer.current); };
    }, [data, dirty]);

    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [dirty]);

    const update = (key: keyof PostData, value: any) => { setData(key, value); setDirty(true); };
    const field = 'mt-1 w-full rounded-md border border-hairline px-3 py-2 text-sm focus:border-primary';

    return (
        <AdminLayout title={post ? `Edit: ${post.title}` : 'New post'}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                    <Button variant={preview ? 'secondary' : 'primary'} onClick={() => setPreview(!preview)} type="button">
                        {preview ? 'Edit' : 'Preview'}
                    </Button>
                    <Button variant="secondary" onClick={save} type="button" disabled={processing || !dirty}>
                        {processing ? 'Saving…' : dirty ? 'Save' : 'Saved'}
                    </Button>
                    {post?.id && <Link href={`/admin/posts/${post.id}/preview`} className="inline-flex items-center rounded-md border border-hairline px-4 py-2 text-sm hover:bg-surface" target="_blank">Open page</Link>}
                </div>
                <p className="text-xs text-meta" aria-live="polite">
                    {dirty ? 'Unsaved changes' : savedAt ? `Saved ${savedAt}` : 'All changes saved'}
                </p>
            </div>

            {preview ? (
                <PreviewPane markdown={data.body} title={data.title} excerpt={data.excerpt} />
            ) : (
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-4">
                        <div>
                            <label className="text-sm font-medium">Title</label>
                            <input value={data.title} onChange={(e) => update('title', e.target.value)} className={field} />
                            {errors.title && <p className="text-sm text-red-700">{errors.title}</p>}
                        </div>
                        <div>
                            <label className="text-sm font-medium">Slug</label>
                            <input value={data.slug} onChange={(e) => update('slug', e.target.value)} className={field} placeholder="auto-generated from title" />
                            {errors.slug && <p className="text-sm text-red-700">{errors.slug}</p>}
                        </div>
                        <div>
                            <label className="text-sm font-medium">Excerpt</label>
                            <textarea value={data.excerpt} onChange={(e) => update('excerpt', e.target.value)} rows={2} className={field} />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Body (Markdown)</label>
                            <textarea value={data.body} onChange={(e) => update('body', e.target.value)} rows={20}
                                className={`${field} font-mono text-sm`} />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Type</label>
                            <select value={data.post_type} onChange={(e) => update('post_type', e.target.value)} className={field}>
                                <option value="article">Article</option><option value="note">Note</option><option value="question">Question</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Status</label>
                            <select value={data.status} onChange={(e) => update('status', e.target.value)} className={field}>
                                <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Visibility</label>
                            <select value={data.visibility} onChange={(e) => update('visibility', e.target.value)} className={field}>
                                <option value="public">Public</option><option value="private">Private</option>
                            </select>
                        </div>
                        <label className="flex items-center gap-2 text-sm font-medium">
                            <input type="checkbox" checked={data.featured} onChange={(e) => update('featured', e.target.checked)} />
                            Featured
                        </label>
                        <div>
                            <label className="text-sm font-medium">Tags (comma-separated)</label>
                            <input value={data.tags.join(', ')} onChange={(e) => update('tags', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} className={field} />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Topics (comma-separated)</label>
                            <input value={data.topics.join(', ')} onChange={(e) => update('topics', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} className={field} />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Meta title</label>
                            <input value={data.meta_title} onChange={(e) => update('meta_title', e.target.value)} className={field} />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Meta description</label>
                            <textarea value={data.meta_description} onChange={(e) => update('meta_description', e.target.value)} rows={3} className={field} />
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
```

Create `resources/js/Components/PreviewPane.tsx` (server-side preview via existing markdown endpoint is preferred; simplest reliable approach: render client-side using a small preview route. Use Inertia partial: fetch `/admin/preview-markdown` via router):

```tsx
import { Prose } from './Prose';

export function PreviewPane({ markdown, title, excerpt }: { markdown: string; title: string; excerpt: string }) {
    const [html, setHtml] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const id = setTimeout(async () => {
            try {
                const res = await fetch('/admin/preview-markdown', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-XSRF-TOKEN': decodeURIComponent((document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '')) },
                    body: JSON.stringify({ markdown }),
                });
                if (!res.ok) throw new Error('Preview failed');
                const data = await res.json();
                setHtml(data.html);
                setError(null);
            } catch (e: any) { setError(e.message); }
        }, 400);
        return () => clearTimeout(id);
    }, [markdown]);

    return (
        <article className="rounded-md border border-hairline bg-white p-8">
            {title && <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>}
            {excerpt && <p className="mt-2 text-meta">{excerpt}</p>}
            <hr className="my-6 border-hairline" />
            {error && <p className="text-sm text-red-700">{error}</p>}
            <Prose html={html} />
        </article>
    );
}

import { useState, useEffect } from 'react';
```

(Fix import order: put `import { useState, useEffect } from 'react';` at top when implementing.)

Add preview endpoint in routes (admin group):

```php
Route::post('preview-markdown', function (\Illuminate\Http\Request $request) {
    $data = $request->validate(['markdown' => ['nullable', 'string', 'max:200000']]);
    return response()->json(['html' => app(\App\Services\MarkdownService::class)->render($data['markdown'] ?? '')]);
})->name('preview-markdown');
```

- [ ] **Step 7: Run tests**

Run: `./vendor/bin/pest tests/Feature/AdminPostsTest.php`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: admin posts CRUD with autosave editor and preview"
```

---

### Task 8: Admin projects + collected items management

**Files:**
- Create: `app/Http/Controllers/Admin/ProjectController.php`, `app/Http/Controllers/Admin/CollectedItemController.php`
- Create: `app/Http/Requests/StoreProjectRequest.php`, `StoreCollectedItemRequest.php`
- Create: `resources/js/Pages/Admin/Projects/Index.tsx`, `Edit.tsx`
- Create: `resources/js/Pages/Admin/Collected/Index.tsx`, `Edit.tsx`
- Modify: `routes/web.php`
- Test: `tests/Feature/AdminProjectsTest.php`, `tests/Feature/AdminCollectedTest.php`

**Interfaces:**
- Produces: routes `admin.projects.{index,create,store,edit,update,destroy}` and `admin.collected.{index,create,store,edit,update,destroy}` with same shapes as posts; Project validation: `name required max:200`, `status in:idea,exploring,building,active,paused,completed`, `repository_url/live_url nullable url`; CollectedItem validation: `title required`, `item_type in:book,article,video,podcast,music,tool,quote,website,other`, `url nullable url`, `creator nullable max:200`, `annotation nullable`.

- [ ] **Step 1: Write failing tests**

`tests/Feature/AdminProjectsTest.php`:

```php
<?php

use App\Models\{Project, User};

beforeEach(fn () => $this->owner = User::factory()->create(['role' => 'owner']));

it('creates a project', function () {
    $this->actingAs($this->owner)->post('/admin/projects', [
        'name' => 'Neural Notes', 'summary' => 'A tool', 'status' => 'building', 'visibility' => 'public',
        'repository_url' => 'https://github.com/x/y',
    ])->assertRedirect();
    expect(Project::where('slug', 'neural-notes')->exists())->toBeTrue();
});

it('validates project status', function () {
    $this->actingAs($this->owner)->post('/admin/projects', ['name' => 'X', 'status' => 'nope'])
        ->assertSessionHasErrors('status');
});

it('updates and deletes projects', function () {
    $p = Project::factory()->create();
    $this->actingAs($this->owner)->put("/admin/projects/{$p->id}", ['name' => 'Renamed', 'status' => 'active', 'visibility' => 'public'])->assertRedirect();
    expect($p->fresh()->name)->toBe('Renamed');
    $this->actingAs($this->owner)->delete("/admin/projects/{$p->id}")->assertRedirect();
    expect(Project::withTrashed()->find($p->id)->deleted_at)->not->toBeNull();
});

it('lists projects for owner', function () {
    $this->actingAs($this->owner)->get('/admin/projects')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Admin/Projects/Index'));
});
```

`tests/Feature/AdminCollectedTest.php`:

```php
<?php

use App\Models\{CollectedItem, User};

beforeEach(fn () => $this->owner = User::factory()->create(['role' => 'owner']));

it('creates a collected item', function () {
    $this->actingAs($this->owner)->post('/admin/collected', [
        'title' => 'Thinking in Systems', 'item_type' => 'book', 'creator' => 'Donella Meadows',
        'url' => 'https://example.com', 'annotation' => 'Why it matters', 'visibility' => 'public',
    ])->assertRedirect();
    expect(CollectedItem::where('title', 'Thinking in Systems')->exists())->toBeTrue();
});

it('validates item type', function () {
    $this->actingAs($this->owner)->post('/admin/collected', ['title' => 'X', 'item_type' => 'bogus'])
        ->assertSessionHasErrors('item_type');
});

it('deletes a collected item', function () {
    $item = CollectedItem::factory()->create();
    $this->actingAs($this->owner)->delete("/admin/collected/{$item->id}")->assertRedirect();
    expect(CollectedItem::find($item->id))->toBeNull();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./vendor/bin/pest tests/Feature/AdminProjectsTest.php tests/Feature/AdminCollectedTest.php`
Expected: FAIL.

- [ ] **Step 3: Implement requests + controllers**

`app/Http/Requests/StoreProjectRequest.php`:

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->isOwner() ?? false; }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:200'],
            'slug' => ['nullable', 'string', 'max:220', Rule::unique('projects', 'slug')->ignore($this->route('project'))],
            'summary' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string'],
            'status' => ['required', Rule::in(['idea', 'exploring', 'building', 'active', 'paused', 'completed'])],
            'visibility' => ['required', Rule::in(['public', 'private'])],
            'cover_image' => ['nullable', 'string', 'max:500'],
            'repository_url' => ['nullable', 'url', 'max:500'],
            'live_url' => ['nullable', 'url', 'max:500'],
            'started_at' => ['nullable', 'date'],
            'completed_at' => ['nullable', 'date', 'after_or_equal:started_at'],
            'featured' => ['boolean'],
            'tags' => ['array'], 'tags.*' => ['string', 'max:50'],
        ];
    }
}
```

`app/Http/Controllers/Admin/ProjectController.php`:

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProjectRequest;
use App\Models\{Project, Tag};
use Illuminate\Http\{RedirectResponse, Request};
use Inertia\{Inertia, Response};

class ProjectController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Project::latest()->with('tags');
        if ($status = $request->query('status')) $query->where('status', $status);

        return Inertia::render('Admin/Projects/Index', [
            'projects' => $query->paginate(15)->withQueryString()->through(fn ($p) => [
                'id' => $p->id, 'name' => $p->name, 'slug' => $p->slug, 'status' => $p->status,
                'visibility' => $p->visibility, 'featured' => $p->featured,
            ]),
            'filters' => $request->only(['status']),
        ]);
    }

    public function create(): Response { return Inertia::render('Admin/Projects/Edit', ['project' => null]); }

    public function store(StoreProjectRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $tags = $data['tags'] ?? [];
        unset($data['tags']);
        $data['slug'] = $data['slug'] ?: Project::makeSlug($data['name']);
        $project = Project::create($data);
        $this->syncTags($project, $tags);
        return redirect()->route('admin.projects.edit', $project)->with('status', 'Project created.');
    }

    public function edit(Project $project): Response
    {
        $project->load('tags');
        return Inertia::render('Admin/Projects/Edit', [
            'project' => [
                'id' => $project->id, 'name' => $project->name, 'slug' => $project->slug,
                'summary' => $project->summary, 'description' => $project->description,
                'status' => $project->status, 'visibility' => $project->visibility,
                'cover_image' => $project->cover_image, 'repository_url' => $project->repository_url,
                'live_url' => $project->live_url,
                'started_at' => $project->started_at?->format('Y-m-d'),
                'completed_at' => $project->completed_at?->format('Y-m-d'),
                'featured' => $project->featured, 'tags' => $project->tags->pluck('name'),
            ],
        ]);
    }

    public function update(StoreProjectRequest $request, Project $project): RedirectResponse
    {
        $data = $request->validated();
        $tags = $data['tags'] ?? [];
        unset($data['tags']);
        if (empty($data['slug'])) $data['slug'] = Project::makeSlug($data['name']);
        $project->update($data);
        $this->syncTags($project, $tags);
        return redirect()->route('admin.projects.edit', $project)->with('status', 'Project updated.');
    }

    public function destroy(Project $project): RedirectResponse
    {
        $project->delete();
        return redirect()->route('admin.projects.index')->with('status', 'Project deleted.');
    }

    private function syncTags(Project $project, array $tags): void
    {
        $ids = collect($tags)->filter()->map(fn ($n) =>
            Tag::firstOrCreate(['slug' => \Illuminate\Support\Str::slug($n)], ['name' => $n])->id)->all();
        $project->tags()->sync($ids);
    }
}
```

`app/Http/Requests/StoreCollectedItemRequest.php`:

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCollectedItemRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->isOwner() ?? false; }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:300'],
            'url' => ['nullable', 'url', 'max:1000'],
            'creator' => ['nullable', 'string', 'max:200'],
            'item_type' => ['required', Rule::in(['book', 'article', 'video', 'podcast', 'music', 'tool', 'quote', 'website', 'other'])],
            'annotation' => ['nullable', 'string', 'max:5000'],
            'visibility' => ['required', Rule::in(['public', 'private'])],
            'tags' => ['array'], 'tags.*' => ['string', 'max:50'],
        ];
    }
}
```

`app/Http/Controllers/Admin/CollectedItemController.php` — mirror ProjectController (render `Admin/Collected/Index` and `Admin/Collected/Edit`, validate via `StoreCollectedItemRequest`, sync tags the same way; index columns: title, type, creator, visibility).

- [ ] **Step 4: Routes**

Inside admin group:

```php
Route::get('projects', [\App\Http\Controllers\Admin\ProjectController::class, 'index'])->name('projects.index');
Route::get('projects/create', [\App\Http\Controllers\Admin\ProjectController::class, 'create'])->name('projects.create');
Route::post('projects', [\App\Http\Controllers\Admin\ProjectController::class, 'store'])->name('projects.store');
Route::get('projects/{project}/edit', [\App\Http\Controllers\Admin\ProjectController::class, 'edit'])->name('projects.edit');
Route::put('projects/{project}', [\App\Http\Controllers\Admin\ProjectController::class, 'update'])->name('projects.update');
Route::delete('projects/{project}', [\App\Http\Controllers\Admin\ProjectController::class, 'destroy'])->name('projects.destroy');

Route::get('collected', [\App\Http\Controllers\Admin\CollectedItemController::class, 'index'])->name('collected.index');
Route::get('collected/create', [\App\Http\Controllers\Admin\CollectedItemController::class, 'create'])->name('collected.create');
Route::post('collected', [\App\Http\Controllers\Admin\CollectedItemController::class, 'store'])->name('collected.store');
Route::get('collected/{collectedItem}/edit', [\App\Http\Controllers\Admin\CollectedItemController::class, 'edit'])->name('collected.edit');
Route::put('collected/{collectedItem}', [\App\Http\Controllers\Admin\CollectedItemController::class, 'update'])->name('collected.update');
Route::delete('collected/{collectedItem}', [\App\Http\Controllers\Admin\CollectedItemController::class, 'destroy'])->name('collected.destroy');
```

- [ ] **Step 5: UI pages**

Create `resources/js/Pages/Admin/Projects/Index.tsx`, `Edit.tsx`, `Collected/Index.tsx`, `Edit.tsx` following the exact patterns from Task 7 (Index = table + status FilterBar + New button; Edit = form fields matching validation rules, comma-separated tags, Save/Delete with confirm dialog using `ConfirmDialog`). Reuse `Button`, `Badge`, `FilterBar` components. Project Edit selects use the six status options; Collected Edit uses a select of the nine item types and a quick-add-first layout (title/url/type at top).

- [ ] **Step 6: Run tests**

Run: `./vendor/bin/pest tests/Feature/AdminProjectsTest.php tests/Feature/AdminCollectedTest.php`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: admin projects and collected items management"
```

---

### Task 9: Admin site content managers (Now, About, Social, Tags & Topics, Settings)

**Files:**
- Create: `app/Http/Controllers/Admin/NowController.php`, `AboutController.php`, `SocialLinkController.php`, `TaxonomyController.php`, `SettingsController.php`
- Create: `resources/js/Pages/Admin/Now.tsx`, `About.tsx`, `Social.tsx`, `Tags.tsx`, `Settings.tsx`
- Modify: `routes/web.php`
- Test: `tests/Feature/AdminSiteContentTest.php`

**Interfaces:**
- Produces:
  - `GET/PUT /admin/now` — props `{ sections: [{id,key,label,body,visible,sort_order}], updates: [{id,now_section_id,text,occurred_at,visible}], last_updated_at }`; PUT accepts `{ sections: [...], updates: [...] }` (full replace of visible fields); also `POST /admin/now/touch` sets `last_updated_at`.
  - `GET/PUT /admin/about` — props `{ sections: [{id,key,title,body,visible,sort_order}] }`.
  - `GET/POST/PUT/DELETE /admin/social` — `{ social_links: [{id,platform,url,label,sort_order,visible}] }`; PUT `/admin/social/{socialLink}`; DELETE.
  - `GET/POST/DELETE /admin/tags` — `{ tags: [{id,name,post_count}], topics: [{id,name,post_count}] }`; POST accepts `{ kind: 'tag'|'topic', name }`; DELETE `/{kind}/{id}`.
  - `GET/PUT /admin/settings` — `{ settings: { site_title, tagline, footer_text } }`; `DELETE /admin/settings/demo-content` removes all `is_demo = true` rows and returns count.

- [ ] **Step 1: Write failing tests**

`tests/Feature/AdminSiteContentTest.php`:

```php
<?php

use App\Models\{AboutSection, CollectedItem, NowSection, Post, Project, Setting, SocialLink, Tag, User};

beforeEach(fn () => $this->owner = User::factory()->create(['role' => 'owner']));

it('updates now page sections', function () {
    $section = NowSection::create(['key' => 'reading', 'label' => 'Reading', 'body' => 'Old', 'sort_order' => 3]);
    $this->actingAs($this->owner)->put('/admin/now', [
        'sections' => [['id' => $section->id, 'key' => 'reading', 'label' => 'Reading', 'body' => 'New body', 'visible' => true, 'sort_order' => 3]],
        'updates' => [],
    ])->assertRedirect();
    expect($section->fresh()->body)->toBe('New body');
});

it('updates about sections', function () {
    $s = AboutSection::create(['key' => 'intro', 'title' => 'Intro', 'body' => 'Hi', 'sort_order' => 0]);
    $this->actingAs($this->owner)->put('/admin/about', [
        'sections' => [['id' => $s->id, 'key' => 'intro', 'title' => 'Hello', 'body' => 'There', 'visible' => true, 'sort_order' => 0]],
    ])->assertRedirect();
    expect($s->fresh()->title)->toBe('Hello');
});

it('creates and deletes social links', function () {
    $this->actingAs($this->owner)->post('/admin/social', ['platform' => 'GitHub', 'url' => 'https://github.com/x', 'label' => 'GitHub', 'visible' => true])
        ->assertRedirect();
    $link = SocialLink::first();
    expect($link->url)->toBe('https://github.com/x');
    $this->actingAs($this->owner)->delete("/admin/social/{$link->id}")->assertRedirect();
    expect(SocialLink::count())->toBe(0);
});

it('creates tags and topics', function () {
    $this->actingAs($this->owner)->post('/admin/tags', ['kind' => 'tag', 'name' => 'Neurotech'])->assertRedirect();
    $this->actingAs($this->owner)->post('/admin/tags', ['kind' => 'topic', 'name' => 'BCI'])->assertRedirect();
    expect(Tag::where('slug', 'neurotech')->exists())->toBeTrue();
    expect(\App\Models\Topic::where('slug', 'bci')->exists())->toBeTrue();
});

it('saves settings', function () {
    $this->actingAs($this->owner)->put('/admin/settings', ['settings' => ['site_title' => 'Timadey', 'tagline' => 'Notes', 'footer_text' => '©']])->assertRedirect();
    expect(Setting::get('site_title'))->toBe('Timadey');
});

it('deletes demo content from settings', function () {
    $author = User::factory()->create();
    Post::factory()->create(['author_id' => $author->id, 'is_demo' => true]);
    Post::factory()->create(['author_id' => $author->id, 'is_demo' => false]);
    Project::factory()->create(['is_demo' => true]);
    CollectedItem::factory()->create(['is_demo' => true]);

    $this->actingAs($this->owner)->delete('/admin/settings/demo-content')->assertRedirect();
    expect(Post::count())->toBe(1)->and(Project::count())->toBe(0)->and(CollectedItem::count())->toBe(0);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./vendor/bin/pest tests/Feature/AdminSiteContentTest.php`
Expected: FAIL.

- [ ] **Step 3: Implement controllers**

`app/Http/Controllers/Admin/NowController.php`:

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\{NowSection, NowUpdate};
use Illuminate\Http\{RedirectResponse, Request};
use Illuminate\Support\Facades\DB;
use Inertia\{Inertia, Response};

class NowController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('Admin/Now', [
            'sections' => NowSection::orderBy('sort_order')->get(['id', 'key', 'label', 'body', 'visible', 'sort_order'])
                ->map(fn ($s) => $s->toArray() + ['updates' => $s->updates()->orderByDesc('occurred_at')->get(['id', 'text', 'occurred_at', 'visible'])->map(fn ($u) => $u->only(['id', 'text', 'occurred_at', 'visible']))]),
            'lastUpdatedAt' => NowSection::max('updated_at')?->toIso8601String(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'sections' => ['array'],
            'sections.*.id' => ['required', 'exists:now_sections,id'],
            'sections.*.label' => ['required', 'string', 'max:100'],
            'sections.*.body' => ['nullable', 'string', 'max:5000'],
            'sections.*.visible' => ['boolean'],
            'sections.*.sort_order' => ['integer', 'min:0'],
            'updates' => ['array'],
            'updates.*.now_section_id' => ['required', 'exists:now_sections,id'],
            'updates.*.text' => ['required', 'string', 'max:500'],
            'updates.*.occurred_at' => ['nullable', 'date'],
            'updates.*.visible' => ['boolean'],
        ]);

        DB::transaction(function () use ($data) {
            foreach ($data['sections'] ?? [] as $i => $s) {
                NowSection::whereKey($s['id'])->update([
                    'label' => $s['label'], 'body' => $s['body'] ?? null,
                    'visible' => (bool) ($s['visible'] ?? true), 'sort_order' => $s['sort_order'] ?? $i,
                ]);
            }
            NowUpdate::whereNotIn('id', collect($data['updates'] ?? [])->pluck('id')->filter()->values()->all())->delete();
            foreach ($data['updates'] ?? [] as $u) {
                $payload = [
                    'now_section_id' => $u['now_section_id'], 'text' => $u['text'],
                    'occurred_at' => $u['occurred_at'] ?? now(), 'visible' => (bool) ($u['visible'] ?? true),
                ];
                if (!empty($u['id'])) NowUpdate::whereKey($u['id'])->update($payload);
                else NowUpdate::create($payload);
            }
        });

        return redirect()->route('admin.now.edit')->with('status', 'Now page updated.');
    }
}
```

Note: include `'updates' => ['array'], 'updates.*.id' => ['nullable', 'exists:now_updates,id']` in validation.

`app/Http/Controllers/Admin/AboutController.php`:

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AboutSection;
use Illuminate\Http\{RedirectResponse, Request};
use Inertia\{Inertia, Response};

class AboutController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('Admin/About', [
            'sections' => AboutSection::orderBy('sort_order')->get(['id', 'key', 'title', 'body', 'visible', 'sort_order']),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'sections' => ['array'],
            'sections.*.id' => ['required', 'exists:about_sections,id'],
            'sections.*.title' => ['required', 'string', 'max:150'],
            'sections.*.body' => ['nullable', 'string', 'max:20000'],
            'sections.*.visible' => ['boolean'],
            'sections.*.sort_order' => ['integer', 'min:0'],
        ]);

        foreach ($data['sections'] ?? [] as $i => $s) {
            AboutSection::whereKey($s['id'])->update([
                'title' => $s['title'], 'body' => $s['body'] ?? null,
                'visible' => (bool) ($s['visible'] ?? true), 'sort_order' => $s['sort_order'] ?? $i,
            ]);
        }

        return redirect()->route('admin.about.edit')->with('status', 'About page updated.');
    }
}
```

`app/Http/Controllers/Admin/SocialLinkController.php`:

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SocialLink;
use Illuminate\Http\{RedirectResponse, Request};
use Inertia\{Inertia, Response};

class SocialLinkController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Social', [
            'social_links' => SocialLink::orderBy('sort_order')->get(['id', 'platform', 'url', 'label', 'sort_order', 'visible']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'platform' => ['required', 'string', 'max:50'],
            'url' => ['required', 'url', 'max:500'],
            'label' => ['nullable', 'string', 'max:50'],
            'visible' => ['boolean'],
        ]);
        $data['sort_order'] = (int) SocialLink::max('sort_order') + 1;
        SocialLink::create($data);
        return redirect()->route('admin.social.index')->with('status', 'Link added.');
    }

    public function update(Request $request, SocialLink $socialLink): RedirectResponse
    {
        $data = $request->validate([
            'platform' => ['required', 'string', 'max:50'],
            'url' => ['required', 'url', 'max:500'],
            'label' => ['nullable', 'string', 'max:50'],
            'visible' => ['boolean'],
            'sort_order' => ['integer', 'min:0'],
        ]);
        $socialLink->update($data);
        return redirect()->route('admin.social.index')->with('status', 'Link updated.');
    }

    public function destroy(SocialLink $socialLink): RedirectResponse
    {
        $socialLink->delete();
        return redirect()->route('admin.social.index')->with('status', 'Link removed.');
    }
}
```

`app/Http/Controllers/Admin/TaxonomyController.php`:

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\{Tag, Topic};
use Illuminate\Http\{RedirectResponse, Request};
use Illuminate\Validation\Rule;
use Inertia\{Inertia, Response};

class TaxonomyController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Tags', [
            'tags' => Tag::withCount('posts')->orderBy('name')->get(['id', 'name', 'slug']),
            'topics' => Topic::withCount('posts')->orderBy('name')->get(['id', 'name', 'slug']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'kind' => ['required', Rule::in(['tag', 'topic'])],
            'name' => ['required', 'string', 'max:50'],
        ]);
        $model = $data['kind'] === 'tag' ? new Tag() : new Topic();
        $model->name = $data['name'];
        $model->slug = \Illuminate\Support\Str::slug($data['name']);
        $model->save();
        return redirect()->route('admin.tags.index')->with('status', ucfirst($data['kind']) . ' created.');
    }

    public function destroy(Request $request, string $kind, int $id): RedirectResponse
    {
        abort_unless(in_array($kind, ['tag', 'topic']), 404);
        $model = $kind === 'tag' ? Tag::findOrFail($id) : Topic::findOrFail($id);
        $model->delete();
        return redirect()->route('admin.tags.index')->with('status', ucfirst($kind) . ' deleted.');
    }
}
```

`app/Http/Controllers/Admin/SettingsController.php`:

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\{CollectedItem, Post, Project, Setting};
use Illuminate\Http\{RedirectResponse, Request};
use Inertia\{Inertia, Response};

class SettingsController extends Controller
{
    private const KEYS = ['site_title', 'tagline', 'footer_text'];

    public function edit(): Response
    {
        $settings = collect(self::KEYS)->mapWithKeys(fn ($k) => [$k => Setting::get($k, '')])->all();
        return Inertia::render('Admin/Settings', ['settings' => $settings]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'settings' => ['array'],
            'settings.site_title' => ['required', 'string', 'max:100'],
            'settings.tagline' => ['nullable', 'string', 'max:200'],
            'settings.footer_text' => ['nullable', 'string', 'max:300'],
        ]);
        foreach ($data['settings'] as $key => $value) Setting::set($key, $value);
        return redirect()->route('admin.settings.edit')->with('status', 'Settings saved.');
    }

    public function destroyDemo(): RedirectResponse
    {
        $count = Post::where('is_demo', true)->delete()
            + Project::where('is_demo', true)->delete()
            + CollectedItem::where('is_demo', true)->delete();

        return redirect()->route('admin.settings.edit')->with('status', "Removed {$count} demo items.");
    }
}
```

- [ ] **Step 4: Routes**

```php
Route::get('now', [\App\Http\Controllers\Admin\NowController::class, 'edit'])->name('now.edit');
Route::put('now', [\App\Http\Controllers\Admin\NowController::class, 'update'])->name('now.update');
Route::get('about', [\App\Http\Controllers\Admin\AboutController::class, 'edit'])->name('about.edit');
Route::put('about', [\App\Http\Controllers\Admin\AboutController::class, 'update'])->name('about.update');
Route::get('social', [\App\Http\Controllers\Admin\SocialLinkController::class, 'index'])->name('social.index');
Route::post('social', [\App\Http\Controllers\Admin\SocialLinkController::class, 'store'])->name('social.store');
Route::put('social/{socialLink}', [\App\Http\Controllers\Admin\SocialLinkController::class, 'update'])->name('social.update');
Route::delete('social/{socialLink}', [\App\Http\Controllers\Admin\SocialLinkController::class, 'destroy'])->name('social.destroy');
Route::get('tags', [\App\Http\Controllers\Admin\TaxonomyController::class, 'index'])->name('tags.index');
Route::post('tags', [\App\Http\Controllers\Admin\TaxonomyController::class, 'store'])->name('tags.store');
Route::delete('tags/{kind}/{id}', [\App\Http\Controllers\Admin\TaxonomyController::class, 'destroy'])->name('tags.destroy');
Route::get('settings', [\App\Http\Controllers\Admin\SettingsController::class, 'edit'])->name('settings.edit');
Route::put('settings', [\App\Http\Controllers\Admin\SettingsController::class, 'update'])->name('settings.update');
Route::delete('settings/demo-content', [\App\Http\Controllers\Admin\SettingsController::class, 'destroyDemo'])->name('settings.demo');
```

- [ ] **Step 5: UI pages**

Create the five pages under `resources/js/Pages/Admin/`:

- `Now.tsx` — list sections with visibility checkboxes, editable body textareas, per-section updates list with add/remove row buttons, Save button (`router.put('/admin/now', { sections, updates })`).
- `About.tsx` — same pattern (title/body/visible per section, Save via `router.put('/admin/about', { sections })`).
- `Social.tsx` — table of links with inline edit (platform, url, label, visible toggle) + add form; save via `router.post`/`router.put`/`router.delete`.
- `Tags.tsx` — two columns (Tags, Topics), each with add input + rows with delete buttons (`router.delete(\`/admin/tags/tag/${id}\`)`).
- `Settings.tsx` — site_title/tagline/footer_text inputs (`router.put('/admin/settings', { settings })`) + Danger zone with `ConfirmDialog` triggering `router.delete('/admin/settings/demo-content')` labelled "Remove all demo content".

Use `useForm`/`router` from `@inertiajs/react`, existing `Button`, flash `status` from `usePage().props.flash` shown in a small banner component (create `resources/js/Components/Flash.tsx` reading `usePage().props` `status`).

- [ ] **Step 6: Run tests**

Run: `./vendor/bin/pest tests/Feature/AdminSiteContentTest.php`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: admin managers for now, about, social links, tags, settings"
```

---

### Task 10: Public Home page

**Files:**
- Create: `app/Http/Controllers/HomeController.php`
- Create: `app/Services/FeedService.php`
- Create: `resources/js/Pages/Home.tsx` (full version)
- Modify: `routes/web.php`
- Test: `tests/Feature/HomeTest.php`

**Interfaces:**
- Produces: Home Inertia props: `{ intro: string, statement: string, feed: { id, type, label, title, message, url, date, tags: string[] }[], featuredPosts: [{slug,title,excerpt,excerpt_date,reading_time,topics}], projects: [{slug,name,summary,status}], now: { sections: [{key,label,body}], last_updated_at } | null, social_links: [{platform,url,label}] }` — feed items ordered by date desc, mixed types (`article`, `note`, `project`, `collected`).

- [ ] **Step 1: Write failing test**

`tests/Feature/HomeTest.php`:

```php
<?php

use App\Models\{Post, Project, User};

it('renders home with published content only', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'article', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'title' => 'Visible Article']);
    Post::factory()->create(['status' => 'draft', 'author_id' => $author->id, 'title' => 'Hidden Draft']);

    $this->get('/')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Home')
            ->has('feed')
            ->where('feed.0.title', 'Visible Article')
            ->missing('feed.title'));
});

it('shows featured writing', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'article', 'status' => 'published', 'featured' => true, 'published_at' => now(), 'author_id' => $author->id]);

    $this->get('/')->assertInertia(fn ($page) => $page->has('featuredPosts', 1));
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./vendor/bin/pest tests/Feature/HomeTest.php`
Expected: FAIL.

- [ ] **Step 3: FeedService**

`app/Services/FeedService.php`:

```php
<?php

namespace App\Services;

use App\Models\{CollectedItem, Post, Project};

class FeedService
{
    public function recent(int $limit = 12): array
    {
        $items = [];

        foreach (Post::publiclyVisible()->latest('published_at')->limit($limit)->get() as $post) {
            $items[] = [
                'id' => 'post-' . $post->id,
                'type' => $post->post_type,
                'label' => match ($post->post_type) {
                    'article' => 'Wrote', 'note' => 'Noted', 'question' => 'Asked', default => 'Posted',
                },
                'title' => $post->title,
                'message' => $post->excerpt,
                'url' => '/' . ($post->post_type === 'article' ? 'writing' : 'notes') . '/' . $post->slug,
                'date' => $post->published_at?->toIso8601String(),
                'tags' => $post->tags->pluck('name')->all(),
            ];
        }

        foreach (Project::publiclyVisible()->latest('updated_at')->limit($limit)->get() as $project) {
            $items[] = [
                'id' => 'project-' . $project->id,
                'type' => 'project',
                'label' => 'Building',
                'title' => $project->name,
                'message' => $project->summary,
                'url' => '/projects/' . $project->slug,
                'date' => $project->updated_at->toIso8601String(),
                'tags' => $project->tags->pluck('name')->all(),
            ];
        }

        foreach (CollectedItem::publiclyVisible()->latest('created_at')->limit($limit)->get() as $item) {
            $items[] = [
                'id' => 'collected-' . $item->id,
                'type' => 'collected',
                'label' => 'Collected',
                'title' => $item->title,
                'message' => $item->annotation,
                'url' => $item->url ?: '/collected',
                'date' => $item->created_at->toIso8601String(),
                'tags' => $item->tags->pluck('name')->all(),
            ];
        }

        usort($items, fn ($a, $b) => strtotime($b['date']) <=> strtotime($a['date']));

        return array_slice($items, 0, $limit);
    }
}
```

- [ ] **Step 4: HomeController + route**

`app/Http/Controllers/HomeController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\{Post, Project, Setting, SocialLink};
use App\Services\FeedService;
use Inertia\{Inertia, Response};

class HomeController extends Controller
{
    public function __invoke(FeedService $feed): Response
    {
        return Inertia::render('Home', [
            'intro' => Setting::get('home_intro', 'Welcome to my corner of the internet — a place for writing, projects, and things I am thinking about.'),
            'statement' => Setting::get('home_statement', 'Currently exploring how technology, product thinking, and ideas fit together.'),
            'feed' => $feed->recent(),
            'featuredPosts' => Post::publiclyVisible()->ofType('article')->where('featured', true)
                ->latest('published_at')->limit(3)->get()
                ->map(fn ($p) => $p->only(['slug', 'title', 'excerpt', 'reading_time']) + ['date' => $p->published_at?->format('M j, Y')]),
            'projects' => Project::publiclyVisible()->where('featured', true)->limit(3)->get()
                ->map(fn ($p) => $p->only(['slug', 'name', 'summary', 'status'])),
            'now' => $this->nowSnapshot(),
            'social_links' => SocialLink::where('visible', true)->orderBy('sort_order')->get(['platform', 'url', 'label']),
        ]);
    }

    private function nowSnapshot(): ?array
    {
        $sections = \App\Models\NowSection::where('visible', true)->orderBy('sort_order')
            ->with(['updates' => fn ($q) => $q->where('visible', true)->latest('occurred_at')->limit(1)])
            ->get()
            ->filter(fn ($s) => $s->body || $s->updates->isNotEmpty())
            ->values();

        if ($sections->isEmpty()) return null;

        return [
            'sections' => $sections->map(fn ($s) => [
                'key' => $s->key, 'label' => $s->label, 'body' => $s->body,
                'update' => $s->updates->first()?->text,
            ]),
            'last_updated_at' => $sections->max(fn ($s) => $s->updated_at->toIso8601String()),
        ];
    }
}
```

Home route: `Route::get('/', \App\Http\ControllersHomeController::class);`

- [ ] **Step 5: Home page UI**

`resources/js/Pages/Home.tsx`:

```tsx
import PublicLayout from '@/Layouts/PublicLayout';
import { Link } from '@inertiajs/react';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { MetaLine } from '@/Components/MetaLine';
import { Badge } from '@/Components/Badge';
import { EmptyState } from '@/Components/EmptyState';

type FeedItem = { id: string; type: string; label: string; title: string; message: string | null; url: string; date: string; tags: string[] };

export default function Home({ intro, statement, feed, featuredPosts, projects, now, social_links }: any) {
    return (
        <PublicLayout>
            <section className="mx-auto max-w-5xl px-6 pt-14 pb-10">
                <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">Hey, I'm Timadey.</h1>
                <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink">{intro}</p>
                <p className="mt-3 max-w-2xl text-base text-meta">{statement}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                    <Link href="/ask" className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-white hover:opacity-80">
                        <MessageCircle className="h-4 w-4" /> Ask Timadey
                    </Link>
                    <Link href="/writing" className="inline-flex items-center gap-2 rounded-md border border-hairline px-5 py-2.5 text-sm font-medium hover:bg-surface">
                        Read the writing <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>

            <section className="mx-auto max-w-5xl border-t border-hairline px-6 py-10" aria-labelledby="activity-heading">
                <h2 id="activity-heading" className="text-sm font-semibold uppercase tracking-wider text-meta">Recent activity</h2>
                <ul className="mt-5 divide-y divide-hairline">
                    {feed.map((item: FeedItem) => (
                        <li key={item.id} className="py-4">
                            <div className="flex flex-wrap items-baseline gap-x-3">
                                <span className="text-xs font-semibold uppercase tracking-wide text-meta">{item.label}</span>
                                <MetaLine date={new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} />
                            </div>
                            <Link href={item.url} className="mt-1 block text-lg font-medium hover:text-link">{item.title}</Link>
                            {item.message && <p className="mt-1 max-w-2xl text-sm text-meta line-clamp-2">{item.message}</p>}
                            {item.tags.length > 0 && <div className="mt-2 flex gap-2">{item.tags.slice(0, 3).map((t) => <Badge key={t}>{t}</Badge>)}</div>}
                        </li>
                    ))}
                </ul>
                {feed.length === 0 && <div className="mt-4"><EmptyState title="Nothing here yet" hint="New writing and updates will appear here." /></div>}
            </section>

            {featuredPosts.length > 0 && (
                <section className="mx-auto max-w-5xl border-t border-hairline px-6 py-10" aria-labelledby="writing-heading">
                    <div className="flex items-baseline justify-between">
                        <h2 id="writing-heading" className="text-sm font-semibold uppercase tracking-wider text-meta">Featured writing</h2>
                        <Link href="/writing" className="text-sm text-link hover:underline">All writing</Link>
                    </div>
                    <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {featuredPosts.map((p: any) => (
                            <article key={p.slug}>
                                <MetaLine date={p.date} readingTime={p.reading_time} />
                                <Link href={`/writing/${p.slug}`} className="mt-1 block text-lg font-semibold tracking-tight hover:text-link">{p.title}</Link>
                                <p className="mt-1 text-sm text-meta line-clamp-3">{p.excerpt}</p>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {projects.length > 0 && (
                <section className="mx-auto max-w-5xl border-t border-hairline px-6 py-10" aria-labelledby="projects-heading">
                    <div className="flex items-baseline justify-between">
                        <h2 id="projects-heading" className="text-sm font-semibold uppercase tracking-wider text-meta">Selected projects</h2>
                        <Link href="/projects" className="text-sm text-link hover:underline">All projects</Link>
                    </div>
                    <div className="mt-5 grid gap-6 sm:grid-cols-3">
                        {projects.map((p: any) => (
                            <article key={p.slug} className="border-t border-hairline pt-4">
                                <Badge>{p.status}</Badge>
                                <Link href={`/projects/${p.slug}`} className="mt-2 block font-semibold hover:text-link">{p.name}</Link>
                                <p className="mt-1 text-sm text-meta">{p.summary}</p>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {now && (
                <section className="mx-auto max-w-5xl border-t border-hairline px-6 py-10" aria-labelledby="now-heading">
                    <div className="flex items-baseline justify-between">
                        <h2 id="now-heading" className="text-sm font-semibold uppercase tracking-wider text-meta">Now</h2>
                        <Link href="/now" className="text-sm text-link hover:underline">Details</Link>
                    </div>
                    <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {now.sections.map((s: any) => (
                            <div key={s.key}>
                                <dt className="text-xs uppercase tracking-wide text-meta">{s.label}</dt>
                                <dd className="mt-1 text-sm">{s.update || s.body}</dd>
                            </div>
                        ))}
                    </dl>
                    <p className="mt-3 text-xs text-meta">Last updated {new Date(now.last_updated_at).toLocaleDateString()}</p>
                </section>
            )}

            {social_links.length > 0 && (
                <section className="mx-auto max-w-5xl border-t border-hairline px-6 py-8">
                    <ul className="flex flex-wrap gap-4">
                        {social_links.map((l: any) => (
                            <li key={l.url}>
                                <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-sm text-link hover:underline">{l.label || l.platform}</a>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </PublicLayout>
    );
}
```

- [ ] **Step 6: Run tests**

Run: `./vendor/bin/pest tests/Feature/HomeTest.php`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: home page with unified chronological feed"
```

---

### Task 11: Writing archive + article detail

**Files:**
- Create: `app/Http/Controllers/WritingController.php`
- Create: `resources/js/Pages/Writing/Index.tsx`, `resources/js/Pages/Writing/Show.tsx`
- Modify: `routes/web.php`
- Test: `tests/Feature/WritingTest.php`

**Interfaces:**
- Produces: `GET /writing` props `{ posts: paginated {slug,title,excerpt,reading_time,date,featured,topics[],tags[]}, topics: [{slug,name}], filters: {q, topic, tag} }`; `GET /writing/{slug}` props `{ post: {slug,title,body_html,excerpt,reading_time,date,meta_title,meta_description,cover_image,tags[],topics[]}, related: [...], canonical: string }`. Drafts/private → 404 for guests.

- [ ] **Step 1: Write failing tests**

`tests/Feature/WritingTest.php`:

```php
<?php

use App\Models\{Post, User};

function makePost(array $attrs = []): Post {
    $author = User::factory()->create();
    return Post::factory()->create(array_merge([
        'post_type' => 'article', 'status' => 'published', 'visibility' => 'public',
        'published_at' => now()->subDay(), 'author_id' => $author->id,
        'body' => "## Heading\n\nSome content",
    ], $attrs));
}

it('lists published articles', function () {
    makePost(['title' => 'Public One']);
    makePost(['title' => 'A Draft', 'status' => 'draft']);

    $this->get('/writing')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Writing/Index')->has('posts')->where('posts.data.0.title', 'Public One'));
});

it('shows article with rendered markdown', function () {
    $post = makePost(['title' => 'Deep Dive']);

    $this->get('/writing/deep-dive')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Writing/Show')
            ->where('post.title', 'Deep Dive')
            ->where('post.body_html', fn ($html) => str_contains($html, '<h2>')));
});

it('404s on draft article for guests', function () {
    makePost(['title' => 'Secret', 'slug' => 'secret', 'status' => 'draft']);
    $this->get('/writing/secret')->assertNotFound();
});

it('filters by topic', function () {
    $post = makePost(['title' => 'Tagged']);
    $topic = \App\Models\Topic::create(['name' => 'AI', 'slug' => 'ai']);
    $post->topics()->attach($topic);

    $this->get('/writing?topic=ai')->assertInertia(fn ($p) => $p->where('posts.data.0.title', 'Tagged'));
});

it('searches article titles', function () {
    makePost(['title' => 'Neurotechnology Primer']);
    makePost(['title' => 'Cooking Basics']);

    $this->get('/writing?q=neuro')->assertInertia(fn ($p) => $p->where('posts.data.0.title', 'Neurotechnology Primer'));
});

it('shows related articles by shared topic', function () {
    $a = makePost(['title' => 'Original']);
    $topic = \App\Models\Topic::create(['name' => 'BCI', 'slug' => 'bci']);
    $a->topics()->attach($topic);
    $b = makePost(['title' => 'Sibling']);
    $b->topics()->attach($topic);

    $this->get('/writing/original')->assertInertia(fn ($p) => $p->has('related')->where('related.0.title', 'Sibling'));
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./vendor/bin/pest tests/Feature/WritingTest.php`
Expected: FAIL.

- [ ] **Step 3: Controller**

`app/Http/Controllers/WritingController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\{Post, Topic};
use App\Services\MarkdownService;
use Illuminate\Http\Request;
use Inertia\{Inertia, Response};

class WritingController extends Controller
{
    public function index(Request $request, MarkdownService $markdown): Response
    {
        $query = Post::publiclyVisible()->ofType('article')->with(['tags', 'topics'])->latest('published_at');

        if ($q = $request->query('q')) {
            $query->where(fn ($w) => $w->where('title', 'like', "%{$q}%")->orWhere('excerpt', 'like', "%{$q}%"));
        }
        if ($topic = $request->query('topic')) {
            $query->whereHas('topics', fn ($t) => $t->where('slug', $topic));
        }
        if ($tag = $request->query('tag')) {
            $query->whereHas('tags', fn ($t) => $t->where('slug', $tag));
        }

        return Inertia::render('Writing/Index', [
            'posts' => $query->paginate(10)->withQueryString()->through(fn ($p) => [
                'slug' => $p->slug, 'title' => $p->title, 'excerpt' => $p->excerpt,
                'reading_time' => $p->reading_time, 'featured' => $p->featured,
                'date' => $p->published_at?->format('M j, Y'),
                'topics' => $p->topics->pluck('name'), 'tags' => $p->tags->pluck('name'),
            ]),
            'topics' => Topic::orderBy('name')->get(['name', 'slug']),
            'filters' => $request->only(['q', 'topic', 'tag']),
        ]);
    }

    public function show(string $slug, MarkdownService $markdown): Response
    {
        $post = Post::publiclyVisible()->ofType('article')
            ->where('slug', $slug)->with(['tags', 'topics'])->firstOrFail();

        $related = Post::publiclyVisible()->ofType('article')
            ->where('id', '!=', $post->id)
            ->whereHas('topics', fn ($t) => $t->whereIn('topics.id', $post->topics->pluck('id')))
            ->with('topics')->limit(3)->get()
            ->map(fn ($p) => $p->only(['slug', 'title', 'excerpt', 'reading_time']) + ['date' => $p->published_at?->format('M j, Y')]);

        return Inertia::render('Writing/Show', [
            'post' => [
                'slug' => $post->slug, 'title' => $post->title, 'excerpt' => $post->excerpt,
                'body_html' => $markdown->render((string) $post->body),
                'reading_time' => $post->reading_time,
                'date' => $post->published_at?->format('F j, Y'),
                'published_iso' => $post->published_at?->toIso8601String(),
                'updated_iso' => $post->updated_at->toIso8601String(),
                'cover_image' => $post->cover_image,
                'meta_title' => $post->meta_title ?: $post->title,
                'meta_description' => $post->meta_description ?: $post->excerpt,
                'tags' => $post->tags->pluck('name'),
                'topics' => $post->topics->pluck('name'),
            ],
            'related' => $related,
            'canonical' => url('/writing/' . $post->slug),
        ]);
    }
}
```

Routes: `Route::get('/writing', [WritingController::class, 'index'])->name('writing.index'); Route::get('/writing/{slug}', [WritingController::class, 'show'])->name('writing.show');`

- [ ] **Step 4: Archive page UI**

`resources/js/Pages/Writing/Index.tsx`:

```tsx
import PublicLayout from '@/Layouts/PublicLayout';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { SearchInput } from '@/Components/SearchInput';
import { FilterBar } from '@/Components/FilterBar';
import { MetaLine } from '@/Components/MetaLine';
import { Pagination } from '@/Components/Pagination';
import { EmptyState } from '@/Components/EmptyState';

export default function WritingIndex({ posts, topics, filters }: any) {
    const [q, setQ] = useState(filters.q ?? '');

    const apply = (patch: Record<string, string | undefined>) =>
        router.get('/writing', { ...filters, q: q || undefined, ...patch }, { preserveState: true, preserveScroll: true });

    return (
        <PublicLayout>
            <div className="mx-auto max-w-3xl px-6 pt-12 pb-16">
                <h1 className="text-3xl font-semibold tracking-tight">Writing</h1>
                <p className="mt-2 text-meta">Long-form pieces about technology, product thinking, and ideas in progress.</p>

                <div className="mt-8 flex flex-col gap-4">
                    <div className="max-w-sm">
                        <SearchInput value={q} onChange={setQ} placeholder="Search writing" />
                    </div>
                    <FilterBar options={topics.map((t: any) => ({ label: t.name, value: t.slug }))}
                        active={filters.topic ?? ''} onSelect={(v) => apply({ topic: v || undefined })} allLabel="All topics" />
                </div>

                <div className="mt-10 divide-y divide-hairline">
                    {posts.data.map((post: any) => (
                        <article key={post.slug} className="py-6">
                            <MetaLine type={post.featured ? 'Featured' : undefined} date={post.date} readingTime={post.reading_time} />
                            <Link href={`/writing/${post.slug}`} className="mt-1 block text-xl font-semibold tracking-tight hover:text-link">
                                {post.title}
                            </Link>
                            <p className="mt-1 text-meta">{post.excerpt}</p>
                            {post.topics.length > 0 && (
                                <p className="mt-2 text-xs text-meta">{post.topics.join(' · ')}</p>
                            )}
                        </article>
                    ))}
                    {posts.data.length === 0 && <div className="py-8"><EmptyState title="No writing found" hint="Try a different search or filter." /></div>}
                </div>

                <Pagination links={posts.links} />
            </div>
        </PublicLayout>
    );
}
```

- [ ] **Step 5: Article page UI**

`resources/js/Pages/Writing/Show.tsx`:

```tsx
import PublicLayout from '@/Layouts/PublicLayout';
import { Head, Link } from '@inertiajs/react';
import { Prose } from '@/Components/Prose';
import { MetaLine } from '@/Components/MetaLine';
import { Badge } from '@/Components/Badge';

export default function ArticleShow({ post, related, canonical }: any) {
    return (
        <PublicLayout>
            <Head>
                <title>{post.meta_title} — Timadey</title>
                <meta name="description" content={post.meta_description} />
                <link rel="canonical" href={canonical} />
                <meta property="og:type" content="article" />
                <meta property="og:title" content={post.meta_title} />
                <meta property="og:description" content={post.meta_description} />
                <meta property="article:published_time" content={post.published_iso} />
                <meta property="article:modified_time" content={post.updated_iso} />
                <meta name="twitter:card" content="summary" />
            </Head>

            <article className="mx-auto max-w-3xl px-6 pt-12 pb-16">
                <MetaLine type="Article" date={post.date} readingTime={post.reading_time} />
                <h1 className="mt-2 text-4xl font-semibold tracking-tight">{post.title}</h1>
                {post.excerpt && <p className="mt-3 text-lg text-meta">{post.excerpt}</p>}
                {post.cover_image && <img src={post.cover_image} alt="" className="mt-8 w-full rounded-md" loading="lazy" />}
                <hr className="my-8 border-hairline" />
                <Prose html={post.body_html} />
                {(post.tags.length > 0 || post.topics.length > 0) && (
                    <div className="mt-10 flex flex-wrap gap-2 border-t border-hairline pt-6">
                        {[...post.topics, ...post.tags].map((t: string) => <Badge key={t}>{t}</Badge>)}
                    </div>
                )}
            </article>

            {related.length > 0 && (
                <aside className="mx-auto max-w-3xl border-t border-hairline px-6 py-10" aria-labelledby="related-heading">
                    <h2 id="related-heading" className="text-sm font-semibold uppercase tracking-wider text-meta">Related writing</h2>
                    <ul className="mt-4 space-y-3">
                        {related.map((r: any) => (
                            <li key={r.slug}>
                                <Link href={`/writing/${r.slug}`} className="font-medium hover:text-link">{r.title}</Link>
                                <span className="ml-2 text-xs text-meta">{r.date}</span>
                            </li>
                        ))}
                    </ul>
                </aside>
            )}
        </PublicLayout>
    );
}
```

- [ ] **Step 6: Run tests**

Run: `./vendor/bin/pest tests/Feature/WritingTest.php`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: writing archive and article pages with search, filters, related"
```

---

### Task 12: Notes pages

**Files:**
- Create: `app/Http/Controllers/NoteController.php`
- Create: `resources/js/Pages/Notes/Index.tsx`, `resources/js/Pages/Notes/Show.tsx`
- Modify: `routes/web.php`
- Test: `tests/Feature/NotesTest.php`

**Interfaces:**
- Produces: `GET /notes` props `{ notes: paginated {slug,title,excerpt,body_html,date,reading_time,tags[]}, tags: [{slug,name}], filters: {q, tag} }`; `GET /notes/{slug}` props `{ note: {...}, canonical }`. Only `post_type = note`, published + public.

- [ ] **Step 1: Write failing tests**

`tests/Feature/NotesTest.php`:

```php
<?php

use App\Models\{Post, User};

it('lists published notes only', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'note', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'title' => 'A Note']);
    Post::factory()->create(['post_type' => 'note', 'status' => 'draft', 'author_id' => $author->id, 'title' => 'Hidden']);

    $this->get('/notes')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Notes/Index')->where('notes.data.0.title', 'A Note'));
});

it('shows single note with markdown', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'note', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'slug' => 'small-thought', 'title' => 'Small Thought', 'body' => '**bold** thought']);

    $this->get('/notes/small-thought')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Notes/Show')->where('note.title', 'Small Thought')
            ->where('note.body_html', fn ($h) => str_contains($h, '<strong>')));
});

it('404s on private note', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'note', 'status' => 'published', 'visibility' => 'private', 'slug' => 'private-note', 'author_id' => $author->id]);
    $this->get('/notes/private-note')->assertNotFound();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./vendor/bin/pest tests/Feature/NotesTest.php`
Expected: FAIL.

- [ ] **Step 3: Controller**

`app/Http/Controllers/NoteController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\{Post, Tag};
use App\Services\MarkdownService;
use Illuminate\Http\Request;
use Inertia\{Inertia, Response};

class NoteController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Post::publiclyVisible()->ofType('note')->with('tags')->latest('published_at');

        if ($q = $request->query('q')) {
            $query->where(fn ($w) => $w->where('title', 'like', "%{$q}%")->orWhere('body', 'like', "%{$q}%"));
        }
        if ($tag = $request->query('tag')) {
            $query->whereHas('tags', fn ($t) => $t->where('slug', $tag));
        }

        return Inertia::render('Notes/Index', [
            'notes' => $query->paginate(15)->withQueryString()->through(fn ($p) => [
                'slug' => $p->slug, 'title' => $p->title, 'excerpt' => $p->excerpt,
                'reading_time' => $p->reading_time,
                'date' => $p->published_at?->format('M j, Y'),
                'tags' => $p->tags->pluck('name'),
            ]),
            'tags' => Tag::whereHas('posts', fn ($q2) => $q2->where('post_type', 'note'))->orderBy('name')->get(['name', 'slug']),
            'filters' => $request->only(['q', 'tag']),
        ]);
    }

    public function show(string $slug, MarkdownService $markdown): Response
    {
        $note = Post::publiclyVisible()->ofType('note')->where('slug', $slug)->with('tags')->firstOrFail();

        return Inertia::render('Notes/Show', [
            'note' => [
                'slug' => $note->slug, 'title' => $note->title, 'excerpt' => $note->excerpt,
                'body_html' => $markdown->render((string) $note->body),
                'date' => $note->published_at?->format('F j, Y'),
                'published_iso' => $note->published_at?->toIso8601String(),
                'reading_time' => $note->reading_time,
                'tags' => $note->tags->pluck('name'),
            ],
            'canonical' => url('/notes/' . $note->slug),
        ]);
    }
}
```

Note: `Tag::whereHas('posts')` works via `morphedByMany` relation name `posts`.

- [ ] **Step 4: Pages**

`resources/js/Pages/Notes/Index.tsx` — chronological list (title/message + date + tags), SearchInput + tag FilterBar + Pagination; same visual pattern as Writing index but denser (notes can show excerpt or first line of body).

`resources/js/Pages/Notes/Show.tsx` — article-style page with `Head` meta (title, description, canonical), MetaLine, Prose. Structure copied from `Writing/Show` minus related section; include tags.

- [ ] **Step 5: Run tests**

Run: `./vendor/bin/pest tests/Feature/NotesTest.php`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: notes feed and note detail pages"
```

---

### Task 13: Projects public pages

**Files:**
- Create: `app/Http/Controllers/ProjectController.php`
- Create: `resources/js/Pages/Projects/Index.tsx`, `Show.tsx`
- Modify: `routes/web.php`
- Test: `tests/Feature/ProjectsPublicTest.php`

**Interfaces:**
- Produces: `GET /projects` props `{ projects: paginated {slug,name,summary,status,cover_image,started_at,featured,tags[]}, statuses: [...], filters: {status} }`; `GET /projects/{slug}` props `{ project: {slug,name,summary,description_html,status,repository_url,live_url,started_at,completed_at,tags[],cover_image}, related: {posts: [...]} }`. Private → 404.

- [ ] **Step 1: Write failing tests**

`tests/Feature/ProjectsPublicTest.php`:

```php
<?php

use App\Models\{Post, Project, User};

it('lists public projects', function () {
    Project::factory()->create(['name' => 'Visible Project', 'visibility' => 'public']);
    Project::factory()->create(['visibility' => 'private', 'name' => 'Hidden']);

    $this->get('/projects')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Projects/Index')->where('projects.data.0.name', 'Visible Project'));
});

it('filters projects by status', function () {
    Project::factory()->create(['name' => 'Building One', 'status' => 'building', 'visibility' => 'public']);
    Project::factory()->create(['name' => 'Idea One', 'status' => 'idea', 'visibility' => 'public']);

    $this->get('/projects?status=building')->assertInertia(fn ($p) => $p->where('projects.data.0.name', 'Building One'));
});

it('shows project detail with markdown description', function () {
    Project::factory()->create(['name' => 'Deep Project', 'slug' => 'deep-project', 'visibility' => 'public', 'description' => '### Goals\n\nShip it']);

    $this->get('/projects/deep-project')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Projects/Show')->where('project.name', 'Deep Project')
            ->where('project.description_html', fn ($h) => str_contains($h, '<h3>')));
});

it('404s on private project', function () {
    Project::factory()->create(['slug' => 'secret-proj', 'visibility' => 'private']);
    $this->get('/projects/secret-proj')->assertNotFound();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./vendor/bin/pest tests/Feature/ProjectsPublicTest.php`
Expected: FAIL.

- [ ] **Step 3: Controller**

`app/Http/Controllers/ProjectController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\{Post, Project};
use App\Services\MarkdownService;
use Illuminate\Http\Request;
use Inertia\{Inertia, Response};

class ProjectController extends Controller
{
    private const STATUSES = ['idea', 'exploring', 'building', 'active', 'paused', 'completed'];

    public function index(Request $request): Response
    {
        $query = Project::publiclyVisible()->with('tags')->orderByDesc('featured')->latest('updated_at');

        if ($status = $request->query('status')) {
            $query->where('status', in_array($status, self::STATUSES) ? $status : 'idea');
        }

        return Inertia::render('Projects/Index', [
            'projects' => $query->paginate(12)->withQueryString()->through(fn ($p) => [
                'slug' => $p->slug, 'name' => $p->name, 'summary' => $p->summary, 'status' => $p->status,
                'cover_image' => $p->cover_image, 'featured' => $p->featured,
                'started_at' => $p->started_at?->format('M Y'),
                'tags' => $p->tags->pluck('name'),
            ]),
            'statuses' => self::STATUSES,
            'filters' => $request->only(['status']),
        ]);
    }

    public function show(string $slug, MarkdownService $markdown): Response
    {
        $project = Project::publiclyVisible()->where('slug', $slug)->with('tags')->firstOrFail();

        $relatedPosts = Post::publiclyVisible()->whereHas('tags', function ($q) use ($project) {
            $q->whereIn('tags.id', $project->tags->pluck('id'));
        })->latest('published_at')->limit(4)->get()
            ->map(fn ($p) => $p->only(['slug', 'title', 'excerpt']) + [
                'url' => '/' . ($p->post_type === 'article' ? 'writing' : 'notes') . '/' . $p->slug,
                'date' => $p->published_at?->format('M j, Y'),
            ]);

        return Inertia::render('Projects/Show', [
            'project' => [
                'slug' => $project->slug, 'name' => $project->name, 'summary' => $project->summary,
                'description_html' => $markdown->render((string) $project->description),
                'status' => $project->status, 'repository_url' => $project->repository_url,
                'live_url' => $project->live_url,
                'started_at' => $project->started_at?->format('M Y'),
                'completed_at' => $project->completed_at?->format('M Y'),
                'cover_image' => $project->cover_image,
                'tags' => $project->tags->pluck('name'),
            ],
            'related' => ['posts' => $relatedPosts],
            'canonical' => url('/projects/' . $project->slug),
        ]);
    }
}
```

- [ ] **Step 4: Pages**

`resources/js/Pages/Projects/Index.tsx` — header + status FilterBar (map statuses to labels) + responsive grid of project cards (status Badge, name, summary, tags, started_at); Pagination.

`resources/js/Pages/Projects/Show.tsx` — title, status Badge, summary, cover image, description Prose, meta list (started/completed dates), action links (live repo buttons only when URLs present), tags, related writing list. `Head` meta + canonical.

- [ ] **Step 5: Run tests**

Run: `./vendor/bin/pest tests/Feature/ProjectsPublicTest.php`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: public projects listing and detail pages"
```

---

### Task 14: Collected public page

**Files:**
- Create: `app/Http/Controllers/CollectedController.php`
- Create: `resources/js/Pages/Collected/Index.tsx`
- Modify: `routes/web.php`
- Test: `tests/Feature/CollectedPublicTest.php`

**Interfaces:**
- Produces: `GET /collected` props `{ items: paginated {title,url,creator,item_type,annotation,date,tags[]}, types: [{value,label}], filters: {type, q, tag} }`.

- [ ] **Step 1: Write failing tests**

`tests/Feature/CollectedPublicTest.php`:

```php
<?php

use App\Models\CollectedItem;

it('lists public collected items', function () {
    CollectedItem::factory()->create(['title' => 'System Design', 'visibility' => 'public', 'item_type' => 'book']);
    CollectedItem::factory()->create(['title' => 'Private Thing', 'visibility' => 'private']);

    $this->get('/collected')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Collected/Index')->where('items.data.0.title', 'System Design'));
});

it('filters by item type', function () {
    CollectedItem::factory()->create(['title' => 'A Podcast', 'item_type' => 'podcast', 'visibility' => 'public']);
    CollectedItem::factory()->create(['title' => 'A Book', 'item_type' => 'book', 'visibility' => 'public']);

    $this->get('/collected?type=podcast')->assertInertia(fn ($p) => $p->where('items.data.0.title', 'A Podcast'));
});

it('searches annotations', function () {
    CollectedItem::factory()->create(['title' => 'Default', 'annotation' => 'Great systems thinking book', 'visibility' => 'public']);
    CollectedItem::factory()->create(['title' => 'Other', 'annotation' => 'unrelated', 'visibility' => 'public']);

    $this->get('/collected?q=systems')->assertInertia(fn ($p) => $p->where('items.data.0.title', 'Default'));
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./vendor/bin/pest tests/Feature/CollectedPublicTest.php`
Expected: FAIL.

- [ ] **Step 3: Controller**

`app/Http/Controllers/CollectedController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\CollectedItem;
use Illuminate\Http\Request;
use Inertia\{Inertia, Response};

class CollectedController extends Controller
{
    private const TYPES = [
        'book' => 'Books', 'article' => 'Articles', 'video' => 'Videos', 'podcast' => 'Podcasts',
        'music' => 'Music', 'tool' => 'Tools', 'quote' => 'Quotes', 'website' => 'Websites', 'other' => 'Other',
    ];

    public function index(Request $request): Response
    {
        $query = CollectedItem::publiclyVisible()->with('tags')->latest('created_at');

        if ($type = $request->query('type')) {
            $query->where('item_type', array_key_exists($type, self::TYPES) ? $type : 'other');
        }
        if ($q = $request->query('q')) {
            $query->where(fn ($w) => $w->where('title', 'like', "%{$q}%")
                ->orWhere('annotation', 'like', "%{$q}%")->orWhere('creator', 'like', "%{$q}%"));
        }
        if ($tag = $request->query('tag')) {
            $query->whereHas('tags', fn ($t) => $t->where('slug', $tag));
        }

        return Inertia::render('Collected/Index', [
            'items' => $query->paginate(20)->withQueryString()->through(fn ($i) => [
                'title' => $i->title, 'url' => $i->url, 'creator' => $i->creator,
                'item_type' => $i->item_type, 'annotation' => $i->annotation,
                'date' => $i->created_at->format('M j, Y'), 'tags' => $i->tags->pluck('name'),
            ]),
            'types' => collect(self::TYPES)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
            'filters' => $request->only(['type', 'q', 'tag']),
        ]);
    }
}
```

- [ ] **Step 4: Page UI**

`resources/js/Pages/Collected/Index.tsx` — header, SearchInput, FilterBar of types, then a hairline-divided list: item title (external link with `target=_blank rel=noopener` when `url` present, otherwise plain text), creator, type label, annotation (Prose-lite or plain text), tags, date added.

- [ ] **Step 5: Run tests**

Run: `./vendor/bin/pest tests/Feature/CollectedPublicTest.php`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: collected library page with type and search filters"
```

---

### Task 15: About + Now public pages

**Files:**
- Create: `app/Http/Controllers/AboutController.php`, `app/Http/Controllers/NowPageController.php`
- Create: `resources/js/Pages/About.tsx`, `resources/js/Pages/Now.tsx`
- Modify: `routes/web.php`
- Test: `tests/Feature/AboutNowTest.php`

**Interfaces:**
- Produces: `GET /about` props `{ sections: [{key,title,body_html,visible}], social_links: [...], contact_email }`; `GET /now` props `{ sections: [{key,label,body,updates:[{text,occurred_at}]}], last_updated_at }`. Only `visible` sections shown; Now never claims real-time — displays "Last updated …".

- [ ] **Step 1: Write failing tests**

`tests/Feature/AboutNowTest.php`:

```php
<?php

use App\Models\{AboutSection, NowSection, NowUpdate, SocialLink};

it('shows visible about sections rendered', function () {
    AboutSection::create(['key' => 'intro', 'title' => 'Intro', 'body' => 'I build **things**.', 'visible' => true, 'sort_order' => 0]);
    AboutSection::create(['key' => 'hidden', 'title' => 'Hidden', 'body' => 'secret', 'visible' => false, 'sort_order' => 1]);

    $this->get('/about')->assertOk()
        ->assertInertia(fn ($p) => $p->component('About')->has('sections', 1)
            ->where('sections.0.body_html', fn ($h) => str_contains($h, '<strong>things</strong>')));
});

it('shows social links on about', function () {
    SocialLink::create(['platform' => 'GitHub', 'url' => 'https://github.com/x', 'visible' => true]);
    SocialLink::create(['platform' => 'Hidden', 'url' => 'https://x.test', 'visible' => false]);

    $this->get('/about')->assertInertia(fn ($p) => $p->has('social_links', 1));
});

it('shows now page with last-updated timestamp', function () {
    $s = NowSection::create(['key' => 'building', 'label' => 'Currently building', 'body' => 'A thing', 'visible' => true, 'sort_order' => 0]);
    $s->updates()->create(['text' => 'Shipped a feature', 'occurred_at' => now()->subDays(2), 'visible' => true]);
    NowSection::create(['key' => 'hidden', 'label' => 'Hidden', 'body' => 'x', 'visible' => false]);

    $this->get('/now')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Now')->has('sections', 1)->whereNotNull('last_updated_at'));
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./vendor/bin/pest tests/Feature/AboutNowTest.php`
Expected: FAIL.

- [ ] **Step 3: Controllers**

`app/Http/Controllers/AboutController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\{AboutSection, SocialLink};
use App\Services\MarkdownService;
use Inertia\{Inertia, Response};

class AboutController extends Controller
{
    public function __invoke(MarkdownService $markdown): Response
    {
        return Inertia::render('About', [
            'sections' => AboutSection::where('visible', true)->orderBy('sort_order')->get()
                ->map(fn ($s) => [
                    'key' => $s->key, 'title' => $s->title,
                    'body_html' => $markdown->render((string) $s->body),
                ]),
            'social_links' => SocialLink::where('visible', true)->orderBy('sort_order')->get(['platform', 'url', 'label']),
            'contact_email' => \App\Models\Setting::get('contact_email'),
        ]);
    }
}
```

`app/Http/Controllers/NowPageController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\NowSection;
use Inertia\{Inertia, Response};

class NowPageController extends Controller
{
    public function __invoke(): Response
    {
        $sections = NowSection::where('visible', true)->orderBy('sort_order')
            ->with(['updates' => fn ($q) => $q->where('visible', true)->orderByDesc('occurred_at')])
            ->get()
            ->filter(fn ($s) => $s->body || $s->updates->isNotEmpty())
            ->values();

        return Inertia::render('Now', [
            'sections' => $sections->map(fn ($s) => [
                'key' => $s->key, 'label' => $s->label, 'body' => $s->body,
                'updates' => $s->updates->map(fn ($u) => [
                    'text' => $u->text,
                    'occurred_at' => $u->occurred_at?->format('M j, Y'),
                ]),
            ]),
            'last_updated_at' => $sections->max(fn ($s) => $s->updated_at->toIso8601String()),
        ]);
    }
}
```

Routes: `Route::get('/about', AboutController::class); Route::get('/now', NowPageController::class);`

- [ ] **Step 4: Pages**

`resources/js/Pages/About.tsx` — intro sections rendered as `h2` + `Prose`, social links list, contact link (mailto when present). `Head` title "About — Timadey".

`resources/js/Pages/Now.tsx` — sections as labeled blocks; each section shows body + timestamped updates; footer line: `Last updated {date} — this page is updated manually, not in real time.` This disclaimer is required (spec: never pretend stale info is live).

- [ ] **Step 5: Run tests**

Run: `./vendor/bin/pest tests/Feature/AboutNowTest.php`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: about and now pages with visibility controls and freshness timestamp"
```

---

### Task 16: Global search

**Files:**
- Create: `database/migrations/2026_10_13_000003_add_search_vectors.php`
- Create: `app/Services/SearchService.php`
- Create: `app/Http/Controller/SearchController.php`
- Create: `resources/js/Pages/Search.tsx`
- Modify: `routes/web.php`
- Test: `tests/Feature/SearchTest.php`

**Interfaces:**
- Produces: `GET /search?q=&type=` props `{ results: [{type, title, snippet, url, date}], types: [...], q, total }`. Search covers posts (articles+notes), projects, collected items — published/public only. Postgres full-text: generated `search_vector` column + GIN index on `posts`; `websearch_to_tsquery` for queries; `ts_rank` ordering for posts, fallback `like` for projects/collected.

- [ ] **Step 1: Write failing tests**

`tests/Feature/SearchTest.php`:

```php
<?php

use App\Models\{CollectedItem, Post, Project, User};

it('finds published articles', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'article', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'title' => 'Brain Computer Interfaces', 'body' => 'BCIs connect minds to machines']);

    $this->get('/search?q=brain')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Search')->has('results')->where('results.0.title', 'Brain Computer Interfaces'));
});

it('excludes drafts from search', function () {
    $author = User::factory()->create();
    Post::factory()->create(['status' => 'draft', 'title' => 'Draft Brain', 'author_id' => $author->id]);

    $this->get('/search?q=brain')->assertInertia(fn ($p) => $p->where('results', []));
});

it('finds projects and collected items', function () {
    Project::factory()->create(['name' => 'MindReader', 'summary' => 'Reading thoughts', 'visibility' => 'public']);
    CollectedItem::factory()->create(['title' => 'Mind Reading 101', 'visibility' => 'public']);

    $this->get('/search?q=mind')->assertInertia(fn ($p) => $p->has('results', 2));
});

it('filters by type', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'article', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'title' => 'Mindful Article']);
    Project::factory()->create(['name' => 'MindProject', 'visibility' => 'public']);

    $this->get('/search?q=mind&type=project')->assertInertia(fn ($p) => $p->where('results.0.type', 'project'));
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./vendor/bin/pest tests/Feature/SearchTest.php`
Expected: FAIL.

- [ ] **Step 3: Migration (search vectors)**

`database/migrations/2026_10_13_000003_add_search_vectors.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE posts ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(body, ''))) STORED");
        DB::statement("CREATE INDEX IF NOT EXISTS posts_search_vector_idx ON posts USING GIN (search_vector)");

        DB::statement("ALTER TABLE projects ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(description, ''))) STORED");
        DB::statement("CREATE INDEX IF NOT EXISTS projects_search_vector_idx ON projects USING GIN (search_vector)");

        DB::statement("ALTER TABLE collected_items ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(annotation, '') || ' ' || coalesce(creator, ''))) STORED");
        DB::statement("CREATE INDEX IF NOT EXISTS collected_items_search_vector_idx ON collected_items USING GIN (search_vector)");
    }

    public function down(): void
    {
        DB::statement("DROP INDEX IF EXISTS collected_items_search_vector_idx");
        DB::statement("ALTER TABLE collected_items DROP COLUMN IF EXISTS search_vector");
        DB::statement("DROP INDEX IF EXISTS projects_search_vector_idx");
        DB::statement("ALTER TABLE projects DROP COLUMN IF EXISTS search_vector");
        DB::statement("DROP INDEX IF EXISTS posts_search_vector_idx");
        DB::statement("ALTER TABLE posts DROP COLUMN IF EXISTS search_vector");
    }
};
```

- [ ] **Step 4: SearchService**

`app/Services/SearchService.php`:

```php
<?php

namespace App\Services;

use App\Models\{CollectedItem, Post, Project};
use Illuminate\Support\Facades\DB;

class SearchService
{
    public function search(string $query, ?string $type = null, int $limit = 30): array
    {
        $query = trim($query);
        if ($query === '') return [];

        $results = [];

        if (!$type || $type === 'article' || $type === 'note') {
            $rows = Post::publiclyVisible()
                ->when($type, fn ($q) => $q->where('post_type', $type))
                ->whereRaw('search_vector @@ websearch_to_tsquery(?, ?)', ['english', $query])
                ->orderByRaw('ts_rank(search_vector, websearch_to_tsquery(?, ?)) DESC', ['english', $query])
                ->limit($limit)->get(['id', 'title', 'slug', 'excerpt', 'post_type', 'published_at']);

            foreach ($rows as $r) {
                $results[] = [
                    'type' => $r->post_type === 'article' ? 'article' : 'note',
                    'title' => $r->title,
                    'snippet' => $this->snippet($r->excerpt ?: $r->title, $query),
                    'url' => '/' . ($r->post_type === 'article' ? 'writing' : 'notes') . '/' . $r->slug,
                    'date' => $r->published_at?->format('M j, Y'),
                ];
            }
        }

        if (!$type || $type === 'project') {
            $rows = Project::publiclyVisible()
                ->whereRaw('search_vector @@ websearch_to_tsquery(?, ?)', ['english', $query])
                ->orderByRaw('ts_rank(search_vector, websearch_to_tsquery(?, ?)) DESC', ['english', $query])
                ->limit($limit)->get(['name', 'slug', 'summary', 'updated_at']);

            foreach ($rows as $r) {
                $results[] = [
                    'type' => 'project', 'title' => $r->name,
                    'snippet' => $this->snippet($r->summary ?: '', $query),
                    'url' => '/projects/' . $r->slug,
                    'date' => $r->updated_at->format('M j, Y'),
                ];
            }
        }

        if (!$type || $type === 'collected') {
            $rows = CollectedItem::publiclyVisible()
                ->whereRaw('search_vector @@ websearch_to_tsquery(?, ?)', ['english', $query])
                ->orderByRaw('ts_rank(search_vector, websearch_to_tsquery(?, ?)) DESC', ['english', $query])
                ->limit($limit)->get(['title', 'url', 'annotation', 'created_at', 'id']);

            foreach ($rows as $r) {
                $results[] = [
                    'type' => 'collected', 'title' => $r->title,
                    'snippet' => $this->snippet($r->annotation ?: '', $query),
                    'url' => $r->url ?: '/collected',
                    'date' => $r->created_at->format('M j, Y'),
                ];
            }
        }

        return array_slice($results, 0, $limit);
    }

    private function snippet(string $text, string $query): string
    {
        $plain = trim(preg_replace('/\s+/', ' ', strip_tags($text)));
        $words = preg_split('/\s+/', $query);
        foreach ($words as $word) {
            $pos = stripos($plain, $word);
            if ($pos !== false) {
                $start = max(0, $pos - 60);
                return ($start > 0 ? '…' : '') . substr($plain, $start, 160) . '…';
            }
        }
        return substr($plain, 0, 160);
    }
}
```

- [ ] **Step 5: Controller + route + page**

`app/Http/Controllers/SearchController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Services\SearchService;
use Illuminate\Http\Request;
use Inertia\{Inertia, Response};

class SearchController extends Controller
{
    public function __invoke(Request $request, SearchService $search): Response
    {
        $q = (string) $request->query('q', '');
        $type = $request->query('type');
        $type = in_array($type, ['article', 'note', 'project', 'collected']) ? $type : null;

        $results = mb_strlen($q) >= 2 ? $search->search($q, $type) : [];

        return Inertia::render('Search', [
            'results' => $results,
            'types' => [
                ['value' => 'article', 'label' => 'Articles'],
                ['value' => 'note', 'label' => 'Notes'],
                ['value' => 'project', 'label' => 'Projects'],
                ['value' => 'collected', 'label' => 'Collected'],
            ],
            'q' => $q,
            'type' => $type,
            'total' => count($results),
        ]);
    }
}
```

Route: `Route::get('/search', \App\Http\Controllers\SearchController::class)->name('search');`

`resources/js/Pages/Search.tsx` — big SearchInput (auto-submit via `router.get('/search', {q})` on change with debounce), FilterBar of types, results list with type badge + title link + snippet + date, empty state "Type at least 2 characters" / "No results for …".

- [ ] **Step 6: Run migration + tests**

```bash
php artisan migrate && ./vendor/bin/pest tests/Feature/SearchTest.php
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: global full-text search across posts, projects, collected"
```

---

### Task 17: SEO — meta, sitemap, robots, RSS, 404

**Files:**
- Create: `app/Http/Controllers/SeoController.php` (sitemap, robots, rss)
- Create: `resources/js/Pages/errors/404.tsx`, `403.tsx`, `500.tsx`
- Create: `resources/views/errors/*.blade.php` fallbacks for non-Inertia 404s
- Modify: `routes/web.php`, `bootstrap/app.php` (error page mapping)
- Test: `tests/Feature/SeoTest.php`

**Interfaces:**
- Produces: `GET /sitemap.xml` (published posts + projects + static pages, `<lastmod>`), `GET /robots.txt` (allows `/`, sitemap link, disallows `/admin`, `/preview`), `GET /rss.xml` (RSS 2.0 of published articles+notes, max 20, with links/excerpts), 404/403/500 editorial error pages (Inertia `errors/404` etc.).

- [ ] **Step 1: Write failing tests**

`tests/Feature/SeoTest.php`:

```php
<?php

use App\Models\{Post, Project, User};

it('serves rss with only public published posts', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'article', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'title' => 'RSS Visible']);
    Post::factory()->create(['status' => 'draft', 'author_id' => $author->id, 'title' => 'RSS Hidden']);

    $response = $this->get('/rss.xml');
    $response->assertOk()->assertHeader('Content-Type', 'application/xml');
    expect($response->getContent())->toContain('RSS Visible')->not->toContain('RSS Hidden');
});

it('serves sitemap with published content and static pages', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'article', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'slug' => 'in-sitemap']);
    Post::factory()->create(['status' => 'draft', 'slug' => 'not-in-sitemap', 'author_id' => $author->id]);

    $xml = $this->get('/sitemap.xml')->assertOk()->getContent();
    expect($xml)->toContain('/writing/in-sitemap')->not->toContain('not-in-sitemap')
        ->toContain('/writing')->toContain('/projects');
});

it('serves robots.txt disallowing admin', function () {
    $this->get('/robots.txt')->assertOk()
        ->assertSee('Disallow: /admin', false)
        ->assertSee('Sitemap:', false);
});

it('renders editorial 404 page', function () {
    $this->get('/writing/does-not-exist')->assertNotFound();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./vendor/bin/pest tests/Feature/SeoTest.php`
Expected: FAIL.

- [ ] **Step 3: SeoController**

`app/Http/Controllers/SeoController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\{Post, Project};
use Illuminate\Http\{Response, XmlResponse};

class SeoController extends Controller
{
    public function sitemap(): XmlResponse
    {
        $static = ['/', '/writing', '/notes', '/projects', '/collected', '/now', '/about', '/ask', '/search'];

        $urls = collect($static)->map(fn ($path) => ['loc' => url($path), 'lastmod' => now()->toW3cString()]);

        Post::publiclyVisible()->orderByDesc('updated_at')->get(['slug', 'post_type', 'updated_at'])
            ->each(function ($p) use ($urls) {
                $urls->push([
                    'loc' => url('/' . ($p->post_type === 'article' ? 'writing' : 'notes') . '/' . $p->slug),
                    'lastmod' => $p->updated_at->toW3cString(),
                ]);
            });

        Project::publiclyVisible()->orderByDesc('updated_at')->get(['slug', 'updated_at'])
            ->each(fn ($p) => $urls->push(['loc' => url('/projects/' . $p->slug), 'lastmod' => $p->updated_at->toW3cString()]));

        $body = $urls->map(fn ($u) =>
            "  <url>\n    <loc>{$u['loc']}</loc>\n    <lastmod>{$u['lastmod']}</lastmod>\n  </url>")->implode("\n");

        return response(
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n{$body}\n</urlset>",
            200, ['Content-Type' => 'application/xml']
        );
    }

    public function robots(): Response
    {
        $content = "User-agent: *\nDisallow: /admin\nDisallow: /preview\nAllow: /\n\nSitemap: " . url('/sitemap.xml') . "\n";
        return response($content, 200, ['Content-Type' => 'text/plain']);
    }

    public function rss(): Response
    {
        $posts = Post::publiclyVisible()->whereIn('post_type', ['article', 'note'])
            ->latest('published_at')->limit(20)->get();

        $items = $posts->map(function ($p) {
            $link = url('/' . ($p->post_type === 'article' ? 'writing' : 'notes') . '/' . $p->slug);
            $title = e($p->title);
            $description = e($p->excerpt ?: mb_substr(strip_tags((string) $p->body), 0, 300));
            $pubDate = $p->published_at?->toRfc7231String() ?? $p->created_at->toRfc7231String();
            return "    <item>\n      <title>{$title}</title>\n      <link>{$link}</link>\n      <guid isPermaLink=\"true\">{$link}</guid>\n      <description>{$description}</description>\n      <pubDate>{$pubDate}</pubDate>\n    </item>";
        })->implode("\n");

        $xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<rss version=\"2.0\">\n  <channel>\n    <title>" . e(config('app.name', 'Timadey')) . "</title>\n    <link>" . url('/') . "</link>\n    <description>Latest writing and notes from Timadey.</description>\n{$items}\n  </channel>\n</rss>";

        return response($xml, 200, ['Content-Type' => 'application/xml']);
    }
}
```

Routes:

```php
Route::get('/sitemap.xml', [\App\Http\Controllers\SeoController::class, 'sitemap']);
Route::get('/robots.txt', [\App\Http\Controllers\SeoController::class, 'robots']);
Route::get('/rss.xml', [\App\Http\Controllers\SeoController::class, 'rss']);
```

- [ ] **Step 4: Error pages**

Create `resources/js/Pages/errors/404.tsx`:

```tsx
import PublicLayout from '@/Layouts/PublicLayout';
import { Link } from '@inertiajs/react';

export default function NotFound() {
    return (
        <PublicLayout>
            <div className="mx-auto max-w-3xl px-6 py-24 text-center">
                <p className="text-sm font-semibold uppercase tracking-wider text-meta">404</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">This page doesn't exist</h1>
                <p className="mt-3 text-meta">It may have moved, or it was never here.</p>
                <div className="mt-6 flex justify-center gap-3">
                    <Link href="/" className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:opacity-80">Back home</Link>
                    <Link href="/search" className="rounded-md border border-hairline px-4 py-2 text-sm hover:bg-surface">Search the site</Link>
                </div>
            </div>
        </PublicLayout>
    );
}
```

Create `errors/403.tsx` (similar, "You don't have access") and `errors/500.tsx` ("Something went wrong"). In `bootstrap/app.php`:

```php
->withExceptions(function (Exceptions $exceptions) {
    $exceptions->render(fn (\Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e, $request) =>
        $request->header('X-Inertia') ? null : null);
})
```

Simpler and reliable: rely on Laravel's Inertia error page resolution — Inertia resolves `errors/404` automatically when `exceptions` render Inertia responses. Ensure `resources/js/Pages/errors/404.tsx` exists AND add Blade fallbacks `resources/views/errors/404.blade.php`, `403.blade.php`, `500.blade.php` with minimal editorial markup (own CSS-free version using inline styles) for non-Inertia requests (e.g., plain GETs without Inertia header still resolve through Laravel's error rendering which uses `errors::404` view). Keep them simple:

```blade
<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Not found — Timadey</title>
<style>body{font-family:-apple-system,system-ui,sans-serif;background:#fff;color:#1d1d1f;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
main{text-align:center}h1{font-size:1.5rem}a{color:#0066cc}</style></head>
<body><main><p style="font-size:.75rem;letter-spacing:.1em;text-transform:uppercase;color:#86868b">404</p>
<h1>This page doesn't exist</h1><p><a href="/">Back to the homepage</a></p></main></body></html>
```

(Also create 403/500 variants changing the code and message.)

- [ ] **Step 5: SEO meta on remaining public pages**

Ensure `Head` from `@inertiajs/react` sets `<title>` + description on Home, Writing Index, Notes, Projects, Collected, About, Now, Search pages (e.g., "Writing — Timadey"). Add `Route::fallback` returning Inertia 404 for unmatched routes:

```php
Route::fallback(fn () => inertia('errors/404'));
```

- [ ] **Step 6: Run tests**

Run: `./vendor/bin/pest tests/Feature/SeoTest.php`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: sitemap, robots, RSS feed and editorial error pages"
```

---

### Task 18: Demo seeders + admin cleanup wiring

**Files:**
- Create: `database/seeders/DemoContentSeeder.php`
- Create: `database/factories/PostFactory.php`, `ProjectFactory.php`, `CollectedItemFactory.php` (Laravel `make:factory` if missing)
- Modify: `database/seeders/DatabaseSeeder.php`
- Test: `tests/Feature/SeedersTest.php`

**Interfaces:**
- Produces: `php artisan migrate:fresh --seed` creates owner (env), settings, default now/about sections, social links, plus demo content all flagged `is_demo = true` (6 articles, 8 notes, 5 projects, 10 collected items, tags/topics). Demo content must be clearly labelled in titles/excerpts as demonstration where it could be mistaken for real biography — use neutral technical topics, no invented personal history.

- [ ] **Step 1: Write failing test**

`tests/Feature/SeedersTest.php`:

```php
<?php

use App\Models\{CollectedItem, Post, Project, User};

it('seeds demo content flagged as demo', function () {
    $this->seed(\Database\Seeders\DemoContentSeeder::class);

    expect(Post::where('is_demo', true)->count())->toBeGreaterThanOrEqual(10)
        ->and(Project::where('is_demo', true)->count())->toBe(5)
        ->and(CollectedItem::where('is_demo', true)->count())->toBe(10)
        ->and(Post::where('is_demo', false)->count())->toBe(0);
});

it('seeds default now and about sections', function () {
    $this->seed(\Database\Seeders\DemoContentSeeder::class);

    expect(\App\Models\NowSection::count())->toBeGreaterThanOrEqual(8)
        ->and(\App\Models\AboutSection::count())->toBeGreaterThanOrEqual(6);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./vendor/bin/pest tests/Feature/SeedersTest.php`
Expected: FAIL.

- [ ] **Step 3: Factories**

`database/factories/PostFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class PostFactory extends Factory
{
    public function definition(): array
    {
        $title = fake()->unique()->sentence(4);
        return [
            'author_id' => User::factory(),
            'title' => $title,
            'slug' => \Illuminate\Support\Str::slug($title),
            'excerpt' => fake()->paragraph(),
            'body' => "## Section\n\n" . fake()->paragraphs(3, true),
            'post_type' => 'article',
            'status' => 'published',
            'visibility' => 'public',
            'featured' => false,
            'is_demo' => false,
            'published_at' => now()->subDays(fake()->numberBetween(1, 90)),
            'reading_time' => 3,
        ];
    }
}
```

`database/factories/ProjectFactory.php` (name, slug, summary, description, status `building`, visibility `public`, is_demo false) and `database/factories/CollectedItemFactory.php` (title, item_type `book`, visibility `public`, annotation) follow the same shape.

- [ ] **Step 4: DemoContentSeeder**

`database/seeders/DemoContentSeeder.php` — real content, clearly illustrative, no invented biography:

```php
<?php

namespace Database\Seeders;

use App\Models\{AboutSection, CollectedItem, NowSection, Post, Project, Setting, SocialLink, Tag, Topic, User};
use Illuminate\Database\Seeder;

class DemoContentSeeder extends Seeder
{
    public function run(): void
    {
        $owner = User::where('role', 'owner')->first() ?? User::first();

        Setting::updateOrCreate(['key' => 'site_title'], ['value' => 'Timadey']);
        Setting::updateOrCreate(['key' => 'tagline'], ['value' => 'A personal corner of the internet']);
        Setting::updateOrCreate(['key' => 'footer_text'], ['value' => 'Built with care. Demo content is editable and removable in Settings.']);
        Setting::updateOrCreate(['key' => 'home_intro'], ['value' => 'This is a demonstration introduction. Replace it from Admin → Settings.']);
        Setting::updateOrCreate(['key' => 'home_statement'], ['value' => 'Demo statement: currently exploring ideas about technology and product building.']);

        $topics = collect([
            ['name' => 'Technology', 'slug' => 'technology', 'description' => 'How tools shape the way we live and work.'],
            ['name' => 'Product Thinking', 'slug' => 'product-thinking', 'description' => 'Building things people actually use.'],
            ['name' => 'Ideas in Progress', 'slug' => 'ideas-in-progress', 'description' => 'Half-formed thoughts worth developing.'],
        ])->each(fn ($t) => Topic::updateOrCreate(['slug' => $t['slug']], $t));

        $tags = collect(['systems', 'writing', 'learning', 'building', 'research', 'notes'])
            ->each(fn ($name) => Tag::updateOrCreate(['slug' => $name], ['name' => $name]));

        $articles = [
            ['title' => 'Demo: How I Approach Hard Problems', 'excerpt' => 'Demonstration article showing how the writing archive looks and behaves.'],
            ['title' => 'Demo: Notes on Building Personal Tools', 'excerpt' => 'Demonstration article about small, personal software.'],
            ['title' => 'Demo: Reading Notes as Thinking Infrastructure', 'excerpt' => 'Demonstration article on keeping a digital garden.'],
            ['title' => 'Demo: The Difference Between Features and Products', 'excerpt' => 'Demonstration article on product judgment.'],
            ['title' => 'Demo: Learning in Public', 'excerpt' => 'Demonstration article on sharing unfinished work.'],
            ['title' => 'Demo: Why Personal Websites Still Matter', 'excerpt' => 'Demonstration article on owning your corner of the internet.'],
        ];
        foreach ($articles as $i => $a) {
            Post::updateOrCreate(
                ['slug' => \Illuminate\Support\Str::slug($a['title'])],
                array_merge($a, [
                    'author_id' => $owner?->id ?? User::factory()->create()->id,
                    'body' => "## About this demo\n\n{$a['excerpt']}\n\nThis content exists only to demonstrate the interface. Edit or delete it from the admin dashboard.\n\n- Sample list item\n- Another point\n\n```js\nconsole.log('code blocks work');\n```\n\n> A blockquote for flavor.",
                    'post_type' => 'article', 'status' => 'published', 'visibility' => 'public',
                    'featured' => $i < 2, 'is_demo' => true,
                    'published_at' => now()->subDays($i * 3 + 1),
                ])
            );
        }

        $notes = [
            'Demo note: a half-formed thought about interfaces.',
            'Demo note: question — what makes a tool feel personal?',
            'Demo note: reminder to reread an old essay.',
            'Demo note: small observations beat big plans.',
            'Demo note: friction is information.',
            'Demo note: defaults are opinions.',
            'Demo note: depth beats breadth when learning.',
            'Demo note: ship the boring version first.',
        ];
        foreach ($notes as $i => $body) {
            Post::updateOrCreate(
                ['slug' => \Illuminate\Support\Str::slug($body)],
                [
                    'author_id' => $owner?->id ?? User::factory()->create()->id,
                    'title' => ucfirst($body),
                    'excerpt' => $body, 'body' => $body . "\n\nDemonstration note — replace me.",
                    'post_type' => 'note', 'status' => 'published', 'visibility' => 'public',
                    'is_demo' => true, 'published_at' => now()->subHours($i * 7 + 2),
                ]
            );
        }

        $projects = [
            ['name' => 'Demo: Timadey', 'summary' => 'This very website — a personal platform.', 'status' => 'building'],
            ['name' => 'Demo: Idea Scratchpad', 'summary' => 'A tool for capturing and linking raw ideas.', 'status' => 'exploring'],
            ['name' => 'Demo: Reading Tracker', 'summary' => 'Track books with notes and highlights.', 'status' => 'paused'],
            ['name' => 'Demo: Terminal Theme Kit', 'summary' => 'A small collection of dotfiles and scripts.', 'status' => 'completed'],
            ['name' => 'Demo: API Playground', 'summary' => 'An interactive scratchpad for testing endpoints.', 'status' => 'idea'],
        ];
        foreach ($projects as $p) {
            Project::updateOrCreate(
                ['slug' => \Illuminate\Support\Str::slug($p['name'])],
                array_merge($p, [
                    'description' => "## Overview\n\n{$p['summary']}\n\nThis is demonstration content for evaluating the projects interface.",
                    'visibility' => 'public', 'is_demo' => true, 'featured' => str_contains($p['name'], 'Timadey'),
                    'started_at' => now()->subMonths(2),
                ])
            );
        }

        $collected = [
            ['title' => 'Thinking in Systems', 'creator' => 'Donella Meadows', 'item_type' => 'book', 'annotation' => 'Demo annotation: a classic introduction to systems thinking.'],
            ['title' => 'The Design of Everyday Things', 'creator' => 'Don Norman', 'item_type' => 'book', 'annotation' => 'Demo annotation: why affordances matter.'],
            ['title' => 'Demo: Article on personal knowledge management', 'creator' => 'Example Author', 'item_type' => 'article', 'annotation' => 'Demo annotation: useful framing for digital gardens.', 'url' => 'https://example.com'],
            ['title' => 'Demo: Podcast episode on neurotech', 'creator' => 'Example Podcast', 'item_type' => 'podcast', 'annotation' => 'Demo annotation: broad overview of the field.'],
            ['title' => 'Demo: Talk on product craft', 'creator' => 'Example Speaker', 'item_type' => 'video', 'annotation' => 'Demo annotation: good primer on product judgment.'],
            ['title' => 'Figma', 'creator' => 'Example', 'item_type' => 'tool', 'annotation' => 'Demo annotation: everyday design tool.'],
            ['title' => 'Demo quote about curiosity', 'creator' => 'Example', 'item_type' => 'quote', 'annotation' => 'Demo annotation: stands in for a real saved quote.'],
            ['title' => 'Demo: Favorite album this month', 'creator' => 'Example Artist', 'item_type' => 'music', 'annotation' => 'Demo annotation: listening on repeat.'],
            ['title' => 'Demo: Reference website', 'creator' => 'Example', 'item_type' => 'website', 'annotation' => 'Demo annotation: handy reference.', 'url' => 'https://example.com'],
            ['title' => 'Demo: Open source utility', 'creator' => 'Example Org', 'item_type' => 'tool', 'annotation' => 'Demo annotation: small quality-of-life tool.', 'url' => 'https://example.com'],
        ];
        foreach ($collected as $c) {
            CollectedItem::updateOrCreate(
                ['title' => $c['title']],
                array_merge($c, ['visibility' => 'public', 'is_demo' => true])
            );
        }

        $nowSections = [
            ['key' => 'building', 'label' => 'Currently building', 'body' => 'Demo: refining this website.'],
            ['key' => 'learning', 'label' => 'Currently learning', 'body' => 'Demo: exploring how personal software should work.'],
            ['key' => 'reading', 'label' => 'Reading', 'body' => 'Demo: a book about systems thinking.'],
            ['key' => 'listening', 'label' => 'Listening to', 'body' => 'Demo: an instrumental playlist.'],
            ['key' => 'playing', 'label' => 'Playing', 'body' => null],
            ['key' => 'exploring', 'label' => 'Exploring', 'body' => 'Demo: ideas around digital gardens.'],
            ['key' => 'questions', 'label' => 'Current questions', 'body' => 'Demo: what makes an interface feel personal?'],
            ['key' => 'milestones', 'label' => 'Recent milestones', 'body' => 'Demo: launched the first version.'],
        ];
        foreach ($nowSections as $i => $s) {
            NowSection::updateOrCreate(['key' => $s['key']], $s + ['sort_order' => $i, 'visible' => true]);
        }

        $aboutSections = [
            ['key' => 'intro', 'title' => 'Hello', 'body' => 'Demo introduction — replace this with your own words in Admin → About.'],
            ['key' => 'background', 'title' => 'Background', 'body' => 'Demo background section. Nothing here is a real biography.'],
            ['key' => 'interests', 'title' => 'Interests', 'body' => 'Demo interests: technology, product thinking, writing.'],
            ['key' => 'principles', 'title' => 'Principles', 'body' => 'Demo principles: clarity over cleverness; ship and learn.'],
            ['key' => 'ambitions', 'title' => 'Ambitions', 'body' => 'Demo ambitions section — edit with your own.'],
            ['key' => 'contact', 'title' => 'Contact', 'body' => 'Demo contact section. Add your real contact details in Settings.'],
        ];
        foreach ($aboutSections as $i => $s) {
            AboutSection::updateOrCreate(['key' => $s['key']], $s + ['sort_order' => $i, 'visible' => true]);
        }

        SocialLink::updateOrCreate(
            ['platform' => 'GitHub'],
            ['url' => 'https://github.com', 'label' => 'GitHub', 'sort_order' => 0, 'visible' => true]
        );
    }
}
```

`DatabaseSeeder::run()` calls `OwnerSeeder` then `DemoContentSeeder`.

- [ ] **Step 5: Run full seed + tests**

```bash
php artisan migrate:fresh --seed && ./vendor/bin/pest
```

Expected: all PASS. Manually verify homepage shows demo feed.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: demo content seeders with clear labelling and cleanup flag"
```

---

### Task 19: Public REST API endpoints

**Files:**
- Create: `app/Http/Controllers/Api/PostController.php`, `ProjectController.php`, `CollectedItemController.php`, `SearchController.php`
- Create: `app/Http/Resources/PostResource.php`, `ProjectResource.php`, `CollectedItemResource.php`
- Create: `routes/api.php` (exists by default)
- Modify: `routes/api.php`
- Test: `tests/Feature/PublicApiTest.php`
- Create: `docs/api.md`

**Interfaces:**
- Produces:
  - `GET /api/posts?type=&q=&page=` → `{ data: [{id,title,slug,excerpt,post_type,reading_time,published_at,tags,topics,url}], links, meta }`
  - `GET /api/posts/{slug}` → single post incl. `body_html`
  - `GET /api/notes`, `GET /api/notes/{slug}` (same resources, type=note)
  - `GET /api/projects?status=`, `GET /api/projects/{slug}`
  - `GET /api/collected?type=&q=`
  - `GET /api/search?q=&type=`
  - All JSON, published+public only, paginated 15/page, 404 on missing.

- [ ] **Step 1: Write failing tests**

`tests/Feature/PublicApiTest.php`:

```php
<?php

use App\Models\{CollectedItem, Post, Project, User};

it('returns published posts as json', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'article', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'title' => 'API Post']);
    Post::factory()->create(['status' => 'draft', 'author_id' => $author->id]);

    $this->getJson('/api/posts')->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'API Post');
});

it('returns single post with body html', function () {
    $author = User::factory()->create();
    Post::factory()->create(['slug' => 'api-one', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'body' => '**hi**']);

    $this->getJson('/api/posts/api-one')->assertOk()
        ->assertJsonPath('data.title', 'api-one')
        ->assertJsonStructure(['data' => ['title', 'body_html', 'url']]);
});

it('404s on draft via api', function () {
    $author = User::factory()->create();
    Post::factory()->create(['slug' => 'draft-api', 'status' => 'draft', 'author_id' => $author->id]);
    $this->getJson('/api/posts/draft-api')->assertNotFound();
});

it('returns projects and collected', function () {
    Project::factory()->create(['name' => 'API Project', 'visibility' => 'public']);
    CollectedItem::factory()->create(['title' => 'API Item', 'visibility' => 'public']);

    $this->getJson('/api/projects')->assertOk()->assertJsonPath('data.0.name', 'API Project');
    $this->getJson('/api/collected')->assertOk()->assertJsonPath('data.0.title', 'API Item');
});

it('searches via api', function () {
    $author = User::factory()->create();
    Post::factory()->create(['title' => 'Quantum Notes', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id]);
    $this->getJson('/api/search?q=quantum')->assertOk()->assertJsonCount(1, 'data');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./vendor/bin/pest tests/Feature/PublicApiTest.php`
Expected: FAIL.

- [ ] **Step 3: Resources**

`app/Http/Resources/PostResource.php`:

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'excerpt' => $this->excerpt,
            'post_type' => $this->post_type,
            'reading_time' => $this->reading_time,
            'featured' => $this->featured,
            'published_at' => $this->published_at?->toIso8601String(),
            'tags' => $this->whenLoaded('tags', fn () => $this->tags->pluck('name')),
            'topics' => $this->whenLoaded('topics', fn () => $this->topics->pluck('name')),
            'url' => '/' . ($this->post_type === 'article' ? 'writing' : 'notes') . '/' . $this->slug,
            'body_html' => $this->when($this->resource->relationLoaded('author') || app()->bound('markdown'), fn () =>
                app(\App\Services\MarkdownService::class)->render((string) $this->body)),
        ];
    }
}
```

Simplify: always include `body_html` rendered (small payload; public content only):

```php
'body_html' => app(\App\Services\MarkdownService::class)->render((string) $this->body),
```

`ProjectResource` (name, slug, summary, description_html, status, urls, dates, tags, `url: /projects/{slug}`) and `CollectedItemResource` (title, url, creator, item_type, annotation, tags) follow the same pattern.

- [ ] **Step 4: API controllers + routes**

`routes/api.php`:

```php
<?php

use App\Http\Controllers\Api;
use Illuminate\Support\Facades\Route;

Route::get('/posts', [Api\PostController::class, 'index']);
Route::get('/posts/{slug}', [Api\PostController::class, 'show'])->whereAlphaNumeric('slug');
Route::get('/notes', [Api\PostController::class, 'notes']);
Route::get('/notes/{slug}', [Api\PostController::class, 'showNote'])->whereAlphaNumeric('slug');
Route::get('/projects', [Api\ProjectController::class, 'index']);
Route::get('/projects/{slug}', [Api\ProjectController::class, 'show'])->whereAlphaNumeric('slug');
Route::get('/collected', [Api\CollectedItemController::class, 'index']);
Route::get('/search', [Api\SearchController::class, '__invoke']);
```

`app/Http/Controllers/Api/PostController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PostResource;
use App\Models\Post;
use Illuminate\Http\Request;

class PostController extends Controller
{
    public function index(Request $request)
    {
        $query = Post::publiclyVisible()->ofType('article')->with(['tags', 'topics'])->latest('published_at');
        if ($q = $request->query('q')) $query->where(fn ($w) => $w->where('title', 'like', "%{$q}%"));
        return PostResource::collection($query->paginate(15)->withQueryString());
    }

    public function notes(Request $request)
    {
        $query = Post::publiclyVisible()->ofType('note')->with(['tags', 'topics'])->latest('published_at');
        if ($q = $request->query('q')) $query->where(fn ($w) => $w->where('title', 'like', "%{$q}%"));
        return PostResource::collection($query->paginate(15)->withQueryString());
    }

    public function show(string $slug)
    {
        return new PostResource(Post::publiclyVisible()->ofType('article')->where('slug', $slug)->with(['tags', 'topics'])->firstOrFail());
    }

    public function showNote(string $slug)
    {
        return new PostResource(Post::publiclyVisible()->ofType('note')->where('slug', $slug)->with(['tags', 'topics'])->firstOrFail());
    }
}
```

`app/Http/Controllers/Api/ProjectController.php` (index with `status` filter + `ProjectResource::collection`, show by slug), `CollectedItemController.php` (index with `type`/`q` filters), `SearchController.php` (injects `SearchService`, returns `response()->json(['data' => $results])`).

- [ ] **Step 5: Run tests**

Run: `./vendor/bin/pest tests/Feature/PublicApiTest.php`
Expected: PASS.

- [ ] **Step 6: Write `docs/api.md`**

Document every endpoint: method, path, query params, sample response JSON, status codes (200/400/404), note that only published public content is exposed and no auth is required for read-only endpoints. Also document that admin endpoints are session-authenticated Inertia routes (not part of the public API).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: public REST API with docs for posts, projects, collected, search"
```

---

### Task 20: Ask Timadey placeholder + README + .env.example + Docker scaffold

**Files:**
- Create: `resources/js/Pages/Ask.tsx`
- Create: `README.md`, `.env.example` (finalize)
- Create: `docker/Dockerfile`, `docker-compose.yml`, `docker/README.md`
- Modify: `routes/web.php` (Ask route)
- Test: `tests/Feature/AskPlaceholderTest.php`

**Interfaces:**
- Produces: `GET /ask` renders editorial placeholder page ("Ask Timadey arrives in Phase 3" with suggested-questions list disabled); README with setup; `.env.example` complete; Docker scaffold runnable in Phase 5.

- [ ] **Step 1: Write failing test**

`tests/Feature/AskPlaceholderTest.php`:

```php
<?php

it('shows ask placeholder page', function () {
    $this->get('/ask')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Ask'));
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./vendor/bin/pest tests/Feature/AskPlaceholderTest.php`
Expected: FAIL.

- [ ] **Step 3: Ask page**

`resources/js/Pages/Ask.tsx`:

```tsx
import PublicLayout from '@/Layouts/PublicLayout';
import { Head } from '@inertiajs/react';
import { MessageCircle } from 'lucide-react';

const suggested = [
    'What kinds of problems is Timadey most interested in solving?',
    'What is Timadey currently building?',
    'Which articles should I read to understand the worldview?',
];

export default function Ask() {
    return (
        <PublicLayout>
            <Head title="Ask Timadey" />
            <div className="mx-auto max-w-3xl px-6 pt-12 pb-16">
                <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    <h1 className="text-3xl font-semibold tracking-tight">Ask Timadey</h1>
                </div>
                <p className="mt-4 max-w-2xl text-lg text-ink">
                    An AI guide to the published writing, projects, and ideas on this site.
                </p>
                <div className="mt-6 rounded-md border border-hairline bg-surface px-5 py-4 text-sm text-meta">
                    Arriving in Phase 3. This page will answer questions using only published material on this site,
                    with links back to the sources — never invented facts.
                </div>
                <h2 className="mt-10 text-sm font-semibold uppercase tracking-wider text-meta">Questions it will answer</h2>
                <ul className="mt-4 divide-y divide-hairline">
                    {suggested.map((q) => (
                        <li key={q} className="py-3 text-ink opacity-60">{q}</li>
                    ))}
                </ul>
            </div>
        </PublicLayout>
    );
}
```

Route: `Route::get('/ask', fn () => inertia('Ask'));`

- [ ] **Step 4: README.md**

Write `README.md` covering:

- What Timadey is (phase overview table).
- Requirements: PHP 8.4, Composer, Node 22, PostgreSQL (DBngin).
- Setup:

```bash
composer install
cp .env.example .env
php artisan key:generate
# create DB 'timadey' in DBngin, then:
php artisan migrate:fresh --seed
npm install
npm run build   # or: npm run dev
php artisan serve
```

- Admin login: `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`.
- Demo content note + how to remove (Admin → Settings → Remove demo content).
- Testing: `./vendor/bin/pest`, `npm test`.
- Environment variables table.
- Phase roadmap (1–5) and what's deferred.

- [ ] **Step 5: Finalize `.env.example`**

Ensure it contains: `APP_NAME=Timadey`, `APP_URL`, `DB_CONNECTION=pgsql`, `DB_HOST=127.0.0.1`, `DB_PORT=5432`, `DB_DATABASE=timadey`, `DB_USERNAME=postgres`, `DB_PASSWORD=`, `ADMIN_EMAIL=`, `ADMIN_PASSWORD=`, `SESSION_SECURE_COOKIE=false` (true in production), plus future Phase 3 vars commented out: `# LLM_PROVIDER=`, `# LLM_API_KEY=`, `# LLM_MODEL=`, and `# FILESYSTEM_DISK=public`.

- [ ] **Step 6: Docker scaffold**

`Dockerfile` (php:8.4-fpm + pdo_pgsql + node build stage), `docker-compose.yml` (app + postgres:16 + nginx), `docker/README.md` noting it's a Phase 5 target scaffold — not required for local dev. Keep minimal but valid.

- [ ] **Step 7: Run tests + build**

```bash
./vendor/bin/pest && npm test && npm run build
```

Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: ask placeholder, README, env example, docker scaffold"
```

---

### Task 21: Final verification pass

**Files:**
- Modify: any failing areas discovered
- Test: full suite

- [ ] **Step 1: Full backend suite**

Run: `php artisan migrate:fresh --seed && ./vendor/bin/pest`
Expected: all PASS, zero failures.

- [ ] **Step 2: Frontend build + tests**

Run: `npm test && npm run build && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 3: Manual smoke checklist**

```bash
php artisan serve
```

Verify in browser: `/` loads with demo feed; `/writing` + article page render markdown; `/notes`, `/projects`, `/collected`, `/about`, `/now`, `/search?q=test`, `/ask` all load; `/admin/login` signs in with env creds; admin can create → preview → publish an article that appears on `/writing`; draft does not appear; draft URL 404s logged out; `/rss.xml` and `/sitemap.xml` valid; mobile nav drawer works; `/admin/settings/demo-content` removes demo rows.

- [ ] **Step 4: Fix issues found, keep tests green**

Any fix lands with its regression test when practical.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: phase 1 verification fixes"
```

---

## Self-Review Notes

- **Spec coverage:** Home/ Writing/Notes/Projects/Collected/About/Now/Search/Ask-placeholder routes (Tasks 10–17, 20); models+migrations (3); public APIs (19); admin auth (5); admin content management (6–9); SEO/RSS (17); demo seed (18); design system (2); tests per spec §17 subset applicable to Phase 1 (each task). Comments/visitor auth/AI/integration tables intentionally deferred to Phases 2–4 per spec §18.
- **Type consistency:** `PostResource`, `FeedService::recent()`, route names `admin.posts.*`, middleware alias `owner`, and component props (`Pagination.links`, `FilterBar.options`) are consistent across tasks.
- **Deviation logged:** Macbook/black palette replaces spec §3 palette — owner-approved, recorded in spec doc.

