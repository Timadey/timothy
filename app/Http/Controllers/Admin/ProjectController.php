<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProjectRequest;
use App\Models\{Project, Tag};
use Illuminate\Http\{RedirectResponse, Request};
use Illuminate\Support\Str;
use Inertia\{Inertia, Response};

class ProjectController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Project::latest()->with('tags');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return Inertia::render('Admin/Projects/Index', [
            'projects' => $query->paginate(15)->withQueryString()->through(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'slug' => $p->slug,
                'status' => $p->status,
                'visibility' => $p->visibility,
                'featured' => $p->featured,
            ]),
            'filters' => $request->only(['status']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Projects/Edit', ['project' => null]);
    }

    public function store(StoreProjectRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $tags = $data['tags'] ?? [];
        unset($data['tags']);
        $data['slug'] = ($data['slug'] ?? '') ?: Project::makeSlug($data['name']);

        $project = Project::create($data);
        $this->syncTags($project, $tags);

        return redirect()->route('admin.projects.edit', $project)->with('status', 'Project created.');
    }

    public function edit(Project $project): Response
    {
        $project->load('tags');

        return Inertia::render('Admin/Projects/Edit', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'slug' => $project->slug,
                'summary' => $project->summary,
                'description' => $project->description,
                'status' => $project->status,
                'visibility' => $project->visibility,
                'cover_image' => $project->cover_image,
                'repository_url' => $project->repository_url,
                'live_url' => $project->live_url,
                'started_at' => $project->started_at?->format('Y-m-d'),
                'completed_at' => $project->completed_at?->format('Y-m-d'),
                'featured' => $project->featured,
                'tags' => $project->tags->pluck('name')->values(),
            ],
        ]);
    }

    public function update(StoreProjectRequest $request, Project $project): RedirectResponse
    {
        $data = $request->validated();
        $tags = $data['tags'] ?? [];
        unset($data['tags']);
        if (empty($data['slug'])) {
            $data['slug'] = Project::makeSlug($data['name']);
        }

        $project->update($data);
        $this->syncTags($project, $tags);

        return redirect()->route('admin.projects.edit', $project)->with('status', 'Project updated.');
    }

    public function destroy(Project $project): RedirectResponse
    {
        $project->delete();

        return redirect()->route('admin.projects.index')->with('status', 'Project deleted.');
    }

    private function syncTags(Project $project, array $tags): void
    {
        $ids = collect($tags)->filter()->unique()->map(fn ($name) =>
            Tag::firstOrCreate(['slug' => Str::slug($name)], ['name' => $name])->id)->all();
        $project->tags()->sync($ids);
    }
}
