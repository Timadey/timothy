<?php

use App\Models\{Post, Project, User};

it('renders home with published content only', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'article', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'title' => 'Visible Article']);
    Post::factory()->create(['status' => 'draft', 'author_id' => $author->id, 'title' => 'Hidden Draft']);

    $this->get('/')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Home')
            ->has('feed')
            ->where('feed.0.title', 'Visible Article'));
});

it('shows featured writing', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'article', 'status' => 'published', 'visibility' => 'public', 'featured' => true, 'published_at' => now(), 'author_id' => $author->id]);

    $this->get('/')->assertInertia(fn ($page) => $page->has('featuredPosts', 1));
});

it('hides private projects from the feed', function () {
    $author = User::factory()->create();
    Project::factory()->create(['name' => 'Secret', 'visibility' => 'private', 'status' => 'active']);
    Post::factory()->create(['post_type' => 'note', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'title' => 'Public Note']);

    $this->get('/')->assertInertia(fn ($page) => $page
        ->has('feed', 1)
        ->where('feed.0.title', 'Public Note'));
});

it('shares social links on home', function () {
    \App\Models\SocialLink::create(['platform' => 'GitHub', 'url' => 'https://github.com/x', 'label' => 'GitHub', 'sort_order' => 1, 'visible' => true]);
    \App\Models\SocialLink::create(['platform' => 'Hidden', 'url' => 'https://example.com', 'sort_order' => 2, 'visible' => false]);

    $this->get('/')->assertInertia(fn ($page) => $page
        ->has('social_links', 1)
        ->where('social_links.0.platform', 'GitHub'));
});
