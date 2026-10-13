<?php

use App\Models\CollectedItem;

it('lists public collected items', function () {
    CollectedItem::factory()->create(['title' => 'System Design', 'visibility' => 'public', 'item_type' => 'book']);
    CollectedItem::factory()->create(['title' => 'Private Thing', 'visibility' => 'private']);

    $this->get('/collected')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Collected/Index')->where('items.data.0.title', 'System Design'));
});

it('filters by item type', function () {
    CollectedItem::factory()->create(['title' => 'A Podcast', 'item_type' => 'podcast', 'visibility' => 'public']);
    CollectedItem::factory()->create(['title' => 'A Book', 'item_type' => 'book', 'visibility' => 'public']);

    $this->get('/collected?type=podcast')->assertInertia(fn ($p) => $p->where('items.data.0.title', 'A Podcast'));
});

it('searches annotations', function () {
    CollectedItem::factory()->create(['title' => 'Default', 'annotation' => 'Great systems thinking book', 'visibility' => 'public']);
    CollectedItem::factory()->create(['title' => 'Other', 'annotation' => 'unrelated', 'visibility' => 'public']);

    $this->get('/collected?q=systems')->assertInertia(fn ($p) => $p->where('items.data.0.title', 'Default'));
});

it('searches are case insensitive', function () {
    CollectedItem::factory()->create(['title' => 'Refactoring', 'annotation' => 'Essential Patterns', 'visibility' => 'public']);

    $this->get('/collected?q=PATTERNS')->assertInertia(fn ($p) => $p->where('items.data.0.title', 'Refactoring'));
});
