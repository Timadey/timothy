<?php

use App\Models\CollectedItem;
use App\Models\Tag;

it('renders a category page with its label and items', function () {
    CollectedItem::factory()->create(['title' => 'Thinking in Systems', 'item_type' => 'book', 'visibility' => 'public']);

    $this->get('/collected/books')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Collected/Show')
            ->where('type', 'book')
            ->where('label', 'Books')
            ->where('segment', 'books')
            ->where('items.data.0.title', 'Thinking in Systems'));
});

it('renders every known category segment', function () {
    foreach (['books' => 'book', 'articles' => 'article', 'videos' => 'video', 'podcasts' => 'podcast', 'music' => 'music', 'tools' => 'tool', 'quotes' => 'quote', 'websites' => 'website', 'others' => 'other'] as $segment => $type) {
        CollectedItem::factory()->create(['item_type' => $type, 'visibility' => 'public']);
        $this->get("/collected/{$segment}")->assertOk()
            ->assertInertia(fn ($p) => $p->component('Collected/Show')->where('type', $type));
    }
});

it('404s on an unknown category', function () {
    $this->get('/collected/nope')->assertNotFound();
});

it('404s when a category has no public items', function () {
    CollectedItem::factory()->create(['item_type' => 'book', 'visibility' => 'private']);
    CollectedItem::factory()->create(['item_type' => 'music', 'visibility' => 'public']);

    $this->get('/collected/books')->assertNotFound();
    $this->get('/collected/tools')->assertNotFound();
});

it('excludes private items from a category', function () {
    CollectedItem::factory()->create(['title' => 'Public Book', 'item_type' => 'book', 'visibility' => 'public']);
    CollectedItem::factory()->create(['title' => 'Secret Book', 'item_type' => 'book', 'visibility' => 'private']);

    $this->get('/collected/books')->assertOk()
        ->assertInertia(fn ($p) => $p
            ->where('items.total', 1)
            ->where('items.data.0.title', 'Public Book'));
});

it('filters a category by tag and exposes the category tag list', function () {
    $tagged = CollectedItem::factory()->create(['title' => 'Tagged Book', 'item_type' => 'book', 'visibility' => 'public']);
    CollectedItem::factory()->create(['title' => 'Plain Book', 'item_type' => 'book', 'visibility' => 'public']);
    $tag = Tag::create(['name' => 'Systems']);
    $tagged->tags()->attach($tag->id);

    $this->get('/collected/books?tag=systems')->assertOk()
        ->assertInertia(fn ($p) => $p
            ->where('items.total', 1)
            ->where('items.data.0.title', 'Tagged Book')
            ->where('tags.0.label', 'Systems')
            ->where('tags.0.slug', 'systems')
            ->where('filters.tag', 'systems'));
});

it('renders an empty result set when a tag matches nothing', function () {
    CollectedItem::factory()->create(['item_type' => 'book', 'visibility' => 'public']);

    $this->get('/collected/books?tag=missing')->assertOk()
        ->assertInertia(fn ($p) => $p->where('items.total', 0)->where('items.data', []));
});
