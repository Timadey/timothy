# Site Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt the user-provided TT/π monogram as the site brand — real favicon set, monogram in public + admin headers, and a 1200×630 og/twitter default card for imageless pages.

**Architecture:** One committed source PNG + a one-time Pillow generator script produce static assets committed under `public/`. Head tags are emitted server-side in `app.blade.php`; og/twitter fallback is added in `App\Support\Seo` after the component match (and in `baseResult()` for admin); header marks are plain `<img>` tags in the React layouts.

**Tech Stack:** Python 3 + Pillow (already available at 11.3), Laravel Blade, `App\Support\Seo`, Inertia React layouts, Pest, Playwright e2e.

## Global Constraints

- Source logo lives at `resources/brand/logo-source.png` (committed — the original only exists in `~/Downloads` otherwise).
- All served assets are static files under `public/` — never generate images at runtime.
- Head tags must be rendered **server-side in `resources/views/app.blade.php`** — Inertia's `<Head>` is client-only (no SSR) and is wrong for icons/meta (established by the RSS fix in this repo).
- Og/twitter card fallback: content images (post covers, hero avatar) always win; the card `/images/og-card.png` appears only when the component has no image.
- Header/admin mark: `alt="Timadey"`, black tile kept (rounding via CSS only — never baked into PNGs).
- theme-color is `#ffffff` (site chrome), not the logo's black.
- The TTADELEKE wordmark is trimmed out of every asset except nothing — i.e. no asset uses the wordmark; card text is "Timadey".
- e2e runs against QA, which serves `public/build` — run `npm run build` after any `.tsx` change before Playwright.
- Stage only this task's files in each commit — unrelated in-progress work (ask email composer) must stay out.
- QA server for Playwright is auto-started by `playwright.config.ts` (`webServer`, port 8892).

---

### Task 1: Brand assets (source, generator, sanity test)

**Files:**
- Create: `tests/Feature/BrandAssetsTest.php`
- Create: `resources/brand/logo-source.png` (copy of `/Users/macbook/Downloads/timothy/cv/my site/Minimalist TT Pi Monogram Logo.png`)
- Create: `tools/generate-brand.py`
- Generate (committed outputs): `public/favicon.ico`, `public/favicon-32x32.png`, `public/favicon-16x16.png`, `public/apple-touch-icon.png`, `public/images/logo-mark.png`, `public/images/og-card.png`

**Interfaces:**
- Produces: the six asset files above at exact paths (consumed by Tasks 2–5); `public/images/og-card.png` URL `/images/og-card.png` (consumed by Task 3); `public/images/logo-mark.png` URL `/images/logo-mark.png` (consumed by Tasks 4–5).
- Facts derived from source: 1254², monogram bright-pixel bounds x 398–853 / y 445–726, wordmark starts y 787, cream `rgb(241,235,229)`.

- [ ] **Step 1: Write the failing asset-sanity test**

Create `tests/Feature/BrandAssetsTest.php`:

```php
<?php

it('ships non-empty brand image assets', function (string $path) {
    $absolute = public_path($path);

    expect(file_exists($absolute))->toBeTrue()
        ->and(filesize($absolute))->toBeGreaterThan(0);
})->with([
    'favicon' => 'favicon.ico',
    'favicon png 32' => 'favicon-32x32.png',
    'favicon png 16' => 'favicon-16x16.png',
    'apple touch' => 'apple-touch-icon.png',
    'header mark' => 'images/logo-mark.png',
    'og card' => 'images/og-card.png',
]);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./vendor/bin/pest --filter="non-empty brand"`
Expected: 6 FAILED — `file_exists(...)` is false (only `favicon.ico` exists, and as a 0-byte file `filesize > 0` also fails).

- [ ] **Step 3: Commit source logo**

```bash
mkdir -p resources/brand tools
cp "/Users/macbook/Downloads/timothy/cv/my site/Minimalist TT Pi Monogram Logo.png" resources/brand/logo-source.png
git add resources/brand/logo-source.png
git commit -m "chore: add source logo for brand asset generation"
```

- [ ] **Step 4: Write the generator script**

Create `tools/generate-brand.py`:

