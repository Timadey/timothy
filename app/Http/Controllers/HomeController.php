<?php

namespace App\Http\Controllers;

use App\Models\{NowSection, Post, Project, Setting, SocialLink};
use App\Services\FeedService;
use Inertia\{Inertia, Response};

class HomeController extends Controller
{
    public function __invoke(FeedService $feed): Response
    {
        return Inertia::render('Home', [
            'intro' => Setting::get('home_intro', 'Welcome to my corner of the internet — a place for writing, projects, and things I am thinking about.'),
            'statement' => Setting::get('home_statement', 'Currently exploring how technology, product thinking, and ideas fit together.'),
            'feed' => $feed->recent(),
            'featuredPosts' => Post::publiclyVisible()->ofType('article')->where('featured', true)
                ->with('tags', 'topics')->latest('published_at')->limit(3)->get()
                ->map(fn ($p) => $p->only(['slug', 'title', 'excerpt', 'reading_time'])
                    + ['date' => $p->published_at?->format('M j, Y')]),
            'projects' => Project::publiclyVisible()->where('featured', true)->limit(3)->get()
                ->map(fn ($p) => $p->only(['slug', 'name', 'summary', 'status'])),
            'now' => $this->nowSnapshot(),
            'social_links' => SocialLink::where('visible', true)->orderBy('sort_order')
                ->get(['platform', 'url', 'label']),
        ]);
    }

    private function nowSnapshot(): ?array
    {
        $sections = NowSection::where('visible', true)->orderBy('sort_order')
            ->with(['updates' => fn ($q) => $q->where('visible', true)->latest('occurred_at')->limit(1)])
            ->get()
            ->filter(fn ($s) => $s->body || $s->updates->isNotEmpty())
            ->values();

        if ($sections->isEmpty()) {
            return null;
        }

        return [
            'sections' => $sections->map(fn ($s) => [
                'key' => $s->key,
                'label' => $s->label,
                'body' => $s->body,
                'update' => $s->updates->first()?->text,
            ]),
            'last_updated_at' => $sections->max(fn ($s) => $s->updated_at->toIso8601String()),
        ];
    }
}
