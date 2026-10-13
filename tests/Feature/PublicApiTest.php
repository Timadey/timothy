<?php

use App\Models\{CollectedItem, Post, Project, User};

it('returns published posts as json', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'article', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'title' => 'API Post']);
    Post::factory()->create(['status' => 'draft', 'author_id' => $author->id]);

    $this->getJson('/api/posts')->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'API Post');
});

it('returns single post with body html', function () {
    $author = User::factory()->create();
    Post::factory()->create(['title' => 'API One', 'slug' => 'api-one', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'body' => '**hi**']);

    $this->getJson('/api/posts/api-one')->assertOk()
        ->assertJsonPath('data.title', 'API One')
        ->assertJsonStructure(['data' => ['title', 'body_html', 'url']]);
});

it('404s on draft via api', function () {
    $author = User::factory()->create();
    Post::factory()->create(['slug' => 'draft-api', 'status' => 'draft', 'author_id' => $author->id]);
    $this->getJson('/api/posts/draft-api')->assertNotFound();
});

it('returns notes separately from articles', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'note', 'title' => 'API Note', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id]);
    Post::factory()->create(['post_type' => 'article', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id]);

    $this->getJson('/api/notes')->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'API Note');
});

it('returns projects and collected', function () {
    Project::factory()->create(['name' => 'API Project', 'visibility' => 'public']);
    CollectedItem::factory()->create(['title' => 'API Item', 'visibility' => 'public']);

    $this->getJson('/api/projects')->assertOk()->assertJsonPath('data.0.name', 'API Project');
    $this->getJson('/api/collected')->assertOk()->assertJsonPath('data.0.title', 'API Item');
});

it('returns single project by slug', function () {
    Project::factory()->create(['name' => 'API Single', 'visibility' => 'public']);

    $this->getJson('/api/projects/api-single')->assertOk()
        ->assertJsonPath('data.name', 'API Single')
        ->assertJsonStructure(['data' => ['name', 'description_html', 'url']]);
});

it('searches via api', function () {
    $author = User::factory()->create();
    Post::factory()->create(['title' => 'Quantum Notes', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id]);
    $this->getJson('/api/search?q=quantum')->assertOk()->assertJsonCount(1, 'data');
});

it('requires q on search endpoint', function () {
    $this->getJson('/api/search')->assertStatus(400);
});

it('404s on missing project slug', function () {
    $this->getJson('/api/projects/no-such-project')->assertNotFound();
});
