<?php

use App\Models\{Post, Setting, SocialLink, User};
use App\Support\CacheKeys;
use Illuminate\Support\Facades\Cache;

it('caches social links and forgets them when a social link changes', function () {
    SocialLink::create(['platform' => 'github', 'url' => 'https://github.com/x', 'label' => 'GitHub', 'visible' => true, 'sort_order' => 1]);

    $this->get('/')->assertOk();
    expect(Cache::has(CacheKeys::SOCIAL_LINKS))->toBeTrue();

    SocialLink::first()->update(['label' => 'GH']);
    expect(Cache::has(CacheKeys::SOCIAL_LINKS))->toBeFalse();
});

it('caches settings reads and flushes on write', function () {
    Setting::set('site_title', 'Timadey');
    expect(Setting::get('site_title'))->toBe('Timadey');
    expect(Cache::has(CacheKeys::setting('site_title')))->toBeTrue();

    Setting::set('site_title', 'Renamed');
    expect(Setting::get('site_title'))->toBe('Renamed');
});

it('flushes content keys when a post is saved', function () {
    Cache::forever(CacheKeys::HOME, ['stale' => true]);
    Cache::forever(CacheKeys::RSS, 'stale');
    Cache::forever(CacheKeys::noteBody('a-note'), '<p>stale</p>');

    $author = User::factory()->create();
    Post::factory()->create([
        'post_type' => 'note', 'status' => 'published', 'visibility' => 'public',
        'published_at' => now(), 'author_id' => $author->id, 'slug' => 'a-note', 'title' => 'A Note',
    ]);

    expect(Cache::has(CacheKeys::HOME))->toBeFalse()
        ->and(Cache::has(CacheKeys::RSS))->toBeFalse()
        ->and(Cache::has(CacheKeys::noteBody('a-note')))->toBeFalse();
});

it('forgets the original slug key when a post slug changes', function () {
    $author = User::factory()->create();
    $note = Post::factory()->create([
        'post_type' => 'note', 'status' => 'published', 'visibility' => 'public',
        'published_at' => now(), 'author_id' => $author->id, 'slug' => 'old-slug', 'title' => 'A Note',
    ]);

    Cache::forever(CacheKeys::noteBody('old-slug'), '<p>x</p>');
    $note->slug = 'new-slug';
    $note->save();

    expect(Cache::has(CacheKeys::noteBody('old-slug')))->toBeFalse();
});
