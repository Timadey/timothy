# AI-Assisted SEO Field Suggestion

- **Date:** 2026-10-26
- **Status:** Approved design; awaiting spec review

## Background

The admin post editor has a rule-based "Suggest from content" button (`f952711`): it derives `excerpt` (≤280), `meta_description` (≤160), and `meta_title` from the body's first paragraphs with sentence-aware truncation. It is structurally correct but produces *truncated* copy — the description starts mid-thought at paragraph 1 rather than hooking a reader.

The owner wants optional AI generation for genuinely crafted SEO copy (front-loaded-keyword titles ≤60 chars, hook-driven descriptions ≤160, narrative teasers ≤280) — but may use **OpenAI, Cohere, or NVIDIA**, so the integration must be provider-agnostic. All three expose an OpenAI-compatible chat-completions API (verified: `api.openai.com/v1`, `integrate.api.nvidia.com/v1`, `api.cohere.ai/compatibility/v1`), so a single adapter with a configurable base URL covers them and any future provider (OpenRouter, Groq, local Ollama) with zero code.

The original Phase-3 plan already reserved `LLM_PROVIDER` / `LLM_API_KEY` / `LLM_MODEL` in `.env.example:73-75`; this design consumes and extends those vars.

## Decisions (from clarifying Q&A)

