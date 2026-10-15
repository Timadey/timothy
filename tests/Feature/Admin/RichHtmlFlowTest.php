<?php

use App\Models\{Post, Project, User};
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->owner = User::factory()->create(['role' => 'owner']);
});

function makeHtmlArticle(array $overrides = []): Post
{
    $owner = User::firstOrFail();

    return Post::factory()->create(array_merge([
        'post_type' => 'article',
        'status' => 'published',
        'visibility' => 'public',
        'published_at' => now(),
        'author_id' => $owner->id,
        'title' => 'Html article',
        'slug' => 'html-article',
        'body' => '<p>Hello <strong>world</strong> and <a href="https://example.com">friends</a>.</p>',
    ], $overrides));
}

it('rejects unsafe markup when storing an article', function () {
    $this->actingAs($this->owner)->postJson('/admin/posts', [
        'title' => 'Bad article',
        'post_type' => 'article',
        'status' => 'draft',
        'visibility' => 'public',
        'body' => '<p>hi</p><script>alert(1)</script>',
    ])->assertStatus(422)->assertJsonValidationErrors('body');
});

it('rejects unsafe markup when updating an article', function () {
    $post = makeHtmlArticle();

    $this->actingAs($this->owner)->putJson("/admin/posts/{$post->id}", [
        'title' => 'Bad update',
        'post_type' => 'article',
        'status' => 'draft',
        'visibility' => 'public',
        'body' => '<p>hi</p><img src="https://evil.example/x.png">',
    ])->assertStatus(422)->assertJsonValidationErrors('body');
});

it('stores clean html article bodies untouched', function () {
    $html = '<p>Hello <strong>world</strong></p><h2>Section</h2>';

    $this->actingAs($this->owner)->post('/admin/posts', [
        'title' => 'Rich hello',
        'post_type' => 'article',
        'status' => 'draft',
        'visibility' => 'public',
        'body' => $html,
    ])->assertRedirect();

    expect(Post::where('title', 'Rich hello')->firstOrFail()->body)->toBe($html);
});

it('keeps markdown note bodies raw through the admin notes route', function () {
    $body = 'A note with **markdown** and a <b>tag-ish</b> look-alike.';

    $this->actingAs($this->owner)->post('/admin/notes', [
        'body' => $body,
        'post_type' => 'note',
        'status' => 'published',
        'visibility' => 'public',
    ])->assertRedirect();

    expect(Post::ofType('note')->firstOrFail()->body)->toBe($body);
});

it('rejects unsafe markup when storing a project', function () {
    $this->actingAs($this->owner)->postJson('/admin/projects', [
        'name' => 'Bad project',
        'status' => 'building',
        'visibility' => 'public',
        'description' => '<p>ok</p><img src="/elsewhere/x.png">',
    ])->assertStatus(422)->assertJsonValidationErrors('description');
});

it('renders stored article html on the public writing page', function () {
    $post = makeHtmlArticle();

    $this->get('/writing/'.$post->slug)->assertOk()->assertInertia(fn (AssertableInertia $page) => $page
        ->component('Writing/Show')
        ->where('post.body_html', fn ($html) => str_contains($html, '<strong>world</strong>')));
});

it('renders stored project html on the public project page', function () {
    $project = Project::factory()->create([
        'name' => 'Orbit html',
        'slug' => 'orbit-html',
        'summary' => 'A thing',
        'description' => '<p>What it <strong>does</strong></p>',
        'status' => 'active',
        'visibility' => 'public',
    ]);

    $this->get('/projects/'.$project->slug)->assertOk()->assertInertia(fn (AssertableInertia $page) => $page
        ->component('Projects/Show')
        ->where('project.description_html', fn ($html) => str_contains($html, '<strong>does</strong>')));
});

it('extracts plain text from html bodies for excerpts', function () {
    $post = makeHtmlArticle();

    expect($post->plainBody())->toBe('Hello world and friends.');
});

it('serves article html and note markdown through the api', function () {
    $article = makeHtmlArticle();
    $note = Post::factory()->create([
        'post_type' => 'note',
        'status' => 'published',
        'visibility' => 'public',
        'published_at' => now(),
        'author_id' => $this->owner->id,
        'title' => null,
        'slug' => 'api-note',
        'body' => 'Note with **bold** words.',
    ]);

    $this->getJson('/api/posts/'.$article->slug)
        ->assertOk()
        ->assertJsonPath('data.body_html', fn ($html) => str_contains($html, '<strong>world</strong>'));

    $this->getJson('/api/notes/'.$note->slug)
        ->assertOk()
        ->assertJsonPath('data.body_html', fn ($html) => str_contains($html, '<strong>bold</strong>'));
});
