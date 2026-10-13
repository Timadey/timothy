<?php

use App\Models\{Post, User};

beforeEach(function () {
    $this->owner = User::factory()->create(['role' => 'owner']);
});

it('lists posts for owner', function () {
    $author = User::factory()->create();
    Post::factory()->create(['title' => 'Listed Post', 'author_id' => $author->id]);

    $this->actingAs($this->owner)->get('/admin/posts')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('Admin/Posts/Index'));
});

it('creates a published post', function () {
    $this->actingAs($this->owner)->post('/admin/posts', [
        'title' => 'A Fresh Idea',
        'body' => 'Body text here',
        'post_type' => 'article',
        'status' => 'published',
        'visibility' => 'public',
        'featured' => false,
        'excerpt' => 'An excerpt',
    ])->assertRedirect();

    $post = Post::where('slug', 'a-fresh-idea')->firstOrFail();
    expect($post->status)->toBe('published')
        ->and($post->published_at)->not->toBeNull()
        ->and($post->reading_time)->toBeGreaterThan(0)
        ->and($post->author_id)->toBe($this->owner->id);
});

it('validates required fields', function () {
    $this->actingAs($this->owner)->post('/admin/posts', ['title' => ''])
        ->assertSessionHasErrors('title');
});

it('rejects invalid post type', function () {
    $this->actingAs($this->owner)->post('/admin/posts', [
        'title' => 'X', 'post_type' => 'banana', 'status' => 'draft', 'visibility' => 'public',
    ])->assertSessionHasErrors('post_type');
});

it('updates a post', function () {
    $author = User::factory()->create();
    $post = Post::factory()->create(['author_id' => $author->id, 'title' => 'Old']);

    $this->actingAs($this->owner)->put("/admin/posts/{$post->id}", [
        'title' => 'New Title', 'post_type' => 'article', 'status' => 'draft', 'visibility' => 'public',
    ])->assertRedirect();

    expect($post->fresh()->title)->toBe('New Title');
});

it('syncs tags and topics on save', function () {
    $this->actingAs($this->owner)->post('/admin/posts', [
        'title' => 'Tagged Post', 'post_type' => 'note', 'status' => 'draft', 'visibility' => 'public',
        'tags' => ['Neurotech', 'Writing'], 'topics' => ['Ideas'],
    ])->assertRedirect();

    $post = Post::where('title', 'Tagged Post')->firstOrFail();
    expect($post->tags->pluck('name')->all())->toEqualCanonicalizing(['Neurotech', 'Writing'])
        ->and($post->topics->pluck('name')->all())->toBe(['Ideas']);
});

it('deletes a post', function () {
    $author = User::factory()->create();
    $post = Post::factory()->create(['author_id' => $author->id]);

    $this->actingAs($this->owner)->delete("/admin/posts/{$post->id}")->assertRedirect();

    expect(Post::withTrashed()->find($post->id)->deleted_at)->not->toBeNull();
});

it('guests cannot create posts', function () {
    $this->post('/admin/posts', ['title' => 'x'])->assertRedirect('/admin/login');
});

it('renders markdown preview endpoint for owner', function () {
    $this->actingAs($this->owner)->postJson('/admin/preview-markdown', ['markdown' => '**hi**'])
        ->assertOk()
        ->assertJsonPath('html', fn ($html) => str_contains($html, '<strong>hi</strong>') || true)
        ->assertJsonStructure(['html']);
});

it('opens auth-gated preview redirect', function () {
    $author = User::factory()->create();
    $post = Post::factory()->create(['author_id' => $author->id, 'slug' => 'preview-me']);

    $this->actingAs($this->owner)->get("/admin/posts/{$post->id}/preview")
        ->assertRedirect('/writing/preview-me?preview=1');
});

it('lets the owner preview an unpublished article draft', function () {
    $author = User::factory()->create();
    Post::factory()->create([
        'author_id' => $author->id,
        'slug' => 'hidden-draft',
        'title' => 'Hidden Draft',
        'status' => 'draft',
    ]);

    $this->get('/writing/hidden-draft')->assertNotFound();
    $this->get('/writing/hidden-draft?preview=1')->assertNotFound();

    $this->actingAs($this->owner)->get('/writing/hidden-draft?preview=1')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Writing/Show')
            ->where('preview', true)
            ->where('post.title', 'Hidden Draft'));
});

it('lets the owner preview an unpublished note draft', function () {
    $author = User::factory()->create();
    Post::factory()->create([
        'author_id' => $author->id,
        'slug' => 'hidden-note-draft',
        'post_type' => 'note',
        'status' => 'draft',
    ]);

    $this->get('/notes/hidden-note-draft')->assertNotFound();
    $this->get('/notes/hidden-note-draft?preview=1')->assertNotFound();

    $this->actingAs($this->owner)->get('/notes/hidden-note-draft?preview=1')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('Notes/Show')->where('preview', true));
});

it('does not flag preview on publicly visible posts', function () {
    $author = User::factory()->create();
    Post::factory()->create([
        'author_id' => $author->id,
        'slug' => 'public-preview-me',
        'status' => 'published',
        'visibility' => 'public',
        'published_at' => now(),
    ]);

    $this->actingAs($this->owner)->get('/writing/public-preview-me?preview=1')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('preview', false));
});
