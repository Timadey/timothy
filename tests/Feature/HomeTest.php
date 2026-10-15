<?php

use App\Models\{Post, Project, SocialLink, User};

it('renders home with recent published writings only', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'article', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'title' => 'Visible Article']);
    Post::factory()->create(['status' => 'draft', 'author_id' => $author->id, 'title' => 'Hidden Draft']);
    Post::factory()->create(['post_type' => 'note', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'title' => 'A Note']);

    $this->get('/')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Home')
            ->has('writings', 1)
            ->where('writings.0.title', 'Visible Article')
            ->missing('feed')
            ->missing('thoughts')
            ->missing('now'));
});

it('shows featured writing', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'article', 'status' => 'published', 'visibility' => 'public', 'featured' => true, 'published_at' => now(), 'author_id' => $author->id]);

    $this->get('/')->assertInertia(fn ($page) => $page->has('featured', 1));
});

it('counts only public projects in explore', function () {
    Project::factory()->create(['name' => 'Secret', 'visibility' => 'private', 'status' => 'active']);
    Project::factory()->create(['name' => 'Public One', 'visibility' => 'public', 'status' => 'active']);

    $this->get('/')->assertInertia(fn ($page) => $page
        ->where('explore.projects', 1));
});

it('shares visible social links on every page', function () {
    SocialLink::create(['platform' => 'GitHub', 'url' => 'https://github.com/x', 'label' => 'GitHub', 'sort_order' => 1, 'visible' => true]);
    SocialLink::create(['platform' => 'Hidden', 'url' => 'https://example.com', 'sort_order' => 2, 'visible' => false]);

    $this->get('/')->assertInertia(fn ($page) => $page
        ->has('social_links', 1)
        ->where('social_links.0.platform', 'GitHub'));
});
