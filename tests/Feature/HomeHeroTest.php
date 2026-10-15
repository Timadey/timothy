<?php

use App\Models\{Post, Project, User};
use App\Support\HomeHero;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

it('loads hero defaults when nothing is stored', function () {
    $hero = HomeHero::load();

    expect($hero->headline)->toBe("Hey, I’m Timadey.")
        ->and($hero->role)->toBeNull()
        ->and($hero->avatarPath)->toBeNull();
});

it('round-trips hero fields through json storage', function () {
    HomeHero::save([
        'headline' => 'Hello there',
        'role' => 'Design Engineer',
        'company' => 'Striped',
        'company_url' => 'https://example.com',
        'status' => 'Rebuilding billing',
    ]);

    $hero = HomeHero::load();

    expect($hero->headline)->toBe('Hello there')
        ->and($hero->role)->toBe('Design Engineer')
        ->and($hero->company)->toBe('Striped')
        ->and($hero->companyUrl)->toBe('https://example.com')
        ->and($hero->status)->toBe('Rebuilding billing');
});

it('saves hero fields from the settings endpoint', function () {
    $user = User::factory()->create(['role' => 'owner']);

    $this->actingAs($user)->put('/admin/settings', [
        'settings' => ['site_title' => 'Timadey', 'tagline' => '', 'footer_text' => ''],
        'hero' => ['headline' => 'Hi from test', 'role' => 'Writer'],
    ])->assertRedirect(route('admin.settings.edit'));

    $hero = HomeHero::load();

    expect($hero->headline)->toBe('Hi from test')
        ->and($hero->role)->toBe('Writer');
});

it('stores an uploaded avatar on the public disk', function () {
    Storage::fake('public');
    $user = User::factory()->create(['role' => 'owner']);

    $this->actingAs($user)->put('/admin/settings', [
        'settings' => ['site_title' => 'Timadey', 'tagline' => '', 'footer_text' => ''],
        'hero' => ['headline' => "Hey, I'm Timadey."],
        'hero_avatar' => UploadedFile::fake()->image('avatar.png'),
    ])->assertRedirect();

    $hero = HomeHero::load();

    expect($hero->avatarPath)->toStartWith('hero/')
        ->and(Storage::disk('public')->exists($hero->avatarPath))->toBeTrue()
        ->and($hero->avatarUrl())->toContain('/storage/hero/');
});

it('rejects a non-image hero upload', function () {
    $user = User::factory()->create(['role' => 'owner']);

    $this->actingAs($user)->put('/admin/settings', [
        'settings' => ['site_title' => 'Timadey', 'tagline' => '', 'footer_text' => ''],
        'hero' => ['headline' => "Hey, I'm Timadey."],
        'hero_avatar' => UploadedFile::fake()->create('doc.pdf', 10, 'application/pdf'),
    ])->assertSessionHasErrors('hero_avatar');

    expect(HomeHero::load()->avatarPath)->toBeNull();
});

it('clears an avatar when the clear flag is set', function () {
    Storage::fake('public');
    $user = User::factory()->create(['role' => 'owner']);
    $path = UploadedFile::fake()->image('a.png')->store('hero', 'public');
    HomeHero::save(['headline' => 'X', 'avatar_path' => $path]);

    $this->actingAs($user)->put('/admin/settings', [
        'settings' => ['site_title' => 'Timadey', 'tagline' => '', 'footer_text' => ''],
        'hero' => ['headline' => 'X'],
        'hero_avatar_clear' => true,
    ])->assertRedirect();

    expect(HomeHero::load()->avatarPath)->toBeNull()
        ->and(Storage::disk('public')->exists($path))->toBeFalse();
});

it('caps featured at two articles and one project when both types exist', function () {
    $author = User::factory()->create();
    foreach (range(1, 3) as $i) {
        Post::factory()->create(['post_type' => 'article', 'status' => 'published', 'visibility' => 'public', 'featured' => true, 'published_at' => now()->subDays($i), 'author_id' => $author->id, 'title' => "A{$i}"]);
        Project::factory()->create(['featured' => true, 'visibility' => 'public', 'status' => 'active', 'name' => "P{$i}"]);
    }

    $this->get('/')->assertInertia(fn ($page) => $page
        ->has('featured', 3)
        ->where('featured.0.type', 'project')
        ->where('featured.1.type', 'writing')
        ->where('featured.2.type', 'writing'));
});

it('allows up to three featured articles when no project is featured', function () {
    $author = User::factory()->create();
    foreach (range(1, 3) as $i) {
        Post::factory()->create(['post_type' => 'article', 'status' => 'published', 'visibility' => 'public', 'featured' => true, 'published_at' => now()->subDays($i), 'author_id' => $author->id]);
    }

    $this->get('/')->assertInertia(fn ($page) => $page->has('featured', 3));
});

it('exposes five recent public articles as writings and excludes drafts', function () {
    $author = User::factory()->create();
    foreach (range(1, 6) as $i) {
        Post::factory()->create(['post_type' => 'article', 'status' => 'published', 'visibility' => 'public', 'published_at' => now()->subHours($i), 'author_id' => $author->id, 'title' => "Post {$i}"]);
    }
    Post::factory()->create(['post_type' => 'article', 'status' => 'draft', 'author_id' => $author->id, 'title' => 'Hidden']);

    $this->get('/')->assertInertia(fn ($page) => $page
        ->has('writings', 5)
        ->where('writings.0.title', 'Post 1'));
});

it('exposes explore counts and avatar og_image', function () {
    Storage::fake('public');
    $path = UploadedFile::fake()->image('a.png')->store('hero', 'public');
    HomeHero::save(['headline' => 'Yo', 'avatar_path' => $path]);
    Project::factory()->create(['visibility' => 'public', 'status' => 'active']);

    $this->get('/')->assertInertia(fn ($page) => $page
        ->where('explore.projects', 1)
        ->where('explore.collected', 0)
        ->has('og_image'));
});

it('emits avatar in home person json-ld and og:image', function () {
    Storage::fake('public');
    $path = UploadedFile::fake()->image('a.png')->store('hero', 'public');
    HomeHero::save(['headline' => 'Yo', 'avatar_path' => $path]);

    $html = $this->get('/')->assertOk()->getContent();

    expect($html)->toContain('application/ld+json')
        ->toContain('/storage/'.$path);
});
