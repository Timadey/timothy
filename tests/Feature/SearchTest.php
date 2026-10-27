<?php

use App\Models\{CollectedItem, Post, Project, User};

it('finds published articles', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'article', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'title' => 'Brain Computer Interfaces', 'body' => 'BCIs connect minds to machines']);

    $this->get('/search?q=brain')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Search')->has('results')->where('results.0.title', 'Brain Computer Interfaces'));
});

it('excludes drafts from search', function () {
    $author = User::factory()->create();
    Post::factory()->create(['status' => 'draft', 'title' => 'Draft Brain', 'author_id' => $author->id]);

    $this->get('/search?q=brain')->assertInertia(fn ($p) => $p->where('results', []));
});

it('finds projects and collected items', function () {
    Project::factory()->create(['name' => 'Mind Reader', 'summary' => 'Reading thoughts', 'visibility' => 'public']);
    CollectedItem::factory()->create(['title' => 'Mind Reading 101', 'visibility' => 'public']);

    $this->get('/search?q=mind')->assertInertia(fn ($p) => $p->has('results', 2));
});

it('filters by type', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'article', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'title' => 'Mindful Article']);
    Project::factory()->create(['name' => 'Mind Project', 'visibility' => 'public']);

    $this->get('/search?q=mind&type=project')->assertInertia(fn ($p) => $p->where('results.0.type', 'project')->has('results', 1));
});

it('requires at least two characters', function () {
    $this->get('/search?q=b')->assertInertia(fn ($p) => $p->where('results', []));
});

it('is case insensitive', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'note', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'title' => 'Quantum Notes']);

    $this->get('/search?q=QUANTUM')->assertInertia(fn ($p) => $p->where('results.0.title', 'Quantum Notes'));
});
