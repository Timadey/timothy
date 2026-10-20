# Code block button, About preview, Now nav comment-out — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a visible Code block button to the shared RichEditor, an Edit/Preview toggle on the admin About page, and remove the Now link from the public nav.

**Architecture:** Three additive UI edits, no backend/schema/API/CSS changes. The shared `RichEditor` top bar gains a `toggleCodeBlock` button (Posts/Projects/About all inherit it); `Admin/About.tsx` gains the Posts-style `preview` state swap to the existing `PreviewPane format="html"`; `nav.ts` has its Now entry commented out (one source feeds desktop + mobile nav).

**Tech Stack:** React 19 + Inertia, Tiptap 3.32 StarterKit, vitest + @testing-library/react (jsdom, Range polyfill in `resources/js/setupTests.ts`), Pest, Playwright.

## Global Constraints

- TDD: every task writes the failing test FIRST and watches it fail for the feature-missing reason before implementing.
- Tests live only under `resources/js/Components/__tests__/` — `app.tsx`/`ssr.tsx` glob `./Pages/**/*.tsx` into the production bundle; a test under `Pages/` would ship.
- Out of scope (do not touch): `resources/js/Pages/Admin/Now.tsx`, `resources/js/Pages/Now.tsx`, `Admin/NowController`, bubble menu (`RichEditor.tsx` BubbleMenu block), `HtmlSanitizer`, any schema, CSS.
- The Now route/page/admin sidebar stay; only the `navItems` entry is commented out.
- `git add` specific paths; conventional commit prefixes.
- If touching anything e2e-adjacent, kill stray QA servers first: `lsof -iTCP:8892 -sTCP:LISTEN -t | xargs -r kill -9`.
- Never delete `public/hot`; never kill the user's dev stack (port 8000).

---

### Task 0: Commit the spec and plan (docs)

**Files:**
- Create (already written): `docs/superpowers/specs/2026-10-15-codeblock-about-preview-nav-design.md`
- Create (this file): `docs/superpowers/plans/2026-10-15-codeblock-about-preview-nav.md`

- [ ] **Step 1: Commit docs**

```bash
git add docs/superpowers/specs/2026-10-15-codeblock-about-preview-nav-design.md docs/superpowers/plans/2026-10-15-codeblock-about-preview-nav.md
git commit -m "docs: design and plan for code block button, about preview, and now nav comment-out"
```

Expected: `[phase-1 <sha>] docs: design and plan for ...`, working tree clean for those paths.

---

### Task 1: Code block button in RichEditor top bar

**Files:**
- Modify: `resources/js/Components/RichEditor.tsx` (new `topBarButtonClass` helper near `bubbleButtonClass` at L40-44; new button in top bar between Link (L145-152) and Image (L153-161))
- Test: `resources/js/Components/__tests__/RichEditor.test.tsx`

**Interfaces:**
- Consumes: Tiptap StarterKit `editor.chain().focus().toggleCodeBlock()` and `editor.isActive('codeBlock')` (both bundled — no new dependency).
- Produces: top-bar button `aria-label="Code block"`; later tasks/e2e may select it. Bubble's inline `Code` button (`aria-label="Code"`) is unchanged.

- [ ] **Step 1: Write the failing tests** — append two tests to `RichEditor.test.tsx`:

