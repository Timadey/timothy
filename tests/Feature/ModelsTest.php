<?php

use App\Models\{CollectedItem, Post, Project, Tag, User};

it('scopes published public posts', function () {
    $author = User::factory()->create();
    Post::factory()->create(['status' => 'published', 'visibility' => 'public', 'published_at' => now()->subDay(), 'author_id' => $author->id]);
    Post::factory()->create(['status' => 'draft', 'author_id' => $author->id]);
    Post::factory()->create(['status' => 'published', 'visibility' => 'private', 'author_id' => $author->id]);

    expect(Post::publiclyVisible()->count())->toBe(1);
});

it('generates unique slugs', function () {
    $author = User::factory()->create();
    $a = Post::factory()->create(['title' => 'Hello World', 'slug' => 'hello-world', 'author_id' => $author->id]);
    $b = Post::factory()->create(['title' => 'Hello World', 'author_id' => $author->id]);

    expect($a->slug)->toBe('hello-world')->and($b->slug)->toBe('hello-world-2');
});

it('computes reading time', function () {
    expect(Post::readingTimeFromBody(str_repeat('word ', 440)))->toBe(2);
});

it('hides unpublished projects from public scope', function () {
    Project::factory()->create(['visibility' => 'public', 'status' => 'building']);
    Project::factory()->create(['visibility' => 'private']);

    expect(Project::publiclyVisible()->count())->toBe(1);
});

it('loads tags on posts', function () {
    $author = User::factory()->create();
    $post = Post::factory()->create(['author_id' => $author->id]);
    $post->tags()->attach(Tag::firstOrCreate(['slug' => 'tech'], ['name' => 'Tech']));

    expect($post->fresh()->tags)->toHaveCount(1);
});

it('requires published_at for public visibility scope', function () {
    $author = User::factory()->create();
    $post = Post::factory()->create(['status' => 'draft', 'published_at' => null, 'author_id' => $author->id]);
    \Illuminate\Support\Facades\DB::table('posts')->where('id', $post->id)
        ->update(['status' => 'published', 'published_at' => null]);

    expect(Post::published()->count())->toBe(0);
});

it('hides private collected items', function () {
    CollectedItem::factory()->create(['visibility' => 'public']);
    CollectedItem::factory()->create(['visibility' => 'private']);

    expect(CollectedItem::publiclyVisible()->count())->toBe(1);
});

it('sets published_at automatically on first publish', function () {
    $author = User::factory()->create();
    $post = Post::factory()->create(['status' => 'draft', 'published_at' => null, 'author_id' => $author->id]);
    $post->update(['status' => 'published']);

    expect($post->fresh()->published_at)->not->toBeNull();
});
