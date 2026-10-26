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
