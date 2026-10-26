# AI-Assisted SEO Suggestion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the admin "Suggest from content" button call an optional, provider-agnostic AI (OpenAI/Cohere/NVIDIA/OpenAI-compatible) to write crafted SEO fields, with silent rule-based fallback.

**Architecture:** A config-driven `Llm` resolver + one OpenAI-compatible HTTP client + a `SeoSuggestService` that prompts for strict JSON and defensively clamps output. A new admin JSON endpoint exposes it; the existing `SeoSuggestButton` branches on a shared `llm_enabled` Inertia prop — off = today's instant local path, on = fetch with local fallback on any failure.

**Tech Stack:** Laravel `Http` facade (no new packages), Pest + `Http::fake`, React/Inertia, Vitest + Testing Library (existing `vi.stubGlobal('fetch')` pattern from `RichEditor.test.tsx`).

**Spec:** `docs/superpowers/specs/2026-10-26-ai-seo-suggest-design.md`

## Global Constraints

- **No new composer or npm dependencies.**
- **LLM key stays server-side only** — never in JS, never committed to git; Coolify env set by owner post-deploy.
- **Fill-only-empty rule for all sources** (AI and local): only fields whose current value is empty/whitespace get written. Clear a field to let AI rewrite it.
- **Silent fallback** — every AI failure falls back to local `suggestSeo()` with `console.warn` only (no toasts, no visible errors).
- **Disabled-safe** — with no `LLM_*` env set, behavior is byte-for-byte today's feature (no network call).
- **TDD strictly:** write failing test → verify RED → implement → verify GREEN → commit, per task.
- **PHP clamp must mirror the TS clamp in `resources/js/seoSuggest.ts` exactly:** `excerpt` 280, `meta_description` 160 (sentence boundary if the last `.!?` within the slice ends at ≥ `floor(max/2)`, else word-cut at `max-1` + `…`); AI path additionally clamps `meta_title` to 60. Local TS path keeps plain `title.trim()`.
- **Never stage `config/app.php` or `.vite/`.** Commit `public/build/` with every frontend change.
- Baselines that must stay green: Pest **252**, Vitest **118** (suites only grow). Note: commit `6d834ba` (owner-authored, mid-plan) made `SeoSuggestButton` `values` nullable (`string | null`, `?? ''` guards) and added a 5th button test — Tasks 6/7 below are written on top of that fix; **never revert it**.
- Endpoint lives inside the existing admin group: `Route::prefix('admin')->name('admin.')->middleware(['auth', 'owner'])` (`routes/web.php:16`).
- Admin test auth convention (`tests/Feature/AdminPostsTest.php:5-6`): `beforeEach` creates `User::factory()->create(['role' => 'owner'])`, requests use `$this->actingAs($this->owner)`.
- Frontend JSON+CSRF convention (`resources/js/Components/RichEditor.tsx:19-30`): read `XSRF-TOKEN` cookie, send `X-XSRF-TOKEN` decoded, `Accept`/`Content-Type: application/json`, `X-Requested-With: XMLHttpRequest`, `credentials: 'same-origin'`.

## File Structure

| File | Responsibility |
|---|---|
| Create: `config/llm.php` | Env bridge: `provider`, `base_url`, `api_key`, `model`, `timeout` |
| Create: `app/Services/Llm/Llm.php` | Resolver: `baseUrl()`, `enabled()`, `client()` — single source of truth for configuration |
| Create: `app/Services/Llm/LlmException.php` | Marker exception for every LLM failure |
| Create: `app/Services/Llm/OpenAiLlmClient.php` | One method `complete(system, user): string` — OpenAI chat-completions schema at any base URL |
| Create: `app/Services/Llm/SeoSuggestService.php` | Prompt → parse (fence-strip/extract/validate) → PHP clamp → `{excerpt, meta_title, meta_description, source}` |
| Modify: `.env.example:72-75` | Document the `LLM_*` block |
| Modify: `app/Http/Controllers/Admin/PostController.php` | New `suggestSeo()` JSON action |
| Modify: `routes/web.php` (after line 26) | `POST posts/suggest-seo` + `throttle:20,1` |
| Modify: `app/Http/Middleware/HandleInertiaRequests.php:10-20` | Shared `llm_enabled` prop |
| Modify: `resources/js/Components/SeoSuggestButton.tsx` | `llmEnabled` prop, busy state, fetch + silent fallback |
| Modify: `resources/js/Pages/Admin/Posts/Edit.tsx` | Read `llm_enabled`, pass to button |
| Test: `tests/Feature/LlmTest.php` | Resolver behavior |
| Test: `tests/Feature/OpenAiLlmClientTest.php` | Client contract via `Http::fake` |
| Test: `tests/Feature/SeoSuggestServiceTest.php` | Prompt, parsing, clamping |
| Test: `tests/Feature/AdminSuggestSeoTest.php` | Endpoint auth/config/HTTP outcomes + shared prop |
| Test: `resources/js/Components/__tests__/SeoSuggestButton.test.tsx` | AI-mode behavior (extend existing file) |

---

### Task 1: LLM config and resolver

**Files:**
- Create: `config/llm.php`
- Create: `app/Services/Llm/Llm.php`
- Modify: `.env.example:72-75`
- Test: `tests/Feature/LlmTest.php`