```tsx
test('inserts a code block from the top bar button', async () => {
    const onChange = vi.fn();
    render(<RichEditor value="<p>Code time</p>" onChange={onChange} />);

    const button = await screen.findByLabelText('Code block');
    fireEvent.click(button);

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange.mock.calls.at(-1)?.[0]).toContain('<pre');
});

test('keeps the inline Code control in the bubble menu separate from the block button', async () => {
    render(<RichEditor value="<p>Inline</p>" onChange={() => {}} />);

    const paragraph = await screen.findByText('Inline');
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));

    expect(await screen.findByLabelText('Code')).toBeInTheDocument();
    expect(screen.getByLabelText('Code block')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail for the right reason**

Run: `npm test -- RichEditor`
Expected: test 1 FAIL with `Unable to find an accessible element with the label "Code block"` (button doesn't exist); test 2 FAIL either at the same `"Code block"` label — OR at `label "Code"` if the synthetic selection doesn't mount the BubbleMenu (environmental: fix the selection simulation in Step 1 before proceeding; the code-block button gap is still the product gap). Existing 3 tests PASS.

- [ ] **Step 3: Write the implementation**

In `RichEditor.tsx`, after the `bubbleButtonClass` function (L40-44) add:

```ts
function topBarButtonClass(active: boolean): string {
    return `rounded px-2 py-1 text-xs font-medium ${
        active ? 'bg-ink text-white' : 'text-ink hover:bg-surface'
    }`;
}
```

In the top bar, between the Link button and the Image button, insert:

```tsx
<button
    type="button"
    aria-label="Code block"
    onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
    className={topBarButtonClass(editor?.isActive('codeBlock') ?? false)}
>
    Code
</button>
```

(Note: `bubbleButtonClass` is dark-bubble styling — white text, invisible on the light top bar — hence the new helper.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- RichEditor`
Expected: 5 PASS (3 existing + 2 new).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no output (clean).

- [ ] **Step 6: Commit**

```bash
git add resources/js/Components/RichEditor.tsx resources/js/Components/__tests__/RichEditor.test.tsx
git commit -m "feat: add code block button to the rich editor toolbar"
```

---

### Task 2: Comment out the Now nav link

**Files:**
- Modify: `resources/js/nav.ts:7`
- Create: `resources/js/Components/__tests__/nav.test.ts`

**Interfaces:**
- Consumes: `navItems` export from `resources/js/nav.ts` (array of `{ label, href }`, consumed by desktop `PublicLayout` and `MobileNav`).
- Produces: `navItems` without a `/now` entry — 7 items. `/now` route/page/admin sidebar untouched.

- [ ] **Step 1: Write the failing test** — create `resources/js/Components/__tests__/nav.test.ts`:

```ts
import { test, expect } from 'vitest';
import { navItems } from '../nav';

test('does not link the now page from the primary navigation', () => {
    expect(navItems.some((item) => item.href === '/now')).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails for the right reason**

Run: `npm test -- nav.test`
Expected: 1 FAIL — `expected true to be false` (the `/now` entry still exists).

- [ ] **Step 3: Comment out the entry** — `resources/js/nav.ts` becomes:

```ts
export const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Writing', href: '/writing' },
    { label: 'Notes', href: '/notes' },
    { label: 'Projects', href: '/projects' },
    { label: 'Collected', href: '/collected' },
    // { label: 'Now', href: '/now' }, // hidden from nav by request; /now stays routable
    { label: 'About', href: '/about' },
    { label: 'Ask', href: '/ask' },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- nav.test`
Expected: 1 PASS.

- [ ] **Step 5: Commit**

```bash
git add resources/js/nav.ts resources/js/Components/__tests__/nav.test.ts
git commit -m "feat: comment out now link from primary navigation"
```

---

### Task 3: Edit/Preview toggle on admin About

**Files:**
- Modify: `resources/js/Pages/Admin/About.tsx`
- Test: `resources/js/Components/__tests__/AdminAbout.test.tsx`

**Interfaces:**
- Consumes: `PreviewPane` (`resources/js/Components/PreviewPane.tsx`): props `{ body: string; format?: 'markdown'|'html'; title: string; excerpt: string }` — pass `title="" excerpt=""` (QuickComposer precedent; empty strings skip the h1/excerpt render). html mode sets HTML directly from `body`, no fetch (jsdom-safe).
- Produces: About page with `Preview`/`Edit` toggle button; existing test's `/save/i` button role stays (`Save about page`).

- [ ] **Step 1: Write the failing test** — append to `AdminAbout.test.tsx` (mocks at top of file already cover Inertia/AdminLayout/Flash; `PreviewPane` renders for real, html mode needs no fetch mock):

```tsx
import { fireEvent } from '@testing-library/react';

