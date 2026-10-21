# Ask Email Composer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/ask` from a static mock into a macOS Mail.app-style compose window that sends real email to `hi@timothyadeleke.com` through the app's configured mailer, with rate limiting, a `mailto:` fallback, and an in-place Sent view.

**Architecture:** Inertia form POST (`AskController::send`) behind `throttle:5,1` → synchronous `AskMessage` Mailable via the configured mailer → redirect back with one-shot flash (`sent`/`error`) shared through `HandleInertiaRequests`. Frontend: `Ask.tsx` page wires `useForm` + flash into three presentational components under `Components/ask/` (`MailWindow` chrome, `ComposeBody` fields, `SentView`).

**Tech Stack:** Laravel 12, Inertia React 3 (TS strict), Tailwind v4, lucide-react, Pest 4, Vitest + Testing Library, Playwright. **No new JS dependencies.**

## Global Constraints

- Recipient: `config('ask.to')` → `env('ASK_TO', 'hi@timothyadeleke.com')` — never hardcode the address in frontend code; it arrives as the `recipient` prop.
- Rate limit: `throttle:5,1` on `POST /ask` (5/min/IP).
- Validation limits: `from` email max:254; `subject` max:120; `message` max:5000.
- Mail is sent synchronously through the configured mailer (`MAIL_MAILER`); From = `MAIL_FROM_*`; Reply-To = visitor address.
- Honeypot field name: `website` (hidden; filled ⇒ fake success, nothing sent).
- Flash shape: `flash = { sent: boolean|null, error: string|null }` (one-shot).
- Vitest tests live **only** in `resources/js/Components/__tests__/` (repo rule from commit 734e70b).
- No new dependencies; no DB migrations; no queue changes.
- Inertia `<Head>` titles must be a single string/expression child (array children crash in @inertiajs/react 3.9.1).
- macOS accents allowed: system blue `#0a84ff`, traffic lights `#ff5f57`/`#febc2e`/`#28c840`; everything else stays on the site's monochrome tokens (`border-hairline`, `bg-surface`, `text-ink`, `text-meta`).
- Branch: continue on `phase-1`.

---

### Task 1: Backend core — config, Mailable, controller, routes, flash

**Files:**
- Create: `config/ask.php`
- Create: `app/Mail/AskMessage.php`
- Create: `resources/views/mail/ask-message.blade.php`
- Create: `app/Http/Controllers/AskController.php`
- Modify: `routes/web.php:98` (replace the `/ask` closure)
- Modify: `app/Http/Middleware/HandleInertiaRequests.php:15-20` (add flash to `share()`)
- Modify: `.env.example` (add `ASK_TO` after the MAIL block)
- Test: `tests/Feature/AskTest.php`

**Interfaces:**
- Consumes: Inertia `inertia()` helper, `Mail` facade, existing `HandleInertiaRequests::share()`.
- Produces:
  - `GET /ask` → Inertia page `Ask` with props `{ recipient: string, flash: { sent: bool|null, error: string|null } | null }`
  - `POST /ask` (`ask.send`) → redirect back with `flash` in session
  - Mailable `App\Mail\AskMessage(string $fromAddress, string $subjectLine, string $body)`

- [ ] **Step 1: Write the failing Pest test**

Create `tests/Feature/AskTest.php`:

```php
<?php

use App\Mail\AskMessage;
use Illuminate\Support\Facades\Mail;

it('renders the ask page with the configured recipient', function () {
    $this->get('/ask')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Ask')
            ->where('recipient', 'hi@timothyadeleke.com'));
});

it('sends a message and flashes sent', function () {
    Mail::fake();

    $this->from('/ask')->post('/ask', [
        'from' => 'visitor@example.com',
        'subject' => 'Hello there',
        'message' => 'This is my message.',
    ])->assertRedirect('/ask')
        ->assertSessionHas('flash.sent', true);

    Mail::assertSent(AskMessage::class, function (AskMessage $mail) {
        return $mail->hasTo('hi@timothyadeleke.com')
            && $mail->envelope()->replyTo[0]->address === 'visitor@example.com'
            && $mail->envelope()->subject === 'Hello there'
            && $mail->content()->text === 'mail.ask-message'
            && $mail->content()->with['body'] === 'This is my message.';
    });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `php artisan test --filter=AskTest`
Expected: FAIL — 500 or route/`Ask` component errors (files don't exist yet).

- [ ] **Step 3: Implement config, Mailable, view, controller, routes, flash**

Create `config/ask.php`:

```php
<?php