**Interfaces:**
- Consumes: Laravel `config()` helper, env vars `LLM_PROVIDER`, `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_TIMEOUT`.
- Produces: `Llm::baseUrl(): ?string`, `Llm::enabled(): bool` (static, namespace `App\Services\Llm`). Later tasks add `Llm::client()` to this same class.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/LlmTest.php`:

```php
<?php

use App\Services\Llm\Llm;

beforeEach(function () {
    config([
        'llm.provider' => null,
        'llm.base_url' => null,
        'llm.api_key' => null,
        'llm.model' => null,
        'llm.timeout' => 10,
    ]);
});

it('is disabled when nothing is configured', function () {
    expect(Llm::enabled())->toBeFalse();
});

it('is disabled when key and model exist but no base url resolves', function () {
    config(['llm.api_key' => 'k', 'llm.model' => 'm']);

    expect(Llm::enabled())->toBeFalse();
});

it('resolves the preset base url per provider', function (string $provider, string $expected) {
    config(['llm.provider' => $provider, 'llm.api_key' => 'k', 'llm.model' => 'm']);

    expect(Llm::baseUrl())->toBe($expected)
        ->and(Llm::enabled())->toBeTrue();
})->with([
    ['openai', 'https://api.openai.com/v1'],
    ['cohere', 'https://api.cohere.ai/compatibility/v1'],
    ['nvidia', 'https://integrate.api.nvidia.com/v1'],
]);

it('prefers an explicit base url over the provider preset', function () {
    config([
        'llm.provider' => 'openai',
        'llm.base_url' => 'https://router.example/v1/',
        'llm.api_key' => 'k',
        'llm.model' => 'm',
    ]);

    expect(Llm::baseUrl())->toBe('https://router.example/v1');
});

