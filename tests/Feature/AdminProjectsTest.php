<?php

use App\Models\{Project, User};

beforeEach(fn () => $this->owner = User::factory()->create(['role' => 'owner']));

it('creates a project', function () {
    $this->actingAs($this->owner)->post('/admin/projects', [
        'name' => 'Neural Notes',
        'summary' => 'A tool',
        'status' => 'building',
        'visibility' => 'public',
        'repository_url' => 'https://github.com/x/y',
    ])->assertRedirect();

    expect(Project::where('slug', 'neural-notes')->exists())->toBeTrue();
});

it('validates project status', function () {
    $this->actingAs($this->owner)->post('/admin/projects', ['name' => 'X', 'status' => 'nope'])
        ->assertSessionHasErrors('status');
});

it('validates repository url', function () {
    $this->actingAs($this->owner)->post('/admin/projects', [
        'name' => 'X', 'status' => 'idea', 'visibility' => 'public', 'repository_url' => 'not-a-url',
    ])->assertSessionHasErrors('repository_url');
});

it('updates and deletes projects', function () {
    $p = Project::factory()->create();

    $this->actingAs($this->owner)->put("/admin/projects/{$p->id}", [
        'name' => 'Renamed', 'status' => 'active', 'visibility' => 'public',
    ])->assertRedirect();
    expect($p->fresh()->name)->toBe('Renamed');

    $this->actingAs($this->owner)->delete("/admin/projects/{$p->id}")->assertRedirect();
    expect(Project::withTrashed()->find($p->id)->deleted_at)->not->toBeNull();
});

it('lists projects for owner', function () {
    $this->actingAs($this->owner)->get('/admin/projects')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Admin/Projects/Index'));
});

it('shows project edit form', function () {
    $p = Project::factory()->create();

    $this->actingAs($this->owner)->get("/admin/projects/{$p->id}/edit")->assertOk()
        ->assertInertia(fn ($page) => $page->component('Admin/Projects/Edit')->where('project.id', $p->id));
});