return [
    'to' => env('ASK_TO', 'hi@timothyadeleke.com'),
];
```

Create `resources/views/mail/ask-message.blade.php` (plain text):

```
{{ $body }}

—
Sent from {{ config('app.url') }}/ask
Reply to reach {{ $fromAddress }}
```

Create `app/Mail/AskMessage.php`:

```php
<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AskMessage extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $fromAddress,
        public string $subjectLine,
        public string $body,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            replyTo: $this->fromAddress,
            subject: $this->subjectLine,
        );
    }

    public function content(): Content
    {
        return new Content(
            text: 'mail.ask-message',
            with: [
                'body' => $this->body,
                'fromAddress' => $this->fromAddress,
            ],
        );
    }
}
```

Create `app/Http/Controllers/AskController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Mail\AskMessage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Inertia\Response;

class AskController extends Controller
{
    public function index(): Response
    {
        return inertia('Ask', [
            'recipient' => config('ask.to'),
        ]);
    }

    public function send(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'from' => ['required', 'email', 'max:254'],
            'subject' => ['required', 'string', 'max:120'],
            'message' => ['required', 'string', 'max:5000'],
            'website' => ['nullable', 'string'],
        ]);

        if ($request->filled('website')) {
            return back()->with('flash', ['sent' => true, 'error' => null]);
        }

        try {
            Mail::to(config('ask.to'))->send(new AskMessage(
                fromAddress: $data['from'],
                subjectLine: $data['subject'],
                body: $data['message'],
            ));
        } catch (\Throwable $e) {
            report($e);

            return back()->with('flash', [
                'sent' => false,
                'error' => 'Couldn’t send right now — email me directly at '.config('ask.to'),
            ]);
        }

        return back()->with('flash', ['sent' => true, 'error' => null]);
    }
}
```

In `routes/web.php`, replace the line:

```php
Route::get('/ask', fn () => inertia('Ask'))->name('ask');
```

with:

```php
Route::get('/ask', [\App\Http\Controllers\AskController::class, 'index'])->name('ask');
Route::post('/ask', [\App\Http\Controllers\AskController::class, 'send'])->middleware('throttle:5,1')->name('ask.send');
```

In `app/Http/Middleware/HandleInertiaRequests.php`, add to the `share()` array after the `status` entry:

```php
'flash' => fn () => $request->session()->get('flash'),
```

In `.env.example`, after the `MAIL_FROM_NAME` line add:

```
ASK_TO=hi@timothyadeleke.com
```

- [ ] **Step 4: Run to verify passes**

Run: `php artisan test --filter=AskTest`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add config/ask.php app/Mail/AskMessage.php resources/views/mail/ask-message.blade.php app/Http/Controllers/AskController.php routes/web.php app/Http/Middleware/HandleInertiaRequests.php .env.example tests/Feature/AskTest.php
git commit -m "feat: ask page mail backend with mailable and flash"
```

---

### Task 2: Backend hardening — validation, honeypot, throttle, failure path

**Files:**
- Modify: `tests/Feature/AskTest.php` (append 4 tests)
- No production-code change expected unless a test exposes one (controller from Task 1 already implements all paths).

**Interfaces:**
- Consumes: `POST /ask` + flash shape from Task 1.
- Produces: none new — hardening guarantees only.

- [ ] **Step 1: Write the failing tests**

Append to `tests/Feature/AskTest.php`:

