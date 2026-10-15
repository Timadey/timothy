<?php

use App\Models\{Project, User};

it('lists public projects', function () {
    Project::factory()->create(['name' => 'Visible Project', 'visibility' => 'public']);
    Project::factory()->create(['visibility' => 'private', 'name' => 'Hidden']);

    $this->get('/projects')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Projects/Index')->where('projects.data.0.name', 'Visible Project'));
});

it('filters projects by status', function () {
    Project::factory()->create(['name' => 'Building One', 'status' => 'building', 'visibility' => 'public']);
    Project::factory()->create(['name' => 'Idea One', 'status' => 'idea', 'visibility' => 'public']);

    $this->get('/projects?status=building')->assertInertia(fn ($p) => $p->where('projects.data.0.name', 'Building One'));
});

it('shows project detail with stored html description', function () {
    Project::factory()->create(['name' => 'Deep Project', 'slug' => 'deep-project', 'visibility' => 'public', 'description' => '<h3>Goals</h3><p>Ship it</p>']);

    $this->get('/projects/deep-project')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Projects/Show')
            ->where('project.name', 'Deep Project')
            ->where('project.description_html', fn ($h) => str_contains($h, '<h3>Goals</h3>')));
});

it('404s on private project', function () {
    Project::factory()->create(['slug' => 'secret-proj', 'visibility' => 'private']);

    $this->get('/projects/secret-proj')->assertNotFound();
});

it('lists related posts on project detail by shared tag', function () {
    $author = User::factory()->create();
    $project = Project::factory()->create(['slug' => 'tagged-proj', 'visibility' => 'public', 'name' => 'Tagged Proj']);
    $tag = \App\Models\Tag::create(['name' => 'Laravel', 'slug' => 'laravel']);
    $project->tags()->attach($tag);

    $post = \App\Models\Post::factory()->create(['post_type' => 'article', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'title' => 'Laravel Notes']);
    $post->tags()->attach($tag);

    $this->get('/projects/tagged-proj')->assertInertia(fn ($p) => $p->where('related.posts.0.title', 'Laravel Notes'));
});
