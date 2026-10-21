# Ask Page — macOS Mail-Style Email Composer

- **Date:** 2026-10-21
- **Status:** Approved design; awaiting spec review

## Background

`/ask` is currently a static Inertia page with mock "AI guide arriving in Phase 3" content (a one-line closure route rendering `Ask.tsx`). The owner wants the page to do something real today: let visitors send him an email directly from the site, through the app's configured mailer, addressed to **hi@timothyadeleke.com**. The mock AI-guide content is removed entirely (confirmed choice) — the page becomes the composer.

Design direction (confirmed): a **macOS Mail.app-inspired compose window**, extending the same native-mac design language the Collected redesign brought to Finder (window chrome, traffic lights, hairlines, monochrome + system-blue accents).

## Decisions (from clarifying Q&A)

1. **Old content removed** — no AI-guide section, no suggested-questions list. The page is purely the composer + supporting note.
2. **Success UX** — in-place Sent view: the window chrome stays, its body swaps to a "message sent" confirmation with a "Write another" button. No navigation, no toast.
3. **Architecture** — Inertia form POST + one-shot flash (`sent: true`), matching the app's existing `useForm` patterns. Not a JSON API, not client-only `mailto:`.
4. **Rate limiting** — `throttle:5,1` on the send route (5/min per IP). Explicitly requested.
5. **Dual delivery** — primary path sends server-side via the configured mailer; a secondary **"Open in email client"** button opens a prefilled `mailto:` built from the current form state.
6. **Visible contact note** — under the window: "You can also reach me directly at hi@timothyadeleke.com" (a `mailto:` link). Also echoed in the Sent view and the send-failure message.
7. **Recipient** — `config('ask.to')` → `env('ASK_TO', 'hi@timothyadeleke.com')`. From = the app's `MAIL_FROM_*`. Reply-To = the visitor's address, so Reply in the owner's inbox goes back to them.
8. **Fields** — From (visitor email), Subject ("title"), Message (body). **To** is a fixed, non-editable recipient chip.

## Experience flow

Visitor lands on `/ask` → sees the "New Message" compose window → fills From/Subject/Message → **Send** (toolbar, macOS blue pill) → "Sending…" state → server sends → flash → window body swaps to the Sent view → "Write another" resets to a fresh compose form. Alternatively **Open in email client** launches their local mail app with everything prefilled. Validation errors render inline per field; a send failure shows an error inside the window with the direct-email fallback.

---

## Section 1 — Visual & UX

**Page shell** (`resources/js/Pages/Ask.tsx` rewrite, still `<PublicLayout>`):

- Keep `h1 "Ask Timadey"`; tagline: "Send me a note — I read everything."
- Below it, the compose window; below the window, the contact note.