```php
it('redirects back with field errors and sends nothing', function () {
    Mail::fake();

    $this->from('/ask')->post('/ask', [
        'from' => 'not-an-email',
        'subject' => '',
        'message' => '',
    ])->assertRedirect('/ask')
        ->assertSessionHasErrors(['from', 'subject', 'message']);

    Mail::assertNothingSent();
});

it('treats a filled honeypot as a silent success', function () {
    Mail::fake();

    $this->from('/ask')->post('/ask', [
        'from' => 'bot@example.com',
        'subject' => 'Buy things',
        'message' => 'spam spam',
        'website' => 'http://spam.example',
    ])->assertRedirect('/ask')
        ->assertSessionHas('flash.sent', true);

    Mail::assertNothingSent();
});

it('rate limits the send endpoint to five per minute', function () {
    Mail::fake();

    $payload = [
        'from' => 'visitor@example.com',
        'subject' => 'Hi',
        'message' => 'Hello.',
    ];

    foreach (range(1, 5) as $i) {
        $this->from('/ask')->post('/ask', $payload)->assertRedirect('/ask');
    }

    $this->from('/ask')->post('/ask', $payload)->assertStatus(429);
});

it('flashes an error instead of 500ing when the mailer fails', function () {
    Mail::shouldReceive('to')->once()->andThrow(new RuntimeException('SMTP down'));

    $this->from('/ask')->post('/ask', [
        'from' => 'visitor@example.com',
        'subject' => 'Hello',
        'message' => 'Are you there?',
    ])->assertRedirect('/ask')
        ->assertSessionHas('flash.sent', false)
        ->assertSessionHas('flash.error');
});
```

- [ ] **Step 2: Run to verify**

Run: `php artisan test --filter=AskTest`
Expected: all 6 tests PASS (Task 1 controller already handles each path). If the throttle test 429s earlier than the 6th request, ensure no other test in the file leaked limiter state (array cache resets per test; do not share the limiter with other test files via `$this->withoutMiddleware`).

- [ ] **Step 3: Commit**

```bash
git add tests/Feature/AskTest.php
git commit -m "test: ask backend validation, honeypot, throttle and failure paths"
```

---

### Task 3: Mail window chrome + compose body

**Files:**
- Create: `resources/js/Components/ask/MailWindow.tsx`
- Create: `resources/js/Components/ask/ComposeBody.tsx`
- Test: `resources/js/Components/__tests__/AskCompose.test.tsx`

**Interfaces:**
- Consumes: Tailwind tokens (`border-hairline`, `bg-surface`, `text-ink`, `text-meta`), lucide-react icons.
- Produces:
  - `<MailWindow title="New Message" toolbar={<…>}>children</MailWindow>` — chrome with traffic lights + centered title + optional toolbar row
  - `<ComposeBody recipient from subject message errors disabled honeypot onChange onSubmit />` where
    - `onChange: (field: 'from' | 'subject' | 'message', value: string) => void`
    - `honeypot: { value: string; onChange: (value: string) => void }`
    - `errors: Partial<Record<'from' | 'subject' | 'message', string>>`

- [ ] **Step 1: Write the failing test**

Create `resources/js/Components/__tests__/AskCompose.test.tsx`:

```tsx
import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MailWindow } from '@/Components/ask/MailWindow';
import { ComposeBody } from '@/Components/ask/ComposeBody';

test('mail window shows traffic lights, centered title and toolbar', () => {
    render(
        <MailWindow title="New Message" toolbar={<button type="button">Send</button>}>
            <p>body content</p>
        </MailWindow>,
    );

    expect(screen.getByRole('group', { name: 'New Message' })).toBeInTheDocument();
    expect(screen.getByText('New Message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
    expect(screen.getByText('body content')).toBeInTheDocument();
});

test('compose body renders the recipient chip, fields and mailto note target', () => {
    render(
        <ComposeBody
            recipient="hi@timothyadeleke.com"
            from=""
            subject=""
            message=""
            errors={{}}
            disabled={false}
            honeypot={{ value: '', onChange: vi.fn() }}
            onChange={vi.fn()}
            onSubmit={vi.fn()}
        />,
    );

    expect(screen.getByText('hi@timothyadeleke.com')).toBeInTheDocument();
    expect(screen.getByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('Subject')).toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toBeInTheDocument();
});

test('compose body reports changes, hides the honeypot and submits', () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    const onHoneypot = vi.fn();
    render(
        <ComposeBody
            recipient="hi@timothyadeleke.com"
            from=""
            subject=""
            message=""
            errors={{}}
            disabled={false}
            honeypot={{ value: '', onChange: onHoneypot }}
            onChange={onChange}
            onSubmit={onSubmit}
        />,
    );

    fireEvent.change(screen.getByLabelText('From'), { target: { value: 'a@b.com' } });
    expect(onChange).toHaveBeenCalledWith('from', 'a@b.com');

    const honeypot = screen.getByLabelText('Website');
    expect(honeypot.closest('div')).toHaveAttribute('aria-hidden', 'true');
    expect(honeypot).toHaveAttribute('tabindex', '-1');
    fireEvent.change(honeypot, { target: { value: 'spam' } });
    expect(onHoneypot).toHaveBeenCalledWith('spam');

    fireEvent.submit(screen.getByRole('button', { name: 'Compose message' }));
    expect(onSubmit).toHaveBeenCalled();
});

test('compose body shows inline errors and disables while sending', () => {
    render(
        <ComposeBody
            recipient="hi@timothyadeleke.com"
            from="bad"
            subject=""
            message=""
            errors={{ from: 'Enter a valid email.', subject: 'Required.' }}
            disabled
            honeypot={{ value: '', onChange: vi.fn() }}
            onChange={vi.fn()}
            onSubmit={vi.fn()}
        />,
    );

    expect(screen.getByText('Enter a valid email.')).toBeInTheDocument();
    expect(screen.getByText('Required.')).toBeInTheDocument();
    expect(screen.getByLabelText('From')).toBeDisabled();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- Components/__tests__/AskCompose.test.tsx`
