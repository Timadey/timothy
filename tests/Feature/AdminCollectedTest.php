<?php

use App\Models\{CollectedItem, User};
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(fn () => $this->owner = User::factory()->create(['role' => 'owner']));

it('creates a collected item', function () {
    $this->actingAs($this->owner)->post('/admin/collected', [
        'title' => 'Thinking in Systems',
        'item_type' => 'book',
        'creator' => 'Donella Meadows',
        'url' => 'https://example.com/book',
        'annotation' => 'Why it matters',
        'visibility' => 'public',
    ])->assertRedirect();

    expect(CollectedItem::where('title', 'Thinking in Systems')->exists())->toBeTrue();
});

it('validates item type', function () {
    $this->actingAs($this->owner)->post('/admin/collected', ['title' => 'X', 'item_type' => 'bogus'])
        ->assertSessionHasErrors('item_type');
});

it('validates url when present', function () {
    $this->actingAs($this->owner)->post('/admin/collected', [
        'title' => 'X', 'item_type' => 'book', 'url' => 'nope', 'visibility' => 'public',
    ])->assertSessionHasErrors('url');
});

it('updates a collected item', function () {
    $item = CollectedItem::factory()->create();

    $this->actingAs($this->owner)->put("/admin/collected/{$item->id}", [
        'title' => 'Updated Title', 'item_type' => 'article', 'visibility' => 'public',
    ])->assertRedirect();

    expect($item->fresh()->title)->toBe('Updated Title');
});

it('deletes a collected item', function () {
    $item = CollectedItem::factory()->create();

    $this->actingAs($this->owner)->delete("/admin/collected/{$item->id}")->assertRedirect();

    expect(CollectedItem::find($item->id))->toBeNull();
});

it('lists collected items for owner', function () {
    $this->actingAs($this->owner)->get('/admin/collected')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Admin/Collected/Index'));
});

it('stores a cover image upload', function () {
    Storage::fake('public');
    $file = UploadedFile::fake()->image('cover.jpg', 400, 600);

    $this->actingAs($this->owner)->post('/admin/collected', [
        'title' => 'Covered Book', 'item_type' => 'book', 'visibility' => 'public',
        'cover_image_file' => $file,
    ])->assertRedirect();

    $item = CollectedItem::where('title', 'Covered Book')->firstOrFail();

    expect($item->cover_image)->toStartWith('covers/')
        ->and(Storage::disk('public')->exists($item->cover_image))->toBeTrue()
        ->and($item->coverUrl())->toStartWith('/storage/covers/');
});

it('stores a pasted cover url', function () {
    $this->actingAs($this->owner)->post('/admin/collected', [
        'title' => 'Linked Cover', 'item_type' => 'music', 'visibility' => 'public',
        'cover_image' => 'https://cdn.example.com/cover.jpg',
    ])->assertRedirect();

    expect(CollectedItem::where('title', 'Linked Cover')->firstOrFail()->cover_image)
        ->toBe('https://cdn.example.com/cover.jpg');
});

it('removes a stored cover when cleared', function () {
    Storage::fake('public');
    $path = UploadedFile::fake()->image('a.jpg')->store('covers', 'public');
    $item = CollectedItem::factory()->create(['cover_image' => $path]);

    $this->actingAs($this->owner)->put("/admin/collected/{$item->id}", [
        'title' => $item->title, 'item_type' => 'book', 'visibility' => 'public',
        'cover_image' => $path, 'cover_image_clear' => true,
    ])->assertRedirect();

    expect($item->fresh()->cover_image)->toBeNull()
        ->and(Storage::disk('public')->exists($path))->toBeFalse();
});

it('rejects a non-image cover upload', function () {
    $this->actingAs($this->owner)->post('/admin/collected', [
        'title' => 'Bad Cover', 'item_type' => 'book', 'visibility' => 'public',
        'cover_image_file' => UploadedFile::fake()->create('notes.txt', 10),
    ])->assertSessionHasErrors('cover_image_file');
});

it('resolves stored cover paths to storage urls for the api', function () {
    CollectedItem::factory()->create(['title' => 'API Covered', 'visibility' => 'public', 'cover_image' => 'covers/x.jpg']);

    $this->getJson('/api/collected?q=API')
        ->assertOk()
        ->assertJsonPath('data.0.cover_image', '/storage/covers/x.jpg');
});