1. **Provider** — generic adapter driven by env config. Base-URL resolution: `LLM_BASE_URL` wins, else `LLM_PROVIDER` preset table (openai/cohere/nvidia), else feature disabled. No provider-specific request code.
2. **One smart button (option A)** — "Suggest from content" uses AI when configured, silently falls back to the existing local rule-based path otherwise. No second button, no visible mode switch.
3. **Smart branch (flow option A)** — the frontend knows via an `llm_enabled` Inertia prop: no key → local computation (today's exact behavior, zero network); key → `POST /admin/posts/suggest-seo`. API failure → silent local fallback (`console.warn` only).
4. **Key stays server-side** — never in JS, never in git. Coolify env vars set by the owner post-deploy.
5. **Fill-only-empty rule unchanged** — AI and rule-based obey the same merge: only fields currently empty are written. To let AI rewrite an existing field, clear it first. Prevents clobbering hand-written values.
6. **Defensive clamping** — model output is never trusted for length; a PHP mirror of the TS `clamp()` (sentence-boundary, word-cut + ellipsis) runs on every returned field server-side.
7. **Disabled-safe** — with no env vars set, behavior is byte-for-byte today's feature. Ships before any key exists.

## Section 1 — Config

**`config/llm.php`** (new):

```php
return [
    'provider' => env('LLM_PROVIDER'),      // openai | cohere | nvidia
    'base_url' => env('LLM_BASE_URL'),       // explicit override
    'api_key'  => env('LLM_API_KEY'),
    'model'    => env('LLM_MODEL'),
    'timeout'  => (int) env('LLM_TIMEOUT', 10),
];
```

**Preset table** (in config or a small resolver class):

| provider | base URL |
|---|---|
| `openai` | `https://api.openai.com/v1` |
| `cohere` | `https://api.cohere.ai/compatibility/v1` |
| `nvidia` | `https://integrate.api.nvidia.com/v1` |

**Resolution rule:** effective base URL = `LLM_BASE_URL` if set; else preset[provider]; else null → disabled. **Enabled** = `api_key` && `model` && effective base URL.

**`.env.example`** — extend the existing commented block (lines 73-75) with `# LLM_BASE_URL=` and `# LLM_TIMEOUT=`; add usage comments (example models per provider).

## Section 2 — Backend

**`app/Services/Llm/OpenAiLlmClient.php`** — single method:

```php
public function complete(string $system, string $user): string
```

- `Http::withToken($key)->timeout($timeout)->post($baseUrl.'/chat/completions', [model, messages, temperature: 0.6, max_tokens: 400])`
- Returns `choices[0].message.content`.
- Any transport/HTTP/shape failure → throws `LlmException` (new marker exception).
- No SDK, no composer additions (Laravel's `Http` facade / Guzzle already ships).

**`app/Services/Llm/SeoSuggestService.php`** — orchestration:

1. Build prompt:
   - **System:** SEO copywriter rules — `meta_title` ≤60 chars, primary keyword front-loaded, no site-name tautology; `meta_description` ≤160 chars, a hook/summary (not a truncation), active voice; `excerpt` ≤280 chars, narrative teaser that continues naturally from title; **return strict JSON only** with exactly keys `excerpt`, `meta_title`, `meta_description` — no markdown, no commentary.
   - **User:** site name (Timadey), post `title`, plain-text body = `strip_tags` + whitespace collapse, capped at ~4000 chars.
2. Call client; on `LlmException` → rethrow as service-level failure.
3. **Parse defensively:** strip ``` fences, extract first `{…}` block, `json_decode`, require all three keys present and strings — anything else → failure.
4. **Clamp** the text fields through a PHP mirror of the TS `clamp()` — same constants and rules: `excerpt` max 280, `meta_description` max 160 (sentence boundary if it ends at ≥50% of max, else word-cut + `…`). Additionally — AI path only — `meta_title` is clamped to 60 with the same function (defensive; the local rule-based path keeps today's plain `title.trim()` behavior untouched).

**Endpoint** — `POST /admin/posts/suggest-seo`, inside the existing `/admin` auth group, `throttle:20,1`:

- Request: `{ title: string ≤300, body: string ≤100000 }` (editor HTML), validated.
- Not configured → **422** `{message}` (frontend should not normally hit this).
- LLM or parse failure → **502** `{message}`.
- Success → **200** `{excerpt, meta_title, meta_description, source: 'ai'}`.
- Endpoint location (explicit): new `suggestSeo()` action on the existing `App\Http\Controllers\Admin\PostController` + one `Route::post('posts/suggest-seo', ...)` line in `routes/web.php` next to the existing posts routes (`routes/web.php:19-25`). No new controller file.

## Section 3 — Frontend

**`llm_enabled` shared prop** — one line in `HandleInertiaRequests`, computed by a single resolver `Llm::enabled()` (static helper in the `app/Services/Llm` namespace: `api_key` && `model` && resolvable base URL — the backend config/endpoint reuses this same resolver). Shared so future admin AI features inherit it.

**`SeoSuggestButton`** (`resources/js/Components/SeoSuggestButton.tsx`):

- New prop `llmEnabled: boolean`.
- `llmEnabled === false` → current local path exactly (no network, instant).
- `llmEnabled === true` → on click: set busy state (label **"Suggesting…"**, `disabled`), POST JSON to `/admin/posts/suggest-seo` with `{title, body}` using the app's existing HTTP/fetch convention (verify CSRF approach in `bootstrap.js` during planning).
- Response → apply through the **same fill-only-empty merge** as local mode; server already clamped.
- Any failure (422/502/timeout/network/bad shape) → `console.warn` + local `suggestSeo()` fallback, fill normally. Button never dead-ends.
- Busy state resets in `finally`.

**`Edit.tsx`** — read the shared `llm_enabled` prop and pass it into the button. No other form changes.

## Section 4 — Error Handling Matrix

| Condition | Server | Client |
|---|---|---|
| No env configured, button clicked | (not called — prop false) | local rule-based, instant |
| No env but endpoint hit directly | 422 | silent local fallback |
| LLM timeout / 5xx / network | 502 | silent local fallback |
| Unparseable / missing-key JSON | 502 | silent local fallback |
| Over-length model output | clamped before 200 | fill as returned |
| Guest / non-admin | existing auth (redirect/403) | n/a |
| All three fields already filled | n/a | button disabled (unchanged) |

Silent fallback = `console.warn` only, per decision (option A).

## Section 5 — Testing

**Pest** (`tests/Feature/AdminSuggestSeoTest.php`):

1. Guest → redirected (auth guard).
2. Admin + not configured → 422.
3. Admin + configured + `Http::fake` valid JSON → 200, fields present, **over-length fake output asserted clamped** (feed a 500-char description, expect ≤160 + ellipsis/sentence rule).
4. `Http::fake` HTTP 500 → 502.
5. `Http::fake` garbage body ("sorry, here are thoughts") → 502.
6. Request validation (missing/oversized fields).
7. Throttle smoke (optional — only if cheap).

**Vitest** (`SeoSuggestButton.test.tsx` extensions):

1. `llmEnabled` + fetch resolves → fetch called once with `{title, body}`, empty fields filled from response, busy label shown during flight.
2. `llmEnabled` + fetch rejects → local rule-based still fills, no unhandled rejection.
3. `llmEnabled=false` → no fetch (existing local tests remain green untouched).
4. Fill-only-empty respected on the AI path (pre-filled excerpt untouched).

**Regression:** full `vendor/bin/pest` (252 baseline) + `npm test` (117 baseline) + `npm run build`.

## Section 6 — Deploy

- Ships disabled-safe; no Coolify changes required to deploy.
- Owner adds env vars in Coolify when ready: `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL` (+ optional `LLM_BASE_URL`, `LLM_TIMEOUT`). Values never committed.
- No new composer/npm dependencies.

## Out of Scope (YAGNI)

- Streaming responses / loading skeletons beyond the busy button label.
- A second explicit "AI" button or visible mode toggle.
- AI rewriting already-filled fields (use clear-then-suggest).
- Keyword research, readability scoring, schema/JSON-LD generation, tag suggestions.
- Per-provider adapters (single OpenAI-compatible client only).
- Caching/reusing AI results across posts.
