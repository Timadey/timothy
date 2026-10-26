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
