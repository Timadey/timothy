<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\{CollectedItem, Post, Project};
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'publishedPosts' => Post::publiclyVisible()->ofType('article')->count(),
                'draftPosts' => Post::where('status', 'draft')->count(),
                'publishedNotes' => Post::publiclyVisible()->ofType('note')->count(),
                'projects' => Project::count(),
                'collectedItems' => CollectedItem::count(),
                'recentPosts' => Post::latest()->limit(5)->get(['id', 'title', 'status', 'created_at'])
                    ->map(fn ($p) => [
                        'id' => $p->id,
                        'title' => $p->title,
                        'status' => $p->status,
                        'created_at' => $p->created_at->format('Y-m-d'),
                    ]),
            ],
        ]);
    }
}
