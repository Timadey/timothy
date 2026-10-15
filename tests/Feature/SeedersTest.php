<?php

use App\Models\{CollectedItem, Post, Project};

it('seeds demo content flagged as demo', function () {
    $this->seed(\Database\Seeders\DemoContentSeeder::class);

    expect(Post::where('is_demo', true)->count())->toBeGreaterThanOrEqual(10)
        ->and(Project::where('is_demo', true)->count())->toBe(5)
        ->and(CollectedItem::where('is_demo', true)->count())->toBe(10)
        ->and(Post::where('is_demo', false)->count())->toBe(0);
});

it('seeds default now sections and no about content', function () {
    $this->seed(\Database\Seeders\DemoContentSeeder::class);

    expect(\App\Models\NowSection::count())->toBeGreaterThanOrEqual(8)
        ->and(\Schema::hasTable('about_sections'))->toBeFalse();
});

it('is idempotent when seeded twice', function () {
    $this->seed(\Database\Seeders\DemoContentSeeder::class);
    $posts = Post::count();
    $projects = Project::count();
    $items = CollectedItem::count();

    $this->seed(\Database\Seeders\DemoContentSeeder::class);

    expect(Post::count())->toBe($posts)
        ->and(Project::count())->toBe($projects)
        ->and(CollectedItem::count())->toBe($items);
});
