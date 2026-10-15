<?php

namespace App\Http\Controllers;

use App\Models\{Post, Project};
use Illuminate\Http\Request;
use Inertia\{Inertia, Response};

class ProjectController extends Controller
{
    private const STATUSES = ['idea', 'exploring', 'building', 'active', 'paused', 'completed'];

    public function index(Request $request): Response
    {
        $query = Project::publiclyVisible()->with('tags')->orderByDesc('featured')->latest('updated_at');

        if ($status = $request->query('status')) {
            $query->where('status', in_array($status, self::STATUSES, true) ? $status : 'idea');
        }

        return Inertia::render('Projects/Index', [
            'projects' => $query->paginate(12)->withQueryString()->through(fn ($p) => [
                'slug' => $p->slug,
                'name' => $p->name,
                'summary' => $p->summary,
                'status' => $p->status,
                'cover_image' => $p->cover_image,
                'featured' => $p->featured,
                'started_at' => $p->started_at?->format('M Y'),
                'tags' => $p->tags->pluck('name'),
            ]),
            'statuses' => self::STATUSES,
            'filters' => $request->only(['status']),
        ]);
    }

    public function show(string $slug): Response
    {
        $project = Project::publiclyVisible()->where('slug', $slug)->with('tags')->firstOrFail();

        $relatedPosts = Post::publiclyVisible()
            ->whereHas('tags', fn ($q) => $q->whereIn('tags.id', $project->tags->pluck('id')))
            ->latest('published_at')->limit(4)->get()
            ->map(fn ($p) => $p->only(['slug', 'title', 'excerpt'])
                + [
                    'url' => '/'.($p->post_type === 'article' ? 'writing' : 'notes').'/'.$p->slug,
                    'date' => $p->published_at?->format('M j, Y'),
                ]);

        return Inertia::render('Projects/Show', [
            'project' => [
                'slug' => $project->slug,
                'name' => $project->name,
                'summary' => $project->summary,
                'description_html' => (string) $project->description,
                'status' => $project->status,
                'repository_url' => $project->repository_url,
                'live_url' => $project->live_url,
                'started_at' => $project->started_at?->format('M Y'),
                'completed_at' => $project->completed_at?->format('M Y'),
                'cover_image' => $project->cover_image,
                'tags' => $project->tags->pluck('name'),
            ],
            'related' => ['posts' => $relatedPosts],
            'canonical' => url('/projects/'.$project->slug),
        ]);
    }
}
