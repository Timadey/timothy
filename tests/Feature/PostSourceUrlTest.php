<?php

use App\Models\Post;
use App\Models\User;

function makeSourceArticle(string $sourceUrl): Post
{
    $author = User::factory()->create();

    return Post::factory()->create([
        'author_id' => $author->id,
        'post_type' => 'article', 'status' => 'published', 'visibility' => 'public',
        'published_at' => now()->subDay(),
        'title' => 'Migrated Piece', 'slug' => 'migrated-piece',
        'source_url' => $sourceUrl,
    ]);
}

it('canonicalizes migrated posts to the original while sharing the site url', function () {
    makeSourceArticle('https://dev.to/timadey/migrated-piece-abc1');

    $html = $this->get('/writing/migrated-piece')->assertOk()->getContent();

    expect($html)
        ->toContain('rel="canonical" href="https://dev.to/timadey/migrated-piece-abc1"')
        ->toContain('property="og:url" content="'.url('/writing/migrated-piece').'"');
});

it('exposes the source url and canonical to the page props', function () {
    makeSourceArticle('https://dev.to/timadey/migrated-piece-abc1');

    $this->get('/writing/migrated-piece')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Writing/Show')
            ->where('canonical', 'https://dev.to/timadey/migrated-piece-abc1')
            ->where('post.source_url', 'https://dev.to/timadey/migrated-piece-abc1'));
});

it('keeps the site canonical for posts without a source', function () {
    $author = User::factory()->create();
    Post::factory()->create([
        'author_id' => $author->id,
        'post_type' => 'article', 'status' => 'published', 'visibility' => 'public',
        'published_at' => now()->subDay(),
        'title' => 'Plain Post', 'slug' => 'plain-post',
    ]);

    $html = $this->get('/writing/plain-post')->assertOk()->getContent();

    expect($html)
        ->toContain('rel="canonical" href="'.url('/writing/plain-post').'"');
});