```python
#!/usr/bin/env python3
"""Regenerate static brand assets from resources/brand/logo-source.png.

Run once per logo change: python3 tools/generate-brand.py
Generated files are committed; CI never runs this script.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "resources" / "brand" / "logo-source.png"
PUBLIC = ROOT / "public"
IMAGES = PUBLIC / "images"

# Monogram-only region of the 1254x1254 source: a bright-pixel scan found the
# monogram at y 445-726 / x 398-853; the "TTADELEKE" wordmark starts at y 787.
# This crop is monogram + 40px of black padding and stops well above it.
CROP = (358, 405, 894, 767)
TILE = 536  # square canvas: crop is 536 wide, pasted centered on black
MARK = 512
CREAM = (241, 235, 229)
CARD = (1200, 630)
FONT = "/System/Library/Fonts/Helvetica.ttc"


def build_mark() -> Image.Image:
    source = Image.open(SOURCE).convert("RGB")
    tile = source.crop(CROP)
    canvas = Image.new("RGB", (TILE, TILE), (0, 0, 0))
    canvas.paste(tile, (0, (TILE - tile.height) // 2))
    return canvas.resize((MARK, MARK), Image.LANCZOS)


def build_card(mark: Image.Image) -> Image.Image:
    card = Image.new("RGB", CARD, (0, 0, 0))
    draw = ImageDraw.Draw(card)
    font = ImageFont.truetype(FONT, 96, index=1)  # index 1 = Helvetica Bold
    mark_px = 220
    gap = 48
    text = "Timadey"
    text_w = draw.textlength(text, font=font)
    x = int((CARD[0] - (mark_px + gap + text_w)) // 2)
    y = (CARD[1] - mark_px) // 2
    card.paste(mark.resize((mark_px, mark_px), Image.LANCZOS), (x, y))
    draw.text((x + mark_px + gap, CARD[1] // 2), text, font=font, fill=CREAM, anchor="lm")
    return card


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"missing source logo: {SOURCE} (commit it first)")

    mark = build_mark()
    IMAGES.mkdir(parents=True, exist_ok=True)

    outputs = [
        (IMAGES / "logo-mark.png", mark),
        (PUBLIC / "favicon-32x32.png", mark.resize((32, 32), Image.LANCZOS)),
        (PUBLIC / "favicon-16x16.png", mark.resize((16, 16), Image.LANCZOS)),
        (PUBLIC / "apple-touch-icon.png", mark.resize((180, 180), Image.LANCZOS)),
        (IMAGES / "og-card.png", build_card(mark)),
    ]
    for path, image in outputs:
        image.save(path, optimize=True)
    mark.save(PUBLIC / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])

    for path in [p for p, _ in outputs] + [PUBLIC / "favicon.ico"]:
        size = path.stat().st_size
        if size == 0:
            raise SystemExit(f"generated empty file: {path}")
        print(f"{path.relative_to(ROOT)}: {size} bytes")


if __name__ == "__main__":
    main()
```

- [ ] **Step 5: Run the generator**

Run: `python3 tools/generate-brand.py`
Expected: prints six lines like `public/images/logo-mark.png: <n> bytes`, all non-zero, exit 0.

- [ ] **Step 6: Visually verify the crops**

Run: read tool on `public/images/logo-mark.png` (expect: TT/π monogram on black, **no** TTADELEKE text, roughly centered) and `public/images/og-card.png` (expect: 1200×630 black, monogram left of "Timadey" in cream, centered as a group). If the wordmark leaked into the crop, adjust `CROP` bottom below 787 and rerun Step 5.

- [ ] **Step 7: Run test to verify it passes**

Run: `./vendor/bin/pest --filter="non-empty brand"`
Expected: 6 PASS.

- [ ] **Step 8: Commit**

```bash
git add tests/Feature/BrandAssetsTest.php tools/generate-brand.py public/favicon.ico public/favicon-32x32.png public/favicon-16x16.png public/apple-touch-icon.png public/images/logo-mark.png public/images/og-card.png
git commit -m "feat: generate brand favicon set, header mark, and og card"
```

---

### Task 2: Head tags (icons + theme-color)

