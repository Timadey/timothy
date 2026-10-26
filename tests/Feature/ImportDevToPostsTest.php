<?php

use App\Models\Post;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

function devtoIndexFixture(array $overrides = []): array
{
    return array_merge([
        'id' => 991,
        'slug' => 'my-first-post-abc1',
        'title' => 'My First Post',
        'url' => 'https://dev.to/timadey/my-first-post-abc1',
        'description' => 'A short teaser about things.',
        'published_at' => '2025-12-01T10:00:00Z',
        'tag_list' => ['laravel', 'php'],
        'social_image' => 'https://media2.dev.to/dynamic/image/cover.png',
        'cover_image' => 'https://media2.dev.to/dynamic/image/cover.png',
    ], $overrides);
}

function devtoShowFixture(array $overrides = []): array
{
    $body = <<<'HTML'
<p class="dev-card">Intro with <a href="https://example.com" target="_blank" rel="noopener" class="x">link</a>.</p>
<h4>Nested heading</h4>
<div class="hljs"><span>code-ish</span></div>
<pre><code class="language-php">echo 1;</code></pre>
<blockquote><p>quote</p></blockquote>
<ul><li>one</li></ul>
<svg width="24"><title>icon</title><path d="M0"/></svg>
<table><thead><tr><th>Col</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>
<p><img src="https://media2.dev.to/dynamic/image/body.png" alt="shot" loading="lazy"></p>
<script>alert(1)</script>
HTML;

    return array_merge(devtoIndexFixture($overrides), ['body_html' => $body]);
}

function fakeDevToApi(array $articles, array $shows): void
{
    Http::fake([
        'dev.to/api/articles?username=*' => Http::response($articles),
        ...collect($shows)->mapWithKeys(fn ($show, $id) => [
            "dev.to/api/articles/{$id}" => Http::response($show),
        ])->all(),
        'media2.dev.to/*' => Http::response('IMG', 200, ['Content-Type' => 'image/png']),
    ]);
}

it('imports dev.to articles as published posts with cleaned bodies', function () {
    Storage::fake('public');
    $author = User::factory()->create();
    fakeDevToApi([devtoIndexFixture()], [991 => devtoShowFixture()]);

    $this->artisan('devto:import')->assertExitCode(0);

    $post = Post::sole();

    expect($post->title)->toBe('My First Post')
        ->and($post->slug)->toBe('my-first-post')
        ->and($post->status)->toBe('published')
        ->and($post->visibility)->toBe('public')
        ->and($post->post_type)->toBe('article')
        ->and($post->excerpt)->toBe('A short teaser about things.')
        ->and($post->meta_description)->toBe('A short teaser about things.')
        ->and($post->source_url)->toBe('https://dev.to/timadey/my-first-post-abc1')
        ->and($post->author_id)->toBe($author->id)
        ->and($post->published_at->equalTo(\Illuminate\Support\Carbon::parse('2025-12-01T10:00:00Z')))->toBeTrue()
        ->and($post->reading_time)->toBeGreaterThan(0)
        ->and($post->cover_image)->toStartWith('/storage/uploads/devto/')
        ->and($post->tags->pluck('slug')->all())->toEqualCanonicalizing(['laravel', 'php']);

    $body = $post->body;

    expect($body)
        ->toContain('Intro with')
        ->not->toContain('class=')
        ->toContain('<h3>Nested heading</h3>')
        ->not->toContain('<h4')
        ->not->toContain('<div')
        ->not->toContain('<span')
        ->toContain('code-ish')
        ->not->toContain('<svg')
        ->not->toContain('<script')
        ->not->toContain('<table')
        ->not->toContain('<td')
        ->toContain('Cell')
        ->toContain('href="https://example.com"')
        ->toContain('/storage/uploads/devto/')
        ->not->toContain('media2.dev.to');

    expect(count(Storage::disk('public')->allFiles('uploads/devto')))->toBe(2);

    expect(fn () => \App\Support\HtmlSanitizer::sanitize($body))
        ->not->toThrow(ValidationException::class);
});

it('is idempotent — running twice does not duplicate posts', function () {
    Storage::fake('public');
    User::factory()->create();
    fakeDevToApi([devtoIndexFixture()], [991 => devtoShowFixture()]);

    $this->artisan('devto:import')->assertExitCode(0);
    $this->artisan('devto:import')->assertExitCode(0);

    expect(Post::count())->toBe(1);
});

it('imports only the requested slugs', function () {
    Storage::fake('public');
    User::factory()->create();
    $second = devtoIndexFixture([
        'id' => 992,
        'slug' => 'second-post-xyz2',
        'title' => 'Second Post',
        'url' => 'https://dev.to/timadey/second-post-xyz2',
        'social_image' => null,
        'cover_image' => null,
    ]);
    fakeDevToApi([devtoIndexFixture(), $second], [991 => devtoShowFixture()]);

    $this->artisan('devto:import --only=my-first-post-abc1')->assertExitCode(0);

    expect(Post::count())->toBe(1);
    expect(Post::sole()->title)->toBe('My First Post');
});

it('still imports an article when its images fail to download', function () {
    Storage::fake('public');
    User::factory()->create();
    Http::fake([
        'dev.to/api/articles?username=*' => Http::response([devtoIndexFixture()]),
        'dev.to/api/articles/991' => Http::response(devtoShowFixture()),
        'media2.dev.to/*' => Http::response('nope', 500),
    ]);

    $this->artisan('devto:import')->assertExitCode(0);

    $post = Post::sole();

    expect($post->cover_image)->toBeNull()
        ->and($post->body)->not->toContain('media2.dev.to')
        ->and($post->body)->not->toContain('<img');
});
