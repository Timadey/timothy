<?php

use App\Models\{Post, Project, User};

it('serves rss with only public published posts', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'article', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'title' => 'RSS Visible']);
    Post::factory()->create(['status' => 'draft', 'author_id' => $author->id, 'title' => 'RSS Hidden']);

    $response = $this->get('/rss.xml');
    $response->assertOk();
    expect($response->getContent())->toContain('RSS Visible')->not->toContain('RSS Hidden');
});

it('serves sitemap with published content and static pages', function () {
    $author = User::factory()->create();
    Post::factory()->create(['post_type' => 'article', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'author_id' => $author->id, 'slug' => 'in-sitemap']);
    Post::factory()->create(['status' => 'draft', 'slug' => 'not-in-sitemap', 'author_id' => $author->id]);

    $xml = $this->get('/sitemap.xml')->assertOk()->getContent();
    expect($xml)->toContain('/writing/in-sitemap')->not->toContain('not-in-sitemap')
        ->toContain('/writing')->toContain('/projects');
});

it('serves robots.txt disallowing admin', function () {
    $this->get('/robots.txt')->assertOk()
        ->assertSee('Disallow: /admin', false)
        ->assertSee('Sitemap:', false);
});

it('renders editorial 404 page', function () {
    $this->get('/writing/does-not-exist')->assertNotFound()->assertSee('This page doesn');
});

it('renders 404 for unknown routes', function () {
    $this->get('/definitely-not-a-page')->assertNotFound();
});

it('renders inertia error component for client-side 404s', function () {
    $version = $this->get('/')->assertOk()->inertiaPage()['version'];

    $response = $this->get('/writing/does-not-exist', [
        'X-Inertia' => 'true',
        'X-Inertia-Version' => $version,
    ]);

    $response->assertNotFound()->assertHeader('X-Inertia', 'true');
    expect($response->json('component'))->toBe('errors/404');
});

it('renders inertia error component for client-side 403s', function () {
    $editor = User::factory()->create();
    $version = $this->get('/')->assertOk()->inertiaPage()['version'];

    $response = $this->actingAs($editor)->get('/admin', [
        'X-Inertia' => 'true',
        'X-Inertia-Version' => $version,
    ]);

    $response->assertForbidden()->assertHeader('X-Inertia', 'true');
    expect($response->json('component'))->toBe('errors/403');
});

it('excludes private projects from sitemap', function () {
    Project::factory()->create(['slug' => 'private-proj', 'visibility' => 'private']);
    Project::factory()->create(['slug' => 'public-proj', 'visibility' => 'public']);

    $xml = $this->get('/sitemap.xml')->assertOk()->getContent();
    expect($xml)->toContain('/projects/public-proj')->not->toContain('private-proj');
});