**Files:**
- Test: `tests/Feature/SeoMetaTest.php` (append)
- Modify: `resources/views/app.blade.php` (after the RSS `<link>` block, before the og loop)

**Interfaces:**
- Consumes: asset files from Task 1 (`/favicon.ico`, `/favicon-32x32.png`, `/favicon-16x16.png`, `/apple-touch-icon.png`).
- Produces: five static head tags asserted by the test below.

- [ ] **Step 1: Write the failing test**

Append to `tests/Feature/SeoMetaTest.php`:

```php
it('emits favicon, touch icon, and theme-color in the head', function () {
    $html = $this->get('/')->assertOk()->getContent();

    expect($html)
        ->toContain('<link rel="icon" href="/favicon.ico">')
        ->toContain('<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">')
        ->toContain('<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">')
        ->toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png">')
        ->toContain('<meta name="theme-color" content="#ffffff">');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./vendor/bin/pest --filter="favicon, touch icon"`
Expected: 1 FAILED — head HTML does not contain `rel="icon"`.

- [ ] **Step 3: Add the tags to the Blade head**

In `resources/views/app.blade.php`, insert immediately after the RSS block:

```blade
    @if ($seo['rss'])
        <link rel="alternate" type="application/rss+xml" title="RSS feed" href="/rss.xml">
    @endif
    <link rel="icon" href="/favicon.ico">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <meta name="theme-color" content="#ffffff">
```

- [ ] **Step 4: Run test to verify it passes**