it('ignores unknown providers', function () {
    config(['llm.provider' => 'mystery', 'llm.api_key' => 'k', 'llm.model' => 'm']);

    expect(Llm::baseUrl())->toBeNull()
        ->and(Llm::enabled())->toBeFalse();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `vendor/bin/pest tests/Feature/LlmTest.php`
Expected: FAIL — `Class "App\Services\Llm\Llm" not found`.

- [ ] **Step 3: Write the implementation**

Create `config/llm.php`:

```php
<?php

return [
    'provider' => env('LLM_PROVIDER'),
    'base_url' => env('LLM_BASE_URL'),
    'api_key' => env('LLM_API_KEY'),
    'model' => env('LLM_MODEL'),
    'timeout' => (int) env('LLM_TIMEOUT', 10),
];
```

Create `app/Services/Llm/Llm.php`:

```php
<?php

namespace App\Services\Llm;

class Llm
{
    private const PRESETS = [
        'openai' => 'https://api.openai.com/v1',
        'cohere' => 'https://api.cohere.ai/compatibility/v1',
        'nvidia' => 'https://integrate.api.nvidia.com/v1',
    ];

    public static function baseUrl(): ?string
    {
        if ($base = config('llm.base_url')) {
            return rtrim($base, '/');
        }

        $provider = config('llm.provider');

        return self::PRESETS[$provider] ?? null;
    }

    public static function enabled(): bool
    {
        return self::baseUrl() !== null
            && (bool) config('llm.api_key')
            && (bool) config('llm.model');
    }
}
```

Modify `.env.example` — replace exactly these lines (72-75):

```
# Future phases — not read by the app yet
# LLM_PROVIDER=
# LLM_API_KEY=
# LLM_MODEL=
```

with:

```
# AI SEO suggestions (admin "Suggest from content" button). All optional —
# with nothing set, the button uses instant local rules and never calls an API.
# Provider preset: openai | cohere | nvidia; or set LLM_BASE_URL for any
# OpenAI-compatible endpoint (OpenRouter, Groq, Ollama, ...).
# LLM_PROVIDER=openai
# LLM_BASE_URL=
# LLM_API_KEY=
# LLM_MODEL=gpt-4o-mini
# LLM_TIMEOUT=10
```

(Leave the following `# FILESYSTEM_DISK=public` line untouched.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `vendor/bin/pest tests/Feature/LlmTest.php`
Expected: PASS — 7 tests (dataset counts as 3).

- [ ] **Step 5: Commit**

```bash
git add config/llm.php app/Services/Llm/Llm.php .env.example tests/Feature/LlmTest.php
git commit -m "feat: add llm provider config and resolver"
```

---

### Task 2: OpenAI-compatible LLM client

**Files:**
- Create: `app/Services/Llm/LlmException.php`
- Create: `app/Services/Llm/OpenAiLlmClient.php`
- Modify: `app/Services/Llm/Llm.php` (add `client()`)
- Test: `tests/Feature/OpenAiLlmClientTest.php`

**Interfaces:**
- Consumes: `Llm::baseUrl()`, `Llm::enabled()` from Task 1; Laravel `Http` facade.
- Produces: `Llm::client(): OpenAiLlmClient` (throws `LlmException` when not configured); `OpenAiLlmClient::complete(string $system, string $user): string` (throws `LlmException` on any failure). Task 3 depends on both.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/OpenAiLlmClientTest.php`:

```php
<?php

use App\Services\Llm\Llm;
use App\Services\Llm\LlmException;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config([
        'llm.provider' => 'openai',
        'llm.base_url' => null,
        'llm.api_key' => 'test-key',
        'llm.model' => 'gpt-4o-mini',
        'llm.timeout' => 5,
    ]);
});

it('returns the message content from an openai-shaped response', function () {
    $body = '{"excerpt":"E","meta_title":"T","meta_description":"D"}';
    Http::fake(['*' => Http::response([
        'choices' => [['message' => ['content' => $body]]],
    ], 200)]);

    $content = Llm::client()->complete('system prompt', 'user prompt');

    expect($content)->toBe($body);
    Http::assertSent(function ($request) {
        return $request->url() === 'https://api.openai.com/v1/chat/completions'
            && $request->hasHeader('Authorization', 'Bearer test-key')
            && $request['model'] === 'gpt-4o-mini'
            && $request['messages'][0] === ['role' => 'system', 'content' => 'system prompt']
            && $request['messages'][1] === ['role' => 'user', 'content' => 'user prompt'];
    });
});

it('throws when the provider returns an http error', function () {
    Http::fake(['*' => Http::response('boom', 500)]);

    Llm::client()->complete('s', 'u');
})->throws(LlmException::class);

it('throws when the network fails', function () {
    Http::fake(['*' => Http::failedConnection('timeout')]);

    Llm::client()->complete('s', 'u');
})->throws(LlmException::class);

it('throws when the message content is missing or empty', function () {
    Http::fake(['*' => Http::response([
        'choices' => [['message' => ['content' => '']]],
    ], 200)]);

    Llm::client()->complete('s', 'u');
})->throws(LlmException::class);

it('refuses to build a client when not configured', function () {
    config(['llm.api_key' => null]);

    Llm::client();
})->throws(LlmException::class);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `vendor/bin/pest tests/Feature/OpenAiLlmClientTest.php`
Expected: FAIL — `Call to undefined method App\Services\Llm\Llm::client()` (or class-not-found for `LlmException`).

- [ ] **Step 3: Write the implementation**

Create `app/Services/Llm/LlmException.php`:

```php
<?php

namespace App\Services\Llm;

use RuntimeException;

class LlmException extends RuntimeException
{
}
```

Create `app/Services/Llm/OpenAiLlmClient.php`:

```php
<?php

namespace App\Services\Llm;

use Illuminate\Support\Facades\Http;
use Throwable;

class OpenAiLlmClient
{
    public function __construct(
        private readonly string $baseUrl,
        private readonly string $apiKey,
        private readonly string $model,
        private readonly int $timeout,
    ) {
    }

    public function complete(string $system, string $user): string
    {
        try {
            $response = Http::withToken($this->apiKey)
                ->timeout($this->timeout)
                ->post($this->baseUrl.'/chat/completions', [
                    'model' => $this->model,
                    'messages' => [
                        ['role' => 'system', 'content' => $system],
                        ['role' => 'user', 'content' => $user],
                    ],
                    'temperature' => 0.6,
                    'max_tokens' => 400,
                ]);
        } catch (Throwable $e) {
            throw new LlmException('LLM request failed: '.$e->getMessage(), 0, $e);
        }

        if ($response->failed()) {
            throw new LlmException('LLM HTTP '.$response->status());
        }

        $content = $response->json('choices.0.message.content');

        if (! is_string($content) || $content === '') {
            throw new LlmException('LLM returned no message content');
        }

        return $content;
    }
}
```

Modify `app/Services/Llm/Llm.php` — add this method inside the class:

```php
    public static function client(): OpenAiLlmClient
    {
        if (! self::enabled()) {
            throw new LlmException('LLM not configured');
        }

        return new OpenAiLlmClient(
            (string) self::baseUrl(),
            (string) config('llm.api_key'),
            (string) config('llm.model'),
            (int) config('llm.timeout', 10),
        );
    }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `vendor/bin/pest tests/Feature/OpenAiLlmClientTest.php`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add app/Services/Llm/ tests/Feature/OpenAiLlmClientTest.php
git commit -m "feat: add openai-compatible llm client"
```

---

### Task 3: AI suggestion service (prompt, parse, clamp)

**Files:**
- Create: `app/Services/Llm/SeoSuggestService.php`
- Test: `tests/Feature/SeoSuggestServiceTest.php`

**Interfaces:**
- Consumes: `Llm::client()->complete(system, user)` and `LlmException` from Task 2.
- Produces: `SeoSuggestService::suggest(string $title, string $bodyHtml): array` returning `['excerpt' => string, 'meta_title' => string, 'meta_description' => string, 'source' => 'ai']` with every string field clamped (280/160/60). Task 4's controller depends on this exact shape.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/SeoSuggestServiceTest.php`:

```php
<?php

use App\Services\Llm\LlmException;
use App\Services\Llm\SeoSuggestService;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config([
        'llm.provider' => 'openai',
        'llm.base_url' => null,
        'llm.api_key' => 'k',
        'llm.model' => 'm',
        'llm.timeout' => 5,
    ]);
});

function seoSuggestFakeContent(string $content): void
{
    Http::fake(['*' => Http::response([
        'choices' => [['message' => ['content' => $content]]],
    ], 200)]);
}

it('returns clamped suggestions when the model overshoots every limit', function () {
    seoSuggestFakeContent(json_encode([
        'excerpt' => str_repeat('Excerpt words here ', 40),
        'meta_title' => 'This Title Is Way Longer Than Sixty Characters And Must Be Clamped Down',
        'meta_description' => str_repeat('desc words ', 30),
    ]));

    $result = app(SeoSuggestService::class)->suggest('My Title', '<p>Hello <strong>world</strong></p>');

    expect($result['source'])->toBe('ai')
        ->and($result['meta_title'])->toBe('This Title Is Way Longer Than Sixty Characters And Must Be…')
        ->and(mb_strlen($result['excerpt']))->toBeLessThanOrEqual(280)
        ->and($result['excerpt'])->toEndWith('…')
        ->and(mb_strlen($result['meta_description']))->toBeLessThanOrEqual(160)
        ->and($result['meta_description'])->toEndWith('…');
});

it('keeps a complete sentence when it fits within the limit', function () {
    $sentence = str_repeat('word ', 25).'ending here nicely.';
    seoSuggestFakeContent(json_encode([
        'excerpt' => 'short',
        'meta_title' => 't',
        'meta_description' => $sentence.str_repeat(' junk', 40),
    ]));

    $result = app(SeoSuggestService::class)->suggest('T', '<p>b</p>');

    expect($result['meta_description'])->toBe($sentence);
});

it('sends a strict-json system prompt and plain text with entities decoded', function () {
    seoSuggestFakeContent('{"excerpt":"e","meta_title":"t","meta_description":"d"}');

    app(SeoSuggestService::class)->suggest('Half & Half', '<h2>Hi</h2><p>José &amp; friends</p>');

    Http::assertSent(function ($request) {
        $system = $request['messages'][0]['content'];
        $user = $request['messages'][1]['content'];

        return str_contains($system, 'ONLY a JSON object')
            && str_contains($user, 'Post title: Half & Half')
            && str_contains($user, 'José & friends');
    });
});

it('throws when the model answers with prose instead of json', function () {
    seoSuggestFakeContent('Sure — here are my thoughts on the metadata.');

    app(SeoSuggestService::class)->suggest('T', '<p>b</p>');
})->throws(LlmException::class);

it('throws when the json is missing a required key', function () {
    seoSuggestFakeContent('{"excerpt":"e"}');

    app(SeoSuggestService::class)->suggest('T', '<p>b</p>');
})->throws(LlmException::class);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `vendor/bin/pest tests/Feature/SeoSuggestServiceTest.php`
Expected: FAIL — `Class "App\Services\Llm\SeoSuggestService" not found`.

- [ ] **Step 3: Write the implementation**

Create `app/Services/Llm/SeoSuggestService.php`:

```php
<?php

namespace App\Services\Llm;

class SeoSuggestService
{
    private const SYSTEM_PROMPT = <<<'PROMPT'
You write SEO metadata for a personal blog called "Timadey".
Return ONLY a JSON object with no markdown fences and no commentary, containing exactly these three string keys:
"excerpt" — a narrative teaser of at most 280 characters that makes a reader want to continue; it flows from the title without repeating it.
"meta_title" — a search title of at most 60 characters with the primary keyword front-loaded; never include the site name.
"meta_description" — a summary hook of at most 160 characters in active voice; never truncate the first paragraph.
Plain text only, no HTML.
PROMPT;

    public function suggest(string $title, string $bodyHtml): array
    {
        $raw = Llm::client()->complete(self::SYSTEM_PROMPT, $this->userPrompt($title, $bodyHtml));
        $fields = $this->decode($raw);

        return [
            'excerpt' => self::clamp($fields['excerpt'], 280),
            'meta_title' => self::clamp($fields['meta_title'], 60),
            'meta_description' => self::clamp($fields['meta_description'], 160),
            'source' => 'ai',
        ];
    }

    private function userPrompt(string $title, string $bodyHtml): string
    {
        $text = preg_replace('/<[^>]+>/u', ' ', $bodyHtml);
        $text = html_entity_decode((string) $text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = trim(preg_replace('/\s+/u', ' ', (string) $text));

        if (mb_strlen($text) > 4000) {
            $text = mb_substr($text, 0, 4000).'…';
        }

        return "Post title: {$title}\n\nPost content (plain text):\n{$text}";
    }

    private function decode(string $raw): array
    {
        $raw = trim($raw);
        $raw = (string) preg_replace('/^```(?:json)?\s*/i', '', $raw);
        $raw = (string) preg_replace('/\s*```$/i', '', $raw);

        $start = strpos($raw, '{');
        $end = strrpos($raw, '}');

        if ($start === false || $end === false || $end < $start) {
            throw new LlmException('No JSON object in LLM response');
        }

        $decoded = json_decode(substr($raw, $start, $end - $start + 1), true);

        if (! is_array($decoded)) {
            throw new LlmException('LLM response is not valid JSON');
        }

        foreach (['excerpt', 'meta_title', 'meta_description'] as $key) {
            if (! array_key_exists($key, $decoded) || ! is_string($decoded[$key])) {
                throw new LlmException("LLM response is missing string key: {$key}");
            }
        }

        return [
            'excerpt' => $decoded['excerpt'],
            'meta_title' => $decoded['meta_title'],
            'meta_description' => $decoded['meta_description'],
        ];
    }

    private static function clamp(string $text, int $max): string
    {
        $trimmed = trim($text);

        if (mb_strlen($trimmed) <= $max) {
            return $trimmed;
        }

        $slice = mb_substr($trimmed, 0, $max);
        $positions = array_filter(
            [mb_strrpos($slice, '.'), mb_strrpos($slice, '!'), mb_strrpos($slice, '?')],
            fn ($p) => $p !== false,
        );
        $sentenceEnd = $positions === [] ? -1 : max($positions);

        if ($sentenceEnd >= intdiv($max, 2)) {
            return trim(mb_substr($slice, 0, $sentenceEnd + 1));
        }

        $wordCut = mb_substr($trimmed, 0, $max - 1);
        $lastSpace = mb_strrpos($wordCut, ' ');
        $base = $lastSpace !== false && $lastSpace > 0 ? mb_substr($wordCut, 0, $lastSpace) : $wordCut;

        return trim($base).'…';
    }
}
```

Derivation of that `meta_title` expectation (do not weaken it): input is 71 chars with no sentence punctuation → `wordCut = mb_substr($trimmed, 0, 59)` ends on the space after `Be` → `lastSpace` = 58 → base = first 58 chars ending at `Be` → result = `This Title Is Way Longer Than Sixty Characters And Must Be…` (59 chars ≤ 60).

- [ ] **Step 4: Run the test to verify it passes**

Run: `vendor/bin/pest tests/Feature/SeoSuggestServiceTest.php`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add app/Services/Llm/SeoSuggestService.php tests/Feature/SeoSuggestServiceTest.php
git commit -m "feat: add ai seo suggestion service with defensive clamping"
```

---

### Task 4: Admin suggest-seo endpoint

**Files:**
- Modify: `app/Http/Controllers/Admin/PostController.php` (imports + new method)
- Modify: `routes/web.php` (after line 26, the preview route)
- Test: `tests/Feature/AdminSuggestSeoTest.php`

**Interfaces:**
- Consumes: `Llm::enabled()`, `LlmException`, `SeoSuggestService::suggest(title, body)` from Tasks 1-3.
- Produces: `POST /admin/posts/suggest-seo` → `200 {excerpt, meta_title, meta_description, source}` | `422 {message:'LLM not configured'}` | `502 {message:'AI suggestion failed'}` | validation-422. Task 6's frontend depends on this contract.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/AdminSuggestSeoTest.php`:

```php
<?php

use App\Models\User;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config([
        'llm.provider' => 'openai',
        'llm.base_url' => null,
        'llm.api_key' => null,
        'llm.model' => null,
        'llm.timeout' => 5,
    ]);
    $this->owner = User::factory()->create(['role' => 'owner']);
});

it('requires authentication', function () {
    $this->post('/admin/posts/suggest-seo', ['title' => 'T', 'body' => '<p>b</p>'])
        ->assertRedirect();
});

it('forbids non-owners', function () {
    $this->actingAs(User::factory()->create())
        ->post('/admin/posts/suggest-seo', ['title' => 'T', 'body' => '<p>b</p>'])
        ->assertForbidden();
});

it('returns 422 when the llm is not configured', function () {
    $this->actingAs($this->owner)
        ->postJson('/admin/posts/suggest-seo', ['title' => 'T', 'body' => '<p>b</p>'])
        ->assertStatus(422)
        ->assertJson(['message' => 'LLM not configured']);
});

it('validates the payload', function () {
    $this->actingAs($this->owner)
        ->postJson('/admin/posts/suggest-seo', ['body' => '<p>only</p>'])
        ->assertJsonValidationErrors(['title']);
});

it('returns clamped suggestions from the provider', function () {
    config(['llm.api_key' => 'k', 'llm.model' => 'm']);
    Http::fake(['*' => Http::response([
        'choices' => [['message' => ['content' => json_encode([
            'excerpt' => str_repeat('words ', 100),
            'meta_title' => 'A perfectly reasonable title under sixty',
            'meta_description' => str_repeat('words ', 100),
        ])]]],
    ], 200)]);

    $response = $this->actingAs($this->owner)
        ->postJson('/admin/posts/suggest-seo', ['title' => 'T', 'body' => '<p>Body</p>'])
        ->assertOk()
        ->assertJsonPath('source', 'ai')
        ->assertJsonPath('meta_title', 'A perfectly reasonable title under sixty');

    $data = $response->json();
    expect(mb_strlen($data['excerpt']))->toBeLessThanOrEqual(280)
        ->and($data['excerpt'])->toEndWith('…')
        ->and(mb_strlen($data['meta_description']))->toBeLessThanOrEqual(160)
        ->and($data['meta_description'])->toEndWith('…');
});

it('returns 502 when the provider fails', function () {
    config(['llm.api_key' => 'k', 'llm.model' => 'm']);
    Http::fake(['*' => Http::response('err', 500)]);

    $this->actingAs($this->owner)
        ->postJson('/admin/posts/suggest-seo', ['title' => 'T', 'body' => '<p>b</p>'])
        ->assertStatus(502)
        ->assertJson(['message' => 'AI suggestion failed']);
});

it('returns 502 when the model answers with prose', function () {
    config(['llm.api_key' => 'k', 'llm.model' => 'm']);
    Http::fake(['*' => Http::response([
        'choices' => [['message' => ['content' => 'Sure! Here are my thoughts.']]],
    ], 200)]);

    $this->actingAs($this->owner)
        ->postJson('/admin/posts/suggest-seo', ['title' => 'T', 'body' => '<p>b</p>'])
        ->assertStatus(502);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `vendor/bin/pest tests/Feature/AdminSuggestSeoTest.php`
Expected: FAIL — first tests fail with 404 (route missing) / 405.

- [ ] **Step 3: Write the implementation**

Modify `routes/web.php` — insert after line 26 (`->name('posts.preview');`):

```php
    Route::post('posts/suggest-seo', [\App\Http\Controllers\Admin\PostController::class, 'suggestSeo'])
        ->middleware('throttle:20,1')
        ->name('posts.suggest-seo');
```

Modify `app/Http/Controllers/Admin/PostController.php`:

Extend the existing import block:

```php
use App\Http\Controllers\Controller;
use App\Http\Requests\StorePostRequest;
use App\Models\{Post, Tag, Topic};
use App\Services\Llm\Llm;
use App\Services\Llm\LlmException;
use App\Services\Llm\SeoSuggestService;
use Illuminate\Http\{JsonResponse, RedirectResponse, Request};
use Inertia\{Inertia, Response};
```

Add this method inside the class (after `preview()`):

```php
    public function suggestSeo(Request $request, SeoSuggestService $service): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:300'],
            'body' => ['required', 'string', 'max:100000'],
        ]);

        if (! Llm::enabled()) {
            return response()->json(['message' => 'LLM not configured'], 422);
        }

        try {
            return response()->json($service->suggest($data['title'], $data['body']));
        } catch (LlmException $e) {
            report($e);

            return response()->json(['message' => 'AI suggestion failed'], 502);
        }
    }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `vendor/bin/pest tests/Feature/AdminSuggestSeoTest.php`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add routes/web.php app/Http/Controllers/Admin/PostController.php tests/Feature/AdminSuggestSeoTest.php
