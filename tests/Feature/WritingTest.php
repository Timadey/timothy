<?php

use App\Models\{Post, User};

function makeArticle(array $attrs = []): Post
{
    $author = User::factory()->create();

    return Post::factory()->create(array_merge([
        'post_type' => 'article', 'status' => 'published', 'visibility' => 'public',
        'published_at' => now()->subDay(), 'author_id' => $author->id,
        'body' => "## Heading\n\nSome content",
    ], $attrs));
}

it('lists published articles', function () {
    makeArticle(['title' => 'Public One']);
    makeArticle(['title' => 'A Draft', 'status' => 'draft']);

    $this->get('/writing')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Writing/Index')->has('posts')->where('posts.data.0.title', 'Public One'));
});

it('shows article with rendered markdown', function () {
    $post = makeArticle(['title' => 'Deep Dive']);

    $this->get('/writing/deep-dive')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Writing/Show')
            ->where('post.title', 'Deep Dive')
            ->where('post.body_html', fn ($html) => str_contains($html, '<h2>')));
});

it('404s on draft article for guests', function () {
    makeArticle(['title' => 'Secret', 'slug' => 'secret', 'status' => 'draft']);

    $this->get('/writing/secret')->assertNotFound();
});

it('filters by topic', function () {
    $post = makeArticle(['title' => 'Tagged']);
    $topic = \App\Models\Topic::create(['name' => 'AI', 'slug' => 'ai']);
    $post->topics()->attach($topic);

    $this->get('/writing?topic=ai')->assertInertia(fn ($p) => $p->where('posts.data.0.title', 'Tagged'));
});

it('searches article titles', function () {
    makeArticle(['title' => 'Neurotechnology Primer']);
    makeArticle(['title' => 'Cooking Basics']);

    $this->get('/writing?q=neuro')->assertInertia(fn ($p) => $p->where('posts.data.0.title', 'Neurotechnology Primer'));
});

it('shows related articles by shared topic', function () {
    $a = makeArticle(['title' => 'Original', 'slug' => 'original']);
    $topic = \App\Models\Topic::create(['name' => 'BCI', 'slug' => 'bci']);
    $a->topics()->attach($topic);
    $b = makeArticle(['title' => 'Sibling']);
    $b->topics()->attach($topic);

    $this->get('/writing/original')->assertInertia(fn ($p) => $p->has('related')->where('related.0.title', 'Sibling'));
});
