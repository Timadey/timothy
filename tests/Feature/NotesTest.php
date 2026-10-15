<?php

use App\Models\{Post, User};

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
