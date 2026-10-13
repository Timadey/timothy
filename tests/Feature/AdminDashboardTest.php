<?php

use App\Models\{Post, User};

it('shows dashboard with real counts for owner', function () {
    $owner = User::factory()->create(['role' => 'owner']);
    $author = User::factory()->create();
    Post::factory()->count(2)->create(['status' => 'published', 'visibility' => 'public', 'author_id' => $author->id]);
    Post::factory()->create(['status' => 'draft', 'author_id' => $author->id]);

    $this->actingAs($owner)->get('/admin')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Admin/Dashboard')
            ->where('stats.publishedPosts', 2)
            ->where('stats.draftPosts', 1));
});

it('does not leak stats to non-owner', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)->get('/admin')->assertForbidden();
});