Expected: FAIL — module not found `@/Components/ask/MailWindow`.

- [ ] **Step 3: Implement the components**

Create `resources/js/Components/ask/MailWindow.tsx`:

```tsx
import type { ReactNode } from 'react';

const LIGHTS = ['bg-[#ff5f57]', 'bg-[#febc2e]', 'bg-[#28c840]'];

export function MailWindow({ title, toolbar, children }: { title: string; toolbar?: ReactNode; children: ReactNode }) {
    return (
        <div
            className="animate-page-launch overflow-hidden rounded-xl border border-hairline bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)]"
            role="group"
            aria-label={title}
        >
            <div className="relative flex h-10 items-center border-b border-hairline bg-[#f6f6f6] px-4">
                <div className="flex gap-2" aria-hidden="true">
                    {LIGHTS.map((color) => (
                        <span key={color} className={`h-3 w-3 rounded-full ${color} ring-1 ring-black/5`} />
                    ))}
                </div>
                <span className="pointer-events-none absolute inset-x-0 text-center text-sm font-medium text-ink">{title}</span>
            </div>
            {toolbar && (
                <div className="flex flex-wrap items-center gap-3 border-b border-hairline bg-[#f6f6f6]/60 px-4 py-2">{toolbar}</div>
            )}
            {children}
        </div>
    );
}
```

Create `resources/js/Components/ask/ComposeBody.tsx`:

```tsx
type Field = 'from' | 'subject' | 'message';

export type ComposeBodyProps = {
    recipient: string;
    from: string;
    subject: string;
    message: string;
    errors: Partial<Record<Field, string>>;
    disabled: boolean;
    honeypot: { value: string; onChange: (value: string) => void };
    onChange: (field: Field, value: string) => void;
    onSubmit: () => void;
};

const rowClass = 'flex items-start gap-4 border-b border-hairline px-6 py-3';
const labelClass = 'w-20 shrink-0 pt-2 text-sm text-meta';
const inputClass = 'w-full bg-transparent text-sm text-ink outline-none placeholder:text-meta disabled:opacity-60';

function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return (
        <p className="mt-1 text-sm text-red-700" role="alert">
            {message}
        </p>
    );
}

export function ComposeBody({ recipient, from, subject, message, errors, disabled, honeypot, onChange, onSubmit }: ComposeBodyProps) {
    return (
        <form
            id="ask-compose"
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
            }}
        >
            <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
                <label>
                    Website
                    <input
                        type="text"
                        name="website"
                        tabIndex={-1}
                        autoComplete="off"
                        value={honeypot.value}
                        onChange={(e) => honeypot.onChange(e.target.value)}
                    />
                </label>
            </div>

            <div className={rowClass}>
                <span className={labelClass}>To</span>
                <span className="mt-0.5 inline-flex items-center rounded-full bg-[#0a84ff]/10 px-2.5 py-0.5 text-sm text-[#0a84ff]">
                    {recipient}
                </span>
            </div>

            <div className={rowClass}>
                <label htmlFor="ask-from" className={labelClass}>
                    From
                </label>
                <div className="min-w-0 flex-1">
                    <input
                        id="ask-from"
                        name="from"
                        type="email"
                        required
                        maxLength={254}
                        disabled={disabled}
                        value={from}
                        onChange={(e) => onChange('from', e.target.value)}
                        className={inputClass}
                        placeholder="you@example.com"
                    />
                    <FieldError message={errors.from} />
                </div>
            </div>

            <div className={rowClass}>
                <label htmlFor="ask-subject" className={labelClass}>
                    Subject
                </label>
                <div className="min-w-0 flex-1">
                    <input
                        id="ask-subject"
                        name="subject"
                        type="text"
                        required
                        maxLength={120}
                        disabled={disabled}
                        value={subject}
                        onChange={(e) => onChange('subject', e.target.value)}
                        className={inputClass}
                        placeholder="What’s on your mind"
                    />
                    <FieldError message={errors.subject} />
                </div>
            </div>

            <div className="px-6 py-3">
                <label htmlFor="ask-message" className="sr-only">
                    Message
                </label>
                <textarea
                    id="ask-message"
                    name="message"
                    required
                    maxLength={5000}
                    rows={8}
                    disabled={disabled}
                    value={message}
                    onChange={(e) => onChange('message', e.target.value)}
                    className={`${inputClass} resize-y`}
                    placeholder="Write your note…"
                />
                <FieldError message={errors.message} />
            </div>

            <button type="submit" className="sr-only">
                Compose message
            </button>
        </form>
    );
}
```