git commit -m "feat: add admin suggest-seo endpoint"
```

---

### Task 5: Share `llm_enabled` with Inertia pages

**Files:**
- Modify: `app/Http/Middleware/HandleInertiaRequests.php`
- Test: `tests/Feature/AdminSuggestSeoTest.php` (add one test)

**Interfaces:**
- Consumes: `Llm::enabled()` from Task 1.
- Produces: shared prop `llm_enabled: boolean` on every Inertia page. Task 7's `Edit.tsx` reads it as `usePage().props as { llm_enabled: boolean }`.

- [ ] **Step 1: Write the failing test**

Append to `tests/Feature/AdminSuggestSeoTest.php`:

```php
it('shares whether the llm is enabled', function () {
    $this->actingAs($this->owner)
        ->get('/admin')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('llm_enabled', false));

    config(['llm.api_key' => 'k', 'llm.model' => 'm']);

    $this->actingAs($this->owner)
        ->get('/admin')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('llm_enabled', true));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `vendor/bin/pest tests/Feature/AdminSuggestSeoTest.php --filter="shares whether"`
Expected: FAIL — prop `llm_enabled` is undefined/null.

- [ ] **Step 3: Write the implementation**

Modify `app/Http/Middleware/HandleInertiaRequests.php`:

Add import:

