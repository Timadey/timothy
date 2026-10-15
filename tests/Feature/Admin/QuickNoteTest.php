<?php

use App\Models\{Post, User};

beforeEach(function () {
    $this->owner = User::factory()->create(['role' => 'owner']);
});

it('publishes a note without a title via the quick composer endpoint', function () {
    $this->actingAs($this->owner)->post('/admin/notes', [
        'body' => 'Hello world, this is my very first quick note.',
        'post_type' => 'note',
        'status' => 'published',
        'visibility' => 'public',
        'tags' => [],
    ])->assertRedirect();

    $note = Post::ofType('note')->firstOrFail();

    expect($note->title)->toBeNull()
        ->and($note->slug)->not->toBeEmpty()
        ->and($note->status)->toBe('published')
        ->and($note->published_at)->not->toBeNull()
        ->and($note->author_id)->toBe($this->owner->id);
});

it('derives the slug from the body first line when there is no title', function () {
    $this->actingAs($this->owner)->post('/admin/notes', [
        'body' => "Shipping the quick notes feature today.\nSecond line never makes the slug.",
        'post_type' => 'note',
        'status' => 'draft',
        'visibility' => 'public',
    ])->assertRedirect();

    expect(Post::ofType('note')->firstOrFail()->slug)
        ->toStartWith('shipping-the-quick-notes');
});

it('rejects an article without a title', function () {
    $this->actingAs($this->owner)->post('/admin/posts', [
        'body' => 'no title here',
        'post_type' => 'article',
        'status' => 'draft',
        'visibility' => 'public',
    ])->assertSessionHasErrors('title');
});

it('rejects an empty note body when publishing', function () {
    $this->actingAs($this->owner)->post('/admin/notes', [
        'body' => '',
        'post_type' => 'note',
        'status' => 'published',
        'visibility' => 'public',
    ])->assertSessionHasErrors('body');
});

it('renders the notes list with snippets for the owner', function () {
    $this->actingAs($this->owner)->post('/admin/notes', [
        'body' => 'A listed note nobody titled.',
        'post_type' => 'note',
        'status' => 'published',
        'visibility' => 'public',
    ]);

    $this->actingAs($this->owner)->get('/admin/notes')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Admin/Notes/Index')
            ->where('notes.data.0.title', null)
            ->where('notes.data.0.snippet', 'A listed note nobody titled.'));
});

it('renders the quick composer for a new note', function () {
    $this->actingAs($this->owner)->get('/admin/notes/new')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Admin/Notes/Composer')
            ->where('note', null));
});

it('loads an existing note into the composer for editing', function () {
    $this->actingAs($this->owner)->post('/admin/notes', [
        'body' => 'Draft body for editing.',
        'post_type' => 'note',
        'status' => 'draft',
        'visibility' => 'public',
    ]);
    $note = Post::ofType('note')->firstOrFail();

    $this->actingAs($this->owner)->get("/admin/notes/{$note->id}/edit")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Admin/Notes/Composer')
            ->where('note.id', $note->id)
            ->where('note.title', null)
            ->where('note.body', 'Draft body for editing.'));
});

it('redirects guests away from the notes admin', function () {
    $this->get('/admin/notes')->assertRedirect('/admin/login');
});

it('keeps the derived slug within the 255 column limit for long bodies', function () {
    $body = str_repeat('Quick note from the composer shipping the breeze experience today. ', 8);

    $this->actingAs($this->owner)->post('/admin/notes', [
        'body' => $body,
        'post_type' => 'note',
        'status' => 'published',
        'visibility' => 'public',
    ])->assertRedirect();

    $slug = Post::ofType('note')->firstOrFail()->slug;

    expect(strlen($slug))->toBeLessThanOrEqual(255)
        ->and($slug)->not->toEndWith('-');
});

it('shortens title-less slugs to the first few words of the body', function () {
    $this->actingAs($this->owner)->post('/admin/notes', [
        'body' => 'Why does there seem to be such an intense, adversarial divide between genders today?',
        'post_type' => 'note',
        'status' => 'published',
        'visibility' => 'public',
    ])->assertRedirect();

    expect(Post::ofType('note')->firstOrFail()->slug)
        ->toBe('why-does-there-seem-to-be-such-an');
});

it('caps a single over-long first word so the slug stays short', function () {
    $this->actingAs($this->owner)->post('/admin/notes', [
        'body' => str_repeat('a', 90),
        'post_type' => 'note',
        'status' => 'published',
        'visibility' => 'public',
    ])->assertRedirect();

    expect(strlen(Post::ofType('note')->firstOrFail()->slug))->toBeLessThanOrEqual(40);
});

it('shortens previously saved long title-less note slugs on backfill', function () {
    $author = User::factory()->create(['role' => 'owner']);
    $note = Post::factory()->create([
        'post_type' => 'note', 'status' => 'published', 'visibility' => 'public',
        'published_at' => now(), 'author_id' => $author->id,
        'title' => null, 'slug' => str_repeat('old-long-slug-', 12),
        'body' => 'Shipping the quick notes feature today.',
    ]);

    Post::shortenTitlelessSlugs();

    expect($note->fresh()->slug)->toBe('shipping-the-quick-notes-feature-today');
});

it('leaves titled note slugs alone during the backfill', function () {
    $author = User::factory()->create(['role' => 'owner']);
    $note = Post::factory()->create([
        'post_type' => 'note', 'status' => 'published', 'visibility' => 'public',
        'published_at' => now(), 'author_id' => $author->id,
        'title' => 'Gender Wars', 'slug' => 'gender-wars',
        'body' => 'Whatever.',
    ]);

    Post::shortenTitlelessSlugs();

    expect($note->fresh()->slug)->toBe('gender-wars');
});