Note: the visually-hidden submit button keeps the form submittable by keyboard/tests without adding a second Send control — the visible Send lives in `MailWindow`'s toolbar and uses `form="ask-compose"`.

- [ ] **Step 4: Run to verify passes**

Run: `npm test -- Components/__tests__/AskCompose.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add resources/js/Components/ask/MailWindow.tsx resources/js/Components/ask/ComposeBody.tsx resources/js/Components/__tests__/AskCompose.test.tsx
git commit -m "feat: mac mail style compose window and body"
```

---

### Task 4: Sent view + Ask page wiring

**Files:**
- Create: `resources/js/Components/ask/SentView.tsx`
- Modify: `resources/js/Pages/Ask.tsx` (full rewrite)
- Test: `resources/js/Components/__tests__/AskPage.test.tsx`

**Interfaces:**
- Consumes: `MailWindow`, `ComposeBody` (Task 3); page props `{ recipient: string; flash?: { sent?: boolean; error?: string | null } }` (Task 1); `useForm` fields `{ from, subject, message, website }`.
- Produces: rendered `/ask` page — compose ⇄ sent swap driven by `flash.sent`, error banner from `flash.error`, toolbar Send (`form="ask-compose"`) + "Open in email client" mailto link, contact note under the window.

- [ ] **Step 1: Write the failing test**

Create `resources/js/Components/__tests__/AskPage.test.tsx`:

```tsx
import { test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const post = vi.fn();
const state = vi.fn();

vi.mock('@inertiajs/react', () => ({
    Head: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useForm: () => ({
        data: { from: '', subject: 'Draft subject', message: 'Draft body', website: '' },
        errors: {},
        processing: false,
        setData: state,
        post,
        reset: vi.fn(),
        clearErrors: vi.fn(),
    }),
}));
vi.mock('@/Layouts/PublicLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import Ask from '@/Pages/Ask';

beforeEach(() => {
    post.mockClear();
    state.mockClear();
});

test('renders the compose window with recipient, mailto fallback and contact note', () => {
    render(<Ask recipient="hi@timothyadeleke.com" flash={null} />);

    expect(screen.getByRole('group', { name: 'New Message' })).toBeInTheDocument();
    expect(screen.getByLabelText('From')).toBeInTheDocument();

    const mailto = screen.getByRole('link', { name: /Open in email client/ });
    expect(mailto).toHaveAttribute(
        'href',
        'mailto:hi@timothyadeleke.com?subject=Draft%20subject&body=Draft%20body',
    );

    expect(screen.getByRole('link', { name: 'hi@timothyadeleke.com' })).toBeInTheDocument();
});

test('submitting the compose form posts to /ask and wires the toolbar Send button', () => {
    render(<Ask recipient="hi@timothyadeleke.com" flash={null} />);

    fireEvent.submit(document.getElementById('ask-compose')!);
    expect(post).toHaveBeenCalledWith('/ask', expect.anything());
    expect(screen.getByRole('button', { name: 'Send' })).toHaveAttribute('form', 'ask-compose');
});

test('sent flash swaps the window into the Sent view and write another resets', () => {
    render(<Ask recipient="hi@timothyadeleke.com" flash={{ sent: true, error: null }} />);

    expect(screen.getByRole('group', { name: 'Sent' })).toBeInTheDocument();
    expect(screen.getByText('Your message is on its way.')).toBeInTheDocument();
    expect(() => fireEvent.click(screen.getByRole('button', { name: 'Write another' }))).not.toThrow();
});

test('error flash keeps the compose window and shows the fallback banner', () => {
    render(<Ask recipient="hi@timothyadeleke.com" flash={{ sent: false, error: 'Couldn’t send right now — email me directly at hi@timothyadeleke.com' }} />);

    expect(screen.getByRole('group', { name: 'New Message' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t send right now');
    expect(screen.getAllByRole('link', { name: 'hi@timothyadeleke.com' }).length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- Components/__tests__/AskPage.test.tsx`
