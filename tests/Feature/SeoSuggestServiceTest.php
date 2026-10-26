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