**Compose window** (Mac Mail.app-inspired, consistent with Collected's Finder chrome):

- Rounded-xl card, real macOS-style drop shadow, `bg-surface` / `border-hairline` tokens.
- **Title bar**: traffic-light dots in classic colors (`#ff5f57`, `#febc2e`, `#28c840`), centered title **"New Message"** (system font, medium weight).
- **Toolbar row** under the title bar: **Send** on the left — blue-filled pill button with paper-plane icon, macOS style. Send lives in the toolbar, not a footer.
- **Field rows** in Mail.app compose order, each separated by a hairline:
  - **To:** rounded blue-tinted chip showing `hi@timothyadeleke.com`, non-editable
  - **From:** email input; row highlights subtly on focus
  - **Subject:** text input
  - **Message:** textarea filling the rest of the window
- System font stack, blue focus rings (`ring` utilities), subtle row hover inset.
- **Secondary button** beside Send: **"Open in email client"** (external-link/mail icon) → `mailto:hi@timothyadeleke.com?subject=…&body=…` prefilled from current form state (body includes the typed message; subject the typed subject).

**Sent view** — same window chrome; title becomes **"Sent"**; body shows a check glyph + "Your message is on its way.", the reach-me-directly note, and a **"Write another"** secondary macOS-style button that swaps back to a cleared compose form (client state reset).

**Send-failure state** — the compose window stays as-is (title still "New Message", typed input intact); an error banner appears at the top of the window body: "Couldn't send right now — email me directly at hi@timothyadeleke.com" with the address as a `mailto:` link.

**Contact note** (under the window): "You can also reach me directly at [hi@timothyadeleke.com](mailto:hi@timothyadeleke.com)".

**Motion** — reuse the existing global CSS keyframes in `resources/css/app.css` (subtle fade/slide-in for the window and the Sent swap); all gated by the global `prefers-reduced-motion` rule. No new dependencies.

**Responsive** — single column on mobile: window goes full-width, rows stack, Send stays reachable.

**a11y** — every input has a real `<label>`; window is `role="group"` with an accessible name; honeypot is `aria-hidden`, `tabIndex={-1}`, `autoComplete="off"`; after a successful send, focus moves to the Sent view heading.

## Section 2 — Backend & data flow

**Routes** (`routes/web.php`):

- `GET /ask` — move the existing closure into `AskController@index` (name stays `ask`).
- `POST /ask` → `AskController@send`, name `ask.send`, middleware `throttle:5,1`.

**Controller** (`app/Http/Controllers/AskController.php`):

- `send()` validates:
  - `from` — `required|email|max:254`
  - `subject` — `required|string|max:120`
  - `message` — `required|string|max:5000`
  - honeypot field `website` — must be empty; if filled: return the success flash **without sending** (silent bot success).
- Happy path: `Mail::to(config('ask.to'))->send(new AskMessage(...))` → `redirect()->back()->with('sent', true)`.
- Send failure: log the exception, redirect back with flash `error` — "Couldn't send right now — email me directly at hi@timothyadeleke.com" (wording built from the configured address, with the `mailto:` link). Never a 500. The visitor stays in the compose view with their typed input intact (Inertia's same-page visit keeps component state) and the error banner shown.

**Mailable** (`app/Mail/AskMessage.php`, synchronous, no queue):

- To: `config('ask.to')`
- From: `MAIL_FROM_ADDRESS` / `MAIL_FROM_NAME` (Laravel defaults)
- Reply-To: the visitor's `from` address
- Subject: the visitor's subject
- Text body: the visitor's message, plus a footer line noting it was sent from timadey.com/ask and the visitor's address.

**Config** (`config/ask.php`): `['to' => env('ASK_TO', 'hi@timothyadeleke.com')]`.

**Flash sharing**: add `flash` (`sent`, `error`) to `share()` in `app/Http/Middleware/HandleInertiaRequests.php` (flash is one-shot — the Sent view never sticks across visits).

**Env**: add `ASK_TO` to `.env.example` with the default address.

## Section 3 — Errors, behavior details, testing

**Form behavior**

- Inertia `useForm` with fields `from`, `subject`, `message`, honeypot `website`.
- Native `required` + `type="email"` on From; Send disabled and labeled **"Sending…"** while processing.
- Server validation errors render inline per row (red-tinted field + small message), matching the admin forms' field-error pattern.

**Tests**

- **Pest** (`tests/Feature/AskTest.php`):
  - GET `/ask` renders (200, Inertia page `Ask`).
  - POST happy path: `Mail::fake()`; assert `AskMessage` sent to `config('ask.to')`, Reply-To = visitor address, subject/body correct; response redirects with `sent` flash.
  - Validation errors: missing/invalid fields → redirect with errors, nothing sent.
  - Honeypot filled → success flash, `Mail::assertNothingSent()`.
  - Throttle: 6th POST within a minute → 429.
  - Send failure: force the mailer to throw → no 500, error flash, nothing leaked.
- **Vitest** (`resources/js/Components/__tests__/` only, per repo rule): compose renders To-chip/fields/mailto link; submit shows "Sending…"; `sent` flash renders the Sent view; "Write another" resets; inline validation errors render.
- **Playwright**: one e2e happy path — fill the form, Send, assert "Your message is on its way." (mail goes to the configured `MAIL_MAILER`, `log` in dev/QA).

## Out of scope

- No AI guide, no chat, no Phase-3 stubs.
- No attachment support, no CC/BCC, no threading.
- No admin UI for the recipient address (env only).
- No queue infrastructure changes (mail sends synchronously).
- No database changes.
