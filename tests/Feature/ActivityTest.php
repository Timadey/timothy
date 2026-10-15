<?php

use App\Models\{Post, Project, User};

it('renders the activity page with public feed items newest first', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'article', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'title' => 'Fresh Article']);
    Project::factory()->create(['name' => 'Shipped Thing', 'visibility' => 'public', 'status' => 'active']);

    $this->get('/activity')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Activity/Index')
            ->has('feed')
            ->where('feed.0.title', 'Fresh Article'));
});

it('excludes drafts and private items from activity', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'article', 'status' => 'draft', 'author_id' => $author->id, 'title' => 'Hidden Draft']);
    Project::factory()->create(['name' => 'Secret', 'visibility' => 'private', 'status' => 'active']);

    $this->get('/activity')->assertInertia(fn ($page) => $page->has('feed', 0));
});
