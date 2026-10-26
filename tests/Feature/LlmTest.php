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
