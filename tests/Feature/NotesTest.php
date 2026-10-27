<?php

use App\Models\{Post, User};

it('prefix tsqueries align with english-stemmed tsvectors', function () {
    $rows = [
        ['text' => 'Great systems thinking book', 'query' => 'systems:*', 'expect' => true],
        ['text' => 'Neurotechnology Primer', 'query' => 'neuro:*', 'expect' => true],
        ['text' => 'Essential Patterns', 'query' => 'patterns:*', 'expect' => true],
        ['text' => 'Baking bread', 'query' => 'android:*', 'expect' => false],
    ];

    foreach ($rows as $case) {
        $row = \Illuminate\Support\Facades\DB::selectOne(
            "SELECT to_tsvector('english', '{$case['text']}') @@ to_tsquery('english', '{$case['query']}') AS match"
        );
        expect((bool) $row->match, "{$case['query']} vs {$case['text']}")->toBe($case['expect']);
    }
});

it('filters notes by prefix-matching full text', function () {
    $author = User::factory()->create();
    $base = ['post_type' => 'note', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id];
    Post::factory()->create($base + ['title' => null, 'slug' => 'has-term', 'body' => 'Thinking about distributed systems today.']);
    Post::factory()->create($base + ['title' => null, 'slug' => 'no-term', 'body' => 'Baking bread on a quiet afternoon.']);

    $this->get('/notes?q=distribut')->assertInertia(fn ($p) => $p
        ->component('Notes/Index')
        ->has('notes.data', 1)
        ->where('notes.data.0.slug', 'has-term'));
});

it('returns no notes for a query with no word characters', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'note', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'title' => 'Any Note']);

    $this->get('/notes?q=%21%21')->assertInertia(fn ($p) => $p->component('Notes/Index')->has('notes.data', 0));
});

it('lists published notes only', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'note', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'title' => 'A Note']);
    Post::factory()->create(['post_type' => 'note', 'status' => 'draft', 'author_id' => $author->id, 'title' => 'Hidden']);

    $this->get('/notes')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Notes/Index')->where('notes.data.0.headline', 'A Note'));
});

it('shows single note with markdown', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'note', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'slug' => 'small-thought', 'title' => 'Small Thought', 'body' => '**bold** thought']);

    $this->get('/notes/small-thought')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Notes/Show')->where('note.title', 'Small Thought')
            ->where('note.body_html', fn ($h) => str_contains($h, '<strong>')));
});

it('404s on private note', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'note', 'status' => 'published', 'visibility' => 'private', 'slug' => 'private-note', 'author_id' => $author->id]);

    $this->get('/notes/private-note')->assertNotFound();
});

it('does not list articles on notes', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'article', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'title' => 'An Article']);

    $this->get('/notes')->assertInertia(fn ($p) => $p->has('notes.data', 0));
});

it('filters notes by tag', function () {
    $author = User::factory()->create();
    $note = Post::factory()->create(['post_type' => 'note', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'title' => 'Tagged Note']);
    $tag = \App\Models\Tag::create(['name' => 'Systems', 'slug' => 'systems']);
    $note->tags()->attach($tag);

    $this->get('/notes?tag=systems')->assertInertia(fn ($p) => $p->where('notes.data.0.headline', 'Tagged Note'));
});

it('serves a note body for inline expansion when the note is publicly visible', function () {
    $author = User::factory()->create();
    Post::factory()->create([
        'post_type' => 'note', 'status' => 'published', 'visibility' => 'public',
        'published_at' => now(), 'author_id' => $author->id,
        'slug' => 'bold-note', 'title' => 'Bold Note', 'body' => '**strong** point',
    ]);

    $body = $this->get('/notes/bold-note/body')->assertOk()->json();

    expect($body['body_html'])->toContain('<strong>strong</strong>');
});

it('404s the note body endpoint for drafts, private notes and articles', function () {
    $author = User::factory()->create();
    Post::factory()->create([
        'post_type' => 'note', 'status' => 'draft', 'author_id' => $author->id,
        'slug' => 'draft-note', 'title' => 'Draft', 'body' => 'secret',
    ]);
    Post::factory()->create([
        'post_type' => 'article', 'status' => 'published', 'visibility' => 'public',
        'published_at' => now(), 'author_id' => $author->id,
        'slug' => 'an-article', 'title' => 'Article', 'body' => '<p>hi</p>',
    ]);

    $this->get('/notes/draft-note/body')->assertNotFound();
    $this->get('/notes/an-article/body')->assertNotFound();
});
