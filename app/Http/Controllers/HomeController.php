<?php

namespace App\Http\Controllers;

use App\Models\{CollectedItem, Post, Project};
use App\Support\HomeHero;
use Inertia\{Inertia, Response};

class HomeController extends Controller
{
    public function __invoke(): Response
    {
        $hero = HomeHero::load();

        return Inertia::render('Home', [
            'hero' => $hero->toArray() + [
                'avatar_url' => $hero->avatarUrl(),
                'logo_url' => $hero->logoUrl(),
                'initials' => $hero->initials(),
            ],
            'og_image' => $hero->avatarUrl() !== null
                ? url($hero->avatarUrl())
                : null,
            'featured' => $this->featured(),
            'writings' => $this->writings(),
            'explore' => [
                'projects' => Project::publiclyVisible()->count(),
                'collected' => CollectedItem::publiclyVisible()->count(),
            ],
        ]);
    }

    /** @return array<int, array<string, mixed>> */
    private function featured(): array
    {
        $articles = Post::publiclyVisible()->ofType('article')->where('featured', true)
            ->with('tags')->latest('published_at')->limit(3)->get();
        $projects = Project::publiclyVisible()->where('featured', true)
            ->with('tags')->latest('updated_at')->limit(3)->get();

        if ($articles->isNotEmpty() && $projects->isNotEmpty()) {
            $articles = $articles->take(2);
            $projects = $projects->take(1);
        } else {
            $articles = $articles->take(3);
            $projects = $projects->take(3);
        }

        $items = $articles->map(fn ($p) => [
            'type' => 'writing',
            'title' => $p->title,
            'summary' => $p->excerpt,
            'url' => '/writing/'.$p->slug,
            'date' => $p->published_at?->toIso8601String(),
        ])->concat($projects->map(fn ($p) => [
            'type' => 'project',
            'title' => $p->name,
            'summary' => $p->summary,
            'url' => '/projects/'.$p->slug,
            'date' => $p->updated_at?->toIso8601String(),
        ]));

        return $items->sortByDesc(fn ($i) => strtotime((string) $i['date']))->values()->all();
    }

    /** @return array<int, array<string, mixed>> */
    private function writings(): array
    {
        return Post::publiclyVisible()->ofType('article')->latest('published_at')->limit(5)->get()
            ->map(fn ($p) => [
                'slug' => $p->slug,
                'title' => $p->title,
                'excerpt' => $p->excerpt,
                'reading_time' => $p->reading_time,
                'date' => $p->published_at?->format('M j, Y'),
            ])->all();
    }
}