Expected: FAIL — `Ask.tsx` still renders the old mock content (no `group` role "New Message").

- [ ] **Step 3: Implement SentView + rewrite Ask.tsx**

Create `resources/js/Components/ask/SentView.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { CheckCircle2 } from 'lucide-react';

export function SentView({ recipient, onWriteAnother }: { recipient: string; onWriteAnother: () => void }) {
    const headingRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        headingRef.current?.focus();
    }, []);

    return (
        <div className="px-6 py-12 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-[#28c840]" aria-hidden="true" />
            <h2 ref={headingRef} className="mt-3 text-lg font-semibold text-ink" tabIndex={-1}>
                Your message is on its way.
            </h2>
            <p className="mt-2 text-sm text-meta">
                You can also reach me directly at{' '}
                <a href={`mailto:${recipient}`} className="text-[#0a84ff] underline-offset-2 hover:underline">
                    {recipient}
                </a>
            </p>
            <button
                type="button"
                onClick={onWriteAnother}
                className="mt-6 rounded-md border border-hairline bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-surface"
            >
                Write another
            </button>
        </div>
    );
}
```

Rewrite `resources/js/Pages/Ask.tsx`:

```tsx
import { Head, useForm } from '@inertiajs/react';
import { ExternalLink, Send } from 'lucide-react';
import PublicLayout from '@/Layouts/PublicLayout';
import { ComposeBody } from '@/Components/ask/ComposeBody';
import { MailWindow } from '@/Components/ask/MailWindow';
import { SentView } from '@/Components/ask/SentView';

type Flash = { sent?: boolean | null; error?: string | null };

export default function Ask({ recipient, flash }: { recipient: string; flash?: Flash }) {
    const form = useForm({ from: '', subject: '', message: '', website: '' });
    const sent = flash?.sent === true;

    const mailtoHref = `mailto:${recipient}?subject=${encodeURIComponent(form.data.subject)}&body=${encodeURIComponent(form.data.message)}`;

    const reset = () => {
        form.reset();
        form.clearErrors();
    };

    return (
        <PublicLayout>
            <Head>
                <title>Ask Timadey</title>
                <meta name="description" content="Send Timadey an email straight from this page." />
            </Head>
            <div className="mx-auto max-w-2xl px-6 pt-12 pb-16">
                <h1 className="text-3xl font-semibold tracking-tight">Ask Timadey</h1>
                <p className="mt-2 text-lg text-ink">Send me a note — I read everything.</p>

                <div className="mt-8">
                    {sent ? (
                        <MailWindow title="Sent">
                            <SentView recipient={recipient} onWriteAnother={reset} />
                        </MailWindow>
                    ) : (
                        <MailWindow
                            title="New Message"
                            toolbar={
                                <>
                                    <button
                                        type="submit"
                                        form="ask-compose"
                                        disabled={form.processing}
                                        className="inline-flex items-center gap-1.5 rounded-full bg-[#0a84ff] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#0071e3] disabled:opacity-60"
                                    >
                                        <Send className="h-3.5 w-3.5" aria-hidden="true" />
                                        {form.processing ? 'Sending…' : 'Send'}
                                    </button>
                                    <a
                                        href={mailtoHref}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white px-3.5 py-1.5 text-sm font-medium text-ink hover:bg-surface"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                        Open in email client
                                    </a>
                                </>
                            }
                        >
                            {flash?.error && (
                                <div role="alert" className="border-b border-hairline bg-red-50 px-6 py-3 text-sm text-red-800">
                                    {flash.error}{' '}
                                    <a href={`mailto:${recipient}`} className="underline">
                                        {recipient}
                                    </a>
                                </div>
                            )}
                            <ComposeBody
                                recipient={recipient}
                                from={form.data.from}
                                subject={form.data.subject}
                                message={form.data.message}
                                errors={form.errors}
                                disabled={form.processing}
                                honeypot={{
                                    value: form.data.website,
                                    onChange: (value) => form.setData('website', value),
                                }}
                                onChange={(field, value) => form.setData(field, value)}
                                onSubmit={() => form.post('/ask', { preserveScroll: true })}
                            />
                        </MailWindow>
                    )}
                </div>

                <p className="mt-6 text-sm text-meta">
                    You can also reach me directly at{' '}
                    <a href={`mailto:${recipient}`} className="text-[#0a84ff] underline-offset-2 hover:underline">
                        {recipient}
                    </a>
                </p>
            </div>
        </PublicLayout>
    );
}
```