Run: `./vendor/bin/pest --filter="favicon, touch icon"`
Expected: 1 PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/Feature/SeoMetaTest.php resources/views/app.blade.php
git commit -m "feat: emit favicon, touch icon, and theme-color in head"
```

---

### Task 3: og/twitter default card

**Files:**
- Test: `tests/Feature/SeoMetaTest.php` — replace the whole `it('emits og and twitter image only when cover is set', ...)` block (starts line 84)
- Modify: `app/Support/Seo.php` — `baseResult()` (~line 320) and `forPage()` (public branch return)

**Interfaces:**
- Consumes: `/images/og-card.png` from Task 1.
- Produces: every public page without its own image gets `og:image` + `twitter:image` = `url('/images/og-card.png')` and `twitter:card` = `summary_large_image`; pages with content images keep them unchanged.

- [ ] **Step 1: Replace the test (RED)**

Replace the existing block in `tests/Feature/SeoMetaTest.php`:

```php
it('emits cover image when set and brand card otherwise', function () {
    seoMakeArticle(['title' => 'No Cover', 'slug' => 'no-cover', 'cover_image' => null]);
    seoMakeArticle(['title' => 'With Cover', 'slug' => 'with-cover', 'cover_image' => 'covers/hero.jpg']);

    $without = $this->get('/writing/no-cover')->assertOk()->getContent();
    $cardUrl = url('/images/og-card.png');
    expect($without)
        ->toContain('property="og:image" content="'.$cardUrl.'"')
        ->toContain('name="twitter:image" content="'.$cardUrl.'"')
        ->toContain('name="twitter:card" content="summary_large_image"');

    $with = $this->get('/writing/with-cover')->assertOk()->getContent();
    $coverUrl = url('/covers/hero.jpg');
    expect($with)
        ->toContain('property="og:image" content="'.$coverUrl.'"')
        ->toContain('name="twitter:image" content="'.$coverUrl.'"')
        ->toContain('name="twitter:card" content="summary_large_image"');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./vendor/bin/pest --filter="cover image"`
Expected: 1 FAILED — `No Cover` page HTML lacks `og:image` (`toEqual`/`toContain` failure at the first assertion).

- [ ] **Step 3: Implement the fallback in Seo.php**

3a. In `baseResult()` (~line 320), change the image argument of both tag builders from `null` to the card URL:

```php
            'og' => self::ogTags(
                'website',
                $tagline !== null ? "{$siteTitle} — {$tagline}" : $siteTitle,
                $tagline,
                self::canonicalPath(),
                url('/images/og-card.png'),
                $siteTitle
            ),
            'twitter' => self::twitterTags(
                $tagline !== null ? "{$siteTitle} — {$tagline}" : $siteTitle,
                $tagline,
                url('/images/og-card.png')
            ),
```

3b. In `forPage()`, the public branch currently ends `return match ($component) { ... };`. Assign it and post-process (components rebuild their `og`/`twitter` arrays from scratch, discarding the base defaults, so guard after the match too):

```php
        $result = match ($component) {
            'Home' => self::home($props, $base),
            'Writing/Show' => self::writingShow($props, $base),
            'Writing/Index' => self::collection($base, 'Writing', 'Essays and articles.'),
            'Notes/Show' => self::notesShow($props, $base),
            'Notes/Index' => self::collection($base, 'Notes', 'Short notes and updates.'),
            'Projects/Show' => self::projectsShow($props, $base),
            'Projects/Index' => self::collection($base, 'Projects', 'Projects and things I am building.'),
            'Collected/Index' => self::collection($base, 'Collected', 'Things I have collected and found interesting.'),
            'Activity/Index' => self::collection($base, 'Lately', 'Everything I have been writing, building, and collecting.'),
            'About' => self::about($props, $base),
            'Now' => self::now($props, $base),
            'Search' => self::searchLike($base, 'Search'),
            'Ask' => self::searchLike($base, 'Ask'),
            default => $base,
        };

        if (! isset($result['og']['og:image'])) {
            $result['og']['og:image'] = url('/images/og-card.png');
        }
        if (! isset($result['twitter']['twitter:image'])) {
            $result['twitter']['twitter:image'] = url('/images/og-card.png');
            $result['twitter']['twitter:card'] = 'summary_large_image';
        }

        return $result;
```

Also update the `@return array{...}` docblock: add `rss: bool,` after `robots: ?string,` (added earlier — verify present, add if missing).

- [ ] **Step 4: Run test to verify it passes**

Run: `./vendor/bin/pest --filter="cover image"`
Expected: 1 PASS.

- [ ] **Step 5: Run full Pest suite for fallout**

Run: `./vendor/bin/pest`
Expected: all PASS (220+). The only tests asserting og/twitter absence were `SeoMetaTest:89-91` (replaced above) and `HomeHeroTest:140` (avatar present — unaffected). If anything else fails, inspect: content-image-wins behavior must not regress.

- [ ] **Step 6: Commit**

```bash
git add tests/Feature/SeoMetaTest.php app/Support/Seo.php
git commit -m "feat: default og and twitter image to brand card"
```

---

### Task 4: Public header monogram

**Files:**
- Test: `e2e/public-render.spec.ts` (append)
- Modify: `resources/js/Layouts/PublicLayout.tsx:23-25`

**Interfaces:**
- Consumes: `/images/logo-mark.png` (Task 1).
- Produces: header `<img src="/images/logo-mark.png" alt="Timadey" width={28} height={28}>` inside the home `<Link>` (asserted by test; also required by Task 6 full suite).

- [ ] **Step 1: Write the failing e2e test**

Append to `e2e/public-render.spec.ts`:

```ts
test('header shows the brand monogram next to the site name', async ({ page }) => {
    await page.goto('/');
    const mark = page.locator('header img[alt="Timadey"]');
    await expect(mark).toBeVisible();
    await expect(mark).toHaveAttribute('src', '/images/logo-mark.png');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test e2e/public-render.spec.ts -g "brand monogram"`
Expected: 1 FAILED — `header img[alt="Timadey"]` not found (header is text-only; QA serves the current `public/build`).

- [ ] **Step 3: Add the mark to the public header**

In `resources/js/Layouts/PublicLayout.tsx`, replace lines 23-25:

```tsx
                    <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-primary">
                        <img src="/images/logo-mark.png" alt="Timadey" width={28} height={28} className="rounded-lg" />
                        Timadey
                    </Link>
```

- [ ] **Step 4: Build for QA**

Run: `npm run build`
Expected: `✓ built in ...s`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx playwright test e2e/public-render.spec.ts -g "brand monogram"`
Expected: 1 PASS.

- [ ] **Step 6: Commit**

```bash
git add e2e/public-render.spec.ts resources/js/Layouts/PublicLayout.tsx
git commit -m "feat: show brand monogram in public header"
```

---

### Task 5: Admin sidebar + login monogram

**Files:**
- Test: `e2e/admin-workflow.spec.ts` (append)
- Modify: `resources/js/Layouts/AdminLayout.tsx:89-91` (desktop sidebar brand)
- Modify: `resources/js/Pages/Admin/Login.tsx` (header span ~line 15)

**Interfaces:**
- Consumes: `/images/logo-mark.png` (Task 1), `loginAsOwner` from `./fixtures` (already imported in admin-workflow.spec.ts).
- Produces: `aside img[alt="Timadey"]` on admin pages; `header img[alt="Timadey"]` on the login page.

- [ ] **Step 1: Write the failing e2e test**

Append to `e2e/admin-workflow.spec.ts`:

```ts
test('brand monogram appears on login and in the admin sidebar', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.locator('header img[alt="Timadey"]')).toBeVisible();

    await loginAsOwner(page);
    await expect(page.locator('aside img[alt="Timadey"]')).toBeVisible();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test e2e/admin-workflow.spec.ts -g "brand monogram"`
Expected: 1 FAILED — login header has no `img`.

- [ ] **Step 3: Add marks to Login and AdminLayout**

In `resources/js/Pages/Admin/Login.tsx` (~line 15), replace the header span:

```tsx
            <header className="px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-semibold tracking-tight text-primary">
                    <img src="/images/logo-mark.png" alt="Timadey" width={28} height={28} className="rounded-lg" />
                    Timadey Admin
                </span>
            </header>
```

In `resources/js/Layouts/AdminLayout.tsx` (lines 89-91), replace the sidebar brand `<p>`:

```tsx
                    <p className="mb-4 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-meta">
                        <img src="/images/logo-mark.png" alt="Timadey" width={24} height={24} className="rounded-md" />
                        Timadey
                    </p>
```

(Mobile admin header at line 73 stays text-only — spec: sidebar + login only.)

- [ ] **Step 4: Build for QA**

Run: `npm run build`
Expected: `✓ built in ...s`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx playwright test e2e/admin-workflow.spec.ts -g "brand monogram"`
Expected: 1 PASS.

- [ ] **Step 6: Commit**

```bash
git add e2e/admin-workflow.spec.ts resources/js/Layouts/AdminLayout.tsx resources/js/Pages/Admin/Login.tsx
git commit -m "feat: brand admin sidebar and login page"
```

---

### Task 6: Full verification gates

**Files:** none modified (fix only if a gate fails).

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: green gate evidence for the completed feature.

- [ ] **Step 1: Type check**

Run: `npx tsc --noEmit`
Expected: no output (clean).

- [ ] **Step 2: Pest**

Run: `./vendor/bin/pest`
Expected: all PASS (220+ tests).

- [ ] **Step 3: Vitest**

Run: `npx vitest run`
Expected: `Test Files 25 passed (25)`, `Tests 84 passed (84)` (or more if suites grew).

- [ ] **Step 4: Rebuild + full Playwright**

Run: `npm run build && npx playwright test`
Expected: all PASS (~63 tests). Known flake pattern: `search-filter` specs may time out once under DB contention — if any test fails, rerun just that file once (`npx playwright test <file>`); a pass on rerun = flake (record it), a consistent fail = real regression to fix before finishing.

- [ ] **Step 5: Final commit (only if fixes were needed)**

```bash
git add -A
git status
git commit -m "fix: brand feature gate fixes"
```

(If gates passed with no changes, skip this commit.)

---

## Self-Review Notes (plan author)

- Spec coverage: §3 assets → Task 1; §4 head → Task 2, og/twitter → Task 3, public header → Task 4, admin → Task 5; §5 tests → Tasks 1–4 + gates in 6; error pages explicitly out of scope (untouched).
- Deviation from spec wording: spec says og fallback "lives in `baseResult()`" — implementation adds it in `baseResult()` **and** guards after the component match, because every component rebuilds the `og` array from scratch and would discard base defaults. Same observable behavior; the spec's intent (one code path, admin included) holds.
- Type/name consistency: `/images/logo-mark.png`, `/images/og-card.png`, `alt="Timadey"` used identically across Tasks 1–5.