test('toggles between edit and preview while keeping save visible', async () => {
    render(<About body="<p>Draft body</p>" />);

    await screen.findByLabelText('Text style');
    expect(screen.getByRole('button', { name: 'Save about page' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    await waitFor(() => expect(screen.queryByLabelText('Text style')).not.toBeInTheDocument());
    expect(await screen.findByText('Draft body')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save about page' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(await screen.findByLabelText('Text style')).toBeInTheDocument();
});
```

Adjust imports at top of file to: `import { render, screen, fireEvent, waitFor } from '@testing-library/react';`.

- [ ] **Step 2: Run tests to verify they fail for the right reason**

Run: `npm test -- AdminAbout`
Expected: new test FAILS with `Unable to find an element with the text: Preview` (toggle doesn't exist); existing test PASS.

- [ ] **Step 3: Write the implementation** — full replacement of `resources/js/Pages/Admin/About.tsx`:

```tsx
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/Components/Button';
import { Flash } from '@/Components/Flash';
import { RichEditor } from '@/Components/RichEditor';
import { PreviewPane } from '@/Components/PreviewPane';

export default function About({ body }: { body: string }) {
    const { data, setData, put, processing, errors } = useForm<{ body: string }>({ body });
    const [preview, setPreview] = useState(false);

    const save = (e: React.FormEvent) => {
        e.preventDefault();
        put('/admin/about', { preserveScroll: true });
    };

    return (
        <AdminLayout title="About page">
            <Flash />
            <form onSubmit={save} className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-medium">About</span>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant={preview ? 'secondary' : 'primary'}
                            onClick={() => setPreview(!preview)}
                        >
                            {preview ? 'Edit' : 'Preview'}
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Saving…' : 'Save about page'}
                        </Button>
                    </div>
                </div>

                {preview ? (
                    <PreviewPane body={data.body} format="html" title="" excerpt="" />
                ) : (
                    <div>
                        <div className="mt-1">
                            <RichEditor value={data.body} onChange={(html) => setData('body', html)} />
                        </div>
                        {errors.body && <p className="mt-1 text-sm text-red-700">{errors.body}</p>}
                    </div>
                )}
            </form>
        </AdminLayout>
    );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- AdminAbout`
Expected: 2 PASS.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add resources/js/Pages/Admin/About.tsx resources/js/Components/__tests__/AdminAbout.test.tsx
git commit -m "feat: preview toggle on the admin about page"
```

---

### Task 4: Full verification gates

**Files:** none modified (verification only).

- [ ] **Step 1: Full vitest**

Run: `npm test`
Expected: 44 PASS, 0 fail (40 existing + 4 new: 2 RichEditor, 1 nav, 1 AdminAbout). If the RichEditor bubble-separation test fails only because jsdom never mounts the BubbleMenu on synthetic selection events (environmental, not product), diagnose first (check `window.getSelection()`/`selectionchange` dispatch reach ProseMirror's DOMObserver) — do not delete the test; adapt the selection simulation.

- [ ] **Step 2: Type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean tsc; vite build completes.

- [ ] **Step 3: Pest**

Run: `./vendor/bin/pest`
Expected: 200 PASS (no backend change).

- [ ] **Step 4: Playwright (full regression)**

```bash
lsof -iTCP:8892 -sTCP:LISTEN -t | xargs -r kill -9
npx playwright test
```

Expected: 52 PASS. Risks: `rich-editor.spec.ts` targets the same top bar (additive button, no selector change) — if a run fails with timing symptoms, check `uptime` for load spikes and re-run before assuming product regression. No test asserts a Now nav link (a11y checks the nav landmark only), so the comment-out should be invisible to e2e.

- [ ] **Step 5: Report** — summarize commits + gate counts; remaining flow: `finishing-a-development-branch` decision (branch `phase-1`, no remote — merge/keep).
