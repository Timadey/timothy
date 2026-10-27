<?php

use App\Models\CollectedItem;
use App\Models\Tag;

it('lists drawer categories with counts and plural hrefs', function () {
    CollectedItem::factory()->create(['title' => 'System Design', 'item_type' => 'book', 'visibility' => 'public']);
    CollectedItem::factory()->create(['title' => 'Second Book', 'item_type' => 'book', 'visibility' => 'public']);
    CollectedItem::factory()->create(['title' => 'Hidden Book', 'item_type' => 'book', 'visibility' => 'private']);
    CollectedItem::factory()->create(['title' => 'Hidden Music', 'item_type' => 'music', 'visibility' => 'private']);

    $this->get('/collected')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Collected/Index')
            ->where('categories', fn ($c) => count($c) === 1)
            ->where('categories.0.type', 'book')
            ->where('categories.0.label', 'Books')
            ->where('categories.0.count', 2)
            ->where('categories.0.href', '/collected/books')
            ->where('items', null));
});

it('renders an empty drawer when nothing is public', function () {
    CollectedItem::factory()->create(['visibility' => 'private']);

    $this->get('/collected')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Collected/Index')
            ->where('categories', [])
            ->where('items', null));
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

it('keeps drawer categories alongside search results', function () {
    CollectedItem::factory()->create(['title' => 'Searchable', 'item_type' => 'video', 'visibility' => 'public']);
    CollectedItem::factory()->create(['title' => 'Not Matching', 'item_type' => 'book', 'visibility' => 'public']);

    $this->get('/collected?q=Searchable')->assertInertia(fn ($p) => $p
        ->has('categories', 2)
        ->where('items.data.0.title', 'Searchable')
        ->where('items.total', 1));
});

it('returns ids, tag slugs and resolved cover urls in payloads', function () {
    $item = CollectedItem::factory()->create([
        'title' => 'Covered Book',
        'item_type' => 'book',
        'annotation' => 'why it matters',
        'cover_image' => 'covers/abc.jpg',
        'visibility' => 'public',
    ]);
    $tag = Tag::create(['name' => 'Systems']);
    $item->tags()->attach($tag->id);

    $this->get('/collected?q=Covered')->assertInertia(fn ($p) => $p
        ->has('items.data.0.id')
        ->where('items.data.0.cover_image', '/storage/covers/abc.jpg')
        ->where('items.data.0.tags.0.name', 'Systems')
        ->where('items.data.0.tags.0.slug', 'systems'));
});

it('excludes private items from search results', function () {
    CollectedItem::factory()->create(['title' => 'Private Result', 'visibility' => 'private']);

    $this->get('/collected?q=Private')->assertInertia(fn ($p) => $p->where('items.total', 0));
});

it('filters collected items by prefix full text on annotation', function () {
    CollectedItem::factory()->create([
        'title' => 'Blade Runner', 'annotation' => 'A film about androids and memory.', 'visibility' => 'public',
    ]);
    CollectedItem::factory()->create([
        'title' => 'Bread Book', 'annotation' => 'Sourdough techniques.', 'visibility' => 'public',
    ]);

    $this->get('/collected?q=android')->assertInertia(fn ($p) => $p
        ->component('Collected/Index')
        ->has('items.data', 1)
        ->where('items.data.0.title', 'Blade Runner'));
});
