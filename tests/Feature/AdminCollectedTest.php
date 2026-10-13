<?php

use App\Models\{CollectedItem, User};

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
