<?php

use App\Models\{CollectedItem, Post, Project, Tag, Topic, User};

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

it('filters posts by tag slug', function () {
    $author = User::factory()->create();
    $tagged = Post::factory()->create(['status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'title' => 'Tagged Post']);
    Post::factory()->create(['status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'title' => 'Untagged Post']);
    $tag = Tag::create(['name' => 'Laravel', 'slug' => 'laravel']);
    $tagged->tags()->attach($tag);

    $this->getJson('/api/posts?tag=laravel')->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'Tagged Post');
});

it('filters posts by topic slug', function () {
    $author = User::factory()->create();
    $topiced = Post::factory()->create(['status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'title' => 'Topic Post']);
    Post::factory()->create(['status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'title' => 'Other Post']);
    $topic = Topic::create(['name' => 'AI', 'slug' => 'ai']);
    $topiced->topics()->attach($topic);

    $this->getJson('/api/posts?topic=ai')->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'Topic Post');
});

it('respects per_page within bounds', function () {
    $author = User::factory()->create();
    Post::factory()->count(6)->create(['status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id]);

    $this->getJson('/api/posts?per_page=5')->assertOk()
        ->assertJsonCount(5, 'data')
        ->assertJsonPath('meta.per_page', 5);
});

it('rejects out of range per_page', function () {
    $this->getJson('/api/posts?per_page=100')->assertStatus(400);
    $this->getJson('/api/posts?per_page=2')->assertStatus(400);
    $this->getJson('/api/posts?per_page=abc')->assertStatus(400);
});

it('accepts status=published as a no-op confirm', function () {
    $author = User::factory()->create();
    Post::factory()->create(['status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'title' => 'Confirmed Public']);

    $this->getJson('/api/posts?status=published')->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'Confirmed Public');
});

it('rejects non-published status values on the public api', function () {
    $author = User::factory()->create();
    Post::factory()->create(['status' => 'draft', 'author_id' => $author->id]);

    $this->getJson('/api/posts?status=private')->assertStatus(400);
    $this->getJson('/api/posts?status=draft')->assertStatus(400);
});

it('rate limits api requests after 60 per minute', function () {
    foreach (range(1, 60) as $i) {
        $this->getJson('/api/posts')->assertOk();
    }

    $this->getJson('/api/posts')->assertStatus(429);
});

it('soft-deletes collected items and hides them from public surfaces', function () {
    $owner = User::factory()->create(['role' => 'owner']);
    $item = CollectedItem::factory()->create(['title' => 'Doomed Item', 'visibility' => 'public']);

    $this->actingAs($owner)->delete("/admin/collected/{$item->id}")->assertRedirect();

    expect(CollectedItem::withTrashed()->find($item->id)->deleted_at)->not->toBeNull();
    $this->getJson('/api/collected')->assertOk()->assertJsonCount(0, 'data');
    $this->get('/collected')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Collected/Index')->where('items.total', 0));
});