```php
use App\Models\SocialLink;
use App\Services\Llm\Llm;
```

Add entry to the `share()` array (after `'social_links' => ...`):

```php
            'llm_enabled' => fn () => Llm::enabled(),
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `vendor/bin/pest tests/Feature/AdminSuggestSeoTest.php`
Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
git add app/Http/Middleware/HandleInertiaRequests.php tests/Feature/AdminSuggestSeoTest.php
git commit -m "feat: share llm_enabled with inertia pages"
```

---

### Task 6: AI branch in SeoSuggestButton

**Files:**
- Modify: `resources/js/Components/SeoSuggestButton.tsx` (current state includes the owner's `string | null` values fix from `6d834ba` — preserve it)
- Test: `resources/js/Components/__tests__/SeoSuggestButton.test.tsx` (extend existing file — currently 5 tests)

**Interfaces:**
- Consumes: `suggestSeo`/`SeoSuggestion` from `resources/js/seoSuggest.ts` (existing); endpoint contract from Task 4.
- Produces: `SeoSuggestButton` props gain `llmEnabled?: boolean` (default `false`). Existing props unchanged. Task 7 passes `llmEnabled={llm_enabled}`.

- [ ] **Step 1: Write the failing tests**

Append to `resources/js/Components/__tests__/SeoSuggestButton.test.tsx` (keep the existing `describe` block and imports; add `waitFor` to the `@testing-library/react` import):

```tsx
function jsonResponse(body: unknown) {
    return { ok: true, json: async () => body } as Response;
}

describe('SeoSuggestButton with llmEnabled', () => {
    test('posts to the suggest-seo endpoint and fills from the response', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            jsonResponse({
                excerpt: 'AI excerpt here.',
                meta_title: 'AI Title',
                meta_description: 'AI description.',
                source: 'ai',
            }),
        );
        vi.stubGlobal('fetch', fetchMock);
        const onFill = vi.fn();
        render(<SeoSuggestButton body="<p>Body</p>" title="T" values={empty} onFill={onFill} llmEnabled />);

        fireEvent.click(screen.getByRole('button', { name: 'Suggest from content' }));

        expect(screen.getByRole('button', { name: 'Suggesting…' })).toBeDisabled();

        await waitFor(() => expect(onFill).toHaveBeenCalledTimes(3));
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('/admin/posts/suggest-seo');
        expect(JSON.parse(init.body)).toEqual({ title: 'T', body: '<p>Body</p>' });
        expect(onFill).toHaveBeenCalledWith('excerpt', 'AI excerpt here.');
        expect(screen.getByRole('button', { name: 'Suggest from content' })).toBeEnabled();

        vi.unstubAllGlobals();
    });

    test('falls back to local rules when the request fails', async () => {
        const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
        vi.stubGlobal('fetch', fetchMock);
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const onFill = vi.fn();
        render(<SeoSuggestButton body={BODY} title="Sample Title" values={empty} onFill={onFill} llmEnabled />);

        fireEvent.click(screen.getByRole('button', { name: 'Suggest from content' }));

        await waitFor(() =>
            expect(onFill).toHaveBeenCalledWith('excerpt', expect.stringContaining('This is a body paragraph')),
        );
        expect(warn).toHaveBeenCalled();

        warn.mockRestore();
        vi.unstubAllGlobals();
    });

    test('does not call the network when the llm is disabled', () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        const onFill = vi.fn();
        render(<SeoSuggestButton body={BODY} title="Sample Title" values={empty} onFill={onFill} />);

        fireEvent.click(screen.getByRole('button', { name: 'Suggest from content' }));

        expect(onFill).toHaveBeenCalledTimes(3);
        expect(fetchMock).not.toHaveBeenCalled();

        vi.unstubAllGlobals();
    });

    test('does not overwrite a field the user fills while the request is in flight', async () => {
        let resolveFetch!: (value: unknown) => void;
        const fetchMock = vi.fn(() => new Promise((resolve) => (resolveFetch = resolve)));
        vi.stubGlobal('fetch', fetchMock);
        const onFill = vi.fn();
        const { rerender } = render(
            <SeoSuggestButton body={BODY} title="T" values={empty} onFill={onFill} llmEnabled />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Suggest from content' }));

        rerender(
            <SeoSuggestButton
                body={BODY}
                title="T"
                values={{ ...empty, excerpt: 'Hand written.' }}
                onFill={onFill}
                llmEnabled
            />,
        );

        resolveFetch(
            jsonResponse({
                excerpt: 'AI excerpt.',
                meta_title: 'AI title',
                meta_description: 'AI description.',
            }),
        );

        await waitFor(() => expect(onFill).toHaveBeenCalledTimes(2));
        expect(onFill).not.toHaveBeenCalledWith('excerpt', expect.anything());

        vi.unstubAllGlobals();
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run resources/js/Components/__tests__/SeoSuggestButton.test.tsx`
Expected: the 5 existing tests still PASS; the 4 new tests FAIL (no fetch call happens / local fill happens instead / `llmEnabled` unknown).

- [ ] **Step 3: Write the implementation**

Replace the entire content of `resources/js/Components/SeoSuggestButton.tsx` with:

```tsx
import { Button } from '@/Components/Button';
import { suggestSeo, type SeoSuggestion } from '@/seoSuggest';
import { useRef, useState } from 'react';

const FIELDS = ['excerpt', 'meta_title', 'meta_description'] as const;

export type SeoField = (typeof FIELDS)[number];

type Props = {
    body: string;
    title: string;
    values: Record<SeoField, string | null>;
    onFill: (field: SeoField, value: string) => void;
    llmEnabled?: boolean;
};

export function SeoSuggestButton({ body, title, values, onFill, llmEnabled = false }: Props) {
    const [busy, setBusy] = useState(false);
    const valuesRef = useRef(values);
    valuesRef.current = values;

    const empty = FIELDS.filter((field) => !(values[field] ?? '').trim());

    const apply = (suggestion: SeoSuggestion) => {
        FIELDS.filter((field) => !(valuesRef.current[field] ?? '').trim()).forEach((field) => {
            if (suggestion[field]) onFill(field, suggestion[field]);
        });
    };

    const suggest = async () => {
        if (!llmEnabled) {
            apply(suggestSeo(body, title));
            return;
        }

        setBusy(true);
        try {
            const xsrf = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '';
            const response = await fetch('/admin/posts/suggest-seo', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': decodeURIComponent(xsrf),
                },
                credentials: 'same-origin',
                body: JSON.stringify({ title, body }),
            });
            if (!response.ok) throw new Error(`suggest-seo failed with ${response.status}`);
            const data = (await response.json()) as Partial<SeoSuggestion>;
            if (
                typeof data.excerpt !== 'string' ||
                typeof data.meta_title !== 'string' ||
                typeof data.meta_description !== 'string'
            ) {
                throw new Error('suggest-seo returned an unexpected shape');
            }
            apply({ excerpt: data.excerpt, meta_title: data.meta_title, meta_description: data.meta_description });
        } catch (error) {
            console.warn('AI suggest failed; falling back to local rules', error);
            apply(suggestSeo(body, title));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Button variant="secondary" type="button" onClick={suggest} disabled={busy || empty.length === 0}>
            {busy ? 'Suggesting…' : 'Suggest from content'}
        </Button>
    );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run resources/js/Components/__tests__/SeoSuggestButton.test.tsx`
Expected: PASS — 9 tests (5 existing incl. the owner's null-values test + 4 new).

- [ ] **Step 5: Commit**

```bash
git add resources/js/Components/SeoSuggestButton.tsx resources/js/Components/__tests__/SeoSuggestButton.test.tsx
git commit -m "feat: suggest seo fields via ai when configured"
```

---

### Task 7: Wire AI suggest into the post editor

**Files:**
- Modify: `resources/js/Pages/Admin/Posts/Edit.tsx` (import line 2; `PostEdit` function line 68; `<SeoSuggestButton>` JSX line 291 — line numbers as of `6d834ba`)

**Interfaces:**
- Consumes: shared prop `llm_enabled` (Task 5); `llmEnabled` prop (Task 6).
- Produces: none (leaf wiring).

- [ ] **Step 1: Write the failing test**

No new unit test — this is page-level wiring (spec testing section covers endpoint + button only; the shared prop is asserted in Task 5). RED evidence = type-level: before wiring, `Edit.tsx` never reads `llm_enabled`, so the AI path is unreachable from the UI (verified by `grep` below).

Run: `grep -c "llm_enabled" resources/js/Pages/Admin/Posts/Edit.tsx`
Expected: `0`

- [ ] **Step 2: Implement the wiring**

Modify `resources/js/Pages/Admin/Posts/Edit.tsx`:

Import — change line 2:

```tsx
import { useForm, Link } from '@inertiajs/react';
```

to:

```tsx
import { useForm, Link, usePage } from '@inertiajs/react';
```

Inside `PostEdit` (line 68; right after the `useForm<PostForm>({...})` call ends):

```tsx
    const { llm_enabled } = usePage().props as { llm_enabled: boolean };
```

Button usage — change the existing `<SeoSuggestButton ...>` JSX (the one above the Meta title field) to:

```tsx
                        <SeoSuggestButton
                            body={data.body}
                            title={data.title}
                            llmEnabled={llm_enabled}
                            values={{
                                excerpt: data.excerpt,
                                meta_title: data.meta_title,
                                meta_description: data.meta_description,
                            }}
                            onFill={(field, value) => update(field, value)}
                        />
```

- [ ] **Step 3: Verify wiring present**

Run: `grep -c "llm_enabled" resources/js/Pages/Admin/Posts/Edit.tsx`
Expected: `2` (read + pass).

- [ ] **Step 4: Run the frontend suite and build**

Run: `npm test 2>&1 | grep -E "Test Files|Tests|FAIL"`
Expected: `Test Files 32 passed (32)`, `Tests 122 passed (122)` (118 baseline incl. owner's null test + 4 new from Task 6), no FAIL lines.

Run: `npm run build`
Expected: `✓ built in …s`.

- [ ] **Step 5: Commit**

```bash
git add resources/js/Pages/Admin/Posts/Edit.tsx public/build
git commit -m "feat: wire ai suggest into admin post editor"
```

(If `public/build` is already current from Task 6's suite run, the commit simply includes the rebuilt hashed assets — never stage `.vite/`.)

---

### Task 8: Full regression

**Files:**
- None new (verification gate; commit only if something is outstanding)

**Interfaces:**
- Consumes: all prior tasks.
- Produces: green baselines, updated counts for future plans.

- [ ] **Step 1: Run the full Pest suite**

Run: `vendor/bin/pest`
Expected: all green — **277 tests** (252 baseline + 7 Task 1 + 5 Task 2 + 5 Task 3 + 7 Task 4 + 1 Task 5). If the count differs but everything passes, report the actual count.

- [ ] **Step 2: Run the full Vitest suite**

Run: `npm test 2>&1 | grep -E "Test Files|Tests|FAIL"`
Expected: `Tests 122 passed (122)`, no FAIL lines (3 pre-existing jsdom `scrollIntoView` console errors are harmless).

- [ ] **Step 3: Build and check the working tree**

Run: `npm run build && git status --porcelain | grep -v '^??'`
Expected: build succeeds; no unstaged modifications besides deliberately excluded `.vite/` (untracked) and any user-owned `config/app.php` (never stage).

- [ ] **Step 4: Commit anything outstanding (only if present)**

```bash
git add -A -- public/build resources/js app/Http app/Services config/llm.php routes/web.php tests
git commit -m "chore: verify ai seo suggestion suites"
```

If `git status` shows nothing staged-worthy, skip this commit.

- [ ] **Step 5: Hand off**

Remind the owner: push + Coolify redeploy ships everything; the feature is live-but-disabled until they add `LLM_PROVIDER` / `LLM_API_KEY` / `LLM_MODEL` (optionally `LLM_BASE_URL`, `LLM_TIMEOUT`) as Coolify env vars. The AI key never enters git.