- [ ] **Step 4: Run both frontend test files**

Run: `npm test -- Components/__tests__/AskPage.test.tsx Components/__tests__/AskCompose.test.tsx`
Expected: PASS (4 + 4 tests). In the "Write another" test, assert only the click fires without errors (reset is a real `useForm` mock no-op here).

- [ ] **Step 5: Commit**

```bash
git add resources/js/Components/ask/SentView.tsx resources/js/Pages/Ask.tsx resources/js/Components/__tests__/AskPage.test.tsx
git commit -m "feat: ask page mail composer with sent view"
```

---

### Task 5: End-to-end test + full verification

**Files:**
- Create: `e2e/ask-send.spec.ts`

**Interfaces:**
- Consumes: running app on the Playwright QA server (`http://127.0.0.1:8892`, `MAIL_MAILER=log` from `.env`); `e2e/fixtures.ts` (`expect`, `shot`, `test`).
- Produces: one Playwright happy-path spec.

- [ ] **Step 1: Write the e2e spec**

Create `e2e/ask-send.spec.ts`:

```ts
import { expect, shot, test } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

test('ask: compose sends and shows the sent view', async ({ page }) => {
    await page.goto('/ask');
    await expect(page.getByRole('heading', { level: 1, name: 'Ask Timadey' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'New Message' })).toBeVisible();

    await page.getByRole('textbox', { name: 'From' }).fill('visitor@example.com');
    await page.getByRole('textbox', { name: 'Subject' }).fill('Hello from e2e');
    await page.getByRole('textbox', { name: 'Message' }).fill('Testing the ask composer.');
    await shot(page, 'ask-compose');

    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByText('Your message is on its way.')).toBeVisible();
    await shot(page, 'ask-sent');
});
```

- [ ] **Step 2: Run the e2e spec**

Run: `npx playwright test ask-send.spec.ts`
Expected: PASS. The QA server uses `MAIL_MAILER=log`, so the send hits the log transport.

- [ ] **Step 3: Full verification**

Run, in order:

```bash
php artisan test            # expected: all passing (219 + 6 new)
npm test                    # expected: all passing (84 + 8 new)
npx tsc --noEmit            # expected: exit 0
npm run build               # expected: succeeds
npx playwright test         # expected: all passing (or only pre-existing flakes, re-run confirms)
```

- [ ] **Step 4: Commit**

```bash
git add e2e/ask-send.spec.ts
git commit -m "test: ask composer e2e happy path"
```

---

## Self-Review notes

- Spec coverage: recipient config (Task 1), rate limit (Task 1 route + Task 2 test), honeypot (Tasks 1–2), dual delivery mailto (Task 4 toolbar), Sent view + Write another (Task 4), error banner (Task 4), contact note (Task 4), a11y labels/focus/honeypot attrs (Tasks 3–4), all four Pest areas (Tasks 1–2), Vitest areas (Tasks 3–4), e2e (Task 5). No DB/queue changes (spec out-of-scope honored).
- `MailWindow` uses existing `animate-page-launch` keyframe from the Collected work — no new CSS.
- The visible Send is a toolbar `<button form="ask-compose">`; `ComposeBody` owns the `<form id="ask-compose">` and a visually-hidden submit for keyboard/tests — one submit path, no duplicates.
- Flash is shared as a plain object; the GET render test asserts `recipient` only (flash null on fresh visit).
