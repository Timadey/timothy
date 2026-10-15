<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePostRequest;
use App\Models\{Post, Tag};
use Illuminate\Http\{RedirectResponse, Request};
use Inertia\{Inertia, Response};

class NoteController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Post::ofType('note')->with('tags')->latest('published_at')->latest('id');

        if ($q = $request->query('q')) {
            $needle = '%'.mb_strtolower($q).'%';
            $query->where(fn ($w) => $w
                ->whereRaw('LOWER(COALESCE(title, \'\')) LIKE ?', [$needle])
                ->orWhereRaw('LOWER(body) LIKE ?', [$needle]));
        }

        return Inertia::render('Admin/Notes/Index', [
            'notes' => $query->paginate(20)->withQueryString()->through(fn (Post $p) => [
                'id' => $p->id,
                'title' => $p->title,
                'snippet' => $p->titleOrSnippet(),
                'status' => $p->status,
                'published_at' => $p->published_at?->format('M j, Y'),
                'tags' => $p->tags->pluck('name'),
            ]),
            'filters' => $request->only(['q']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Notes/Composer', ['note' => null]);
    }

    public function store(StorePostRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['author_id'] = $request->user()->id;
        $data['post_type'] = 'note';
        $data['slug'] = ($data['slug'] ?? '') ?: Post::resolveSlug($data['title'] ?? null, $data['body'] ?? null);
        $tags = $data['tags'] ?? [];
        unset($data['tags'], $data['topics']);

        $post = Post::create($data);
        $this->syncTags($post, $tags);

        return redirect('/admin/notes')->with('status', 'Note saved.');
    }

    public function edit(Post $post): Response
    {
        abort_unless($post->post_type === 'note', 404);
        $post->load('tags');

        return Inertia::render('Admin/Notes/Composer', [
            'note' => [
                'id' => $post->id,
                'title' => $post->title,
                'body' => $post->body,
                'status' => $post->status,
                'visibility' => $post->visibility,
                'tags' => $post->tags->pluck('name')->values(),
                'slug' => $post->slug,
            ],
        ]);
    }

    public function update(StorePostRequest $request, Post $post): RedirectResponse
    {
        abort_unless($post->post_type === 'note', 404);

        $data = $request->validated();
        $data['post_type'] = 'note';
        if (empty($data['slug'])) {
            $data['slug'] = Post::resolveSlug($data['title'] ?? null, $data['body'] ?? null);
        }
        $tags = $data['tags'] ?? [];
        unset($data['tags'], $data['topics']);

        $post->update($data);
        $this->syncTags($post, $tags);

        return redirect('/admin/notes')->with('status', 'Note saved.');
    }

    /** @param array<int, string> $tags */
    private function syncTags(Post $post, array $tags): void
    {
        $post->tags()->sync(
            collect($tags)->filter()->unique(fn ($name) => mb_strtolower($name))
                ->map(fn ($name) => Tag::firstOrCreate(
                    ['slug' => \Illuminate\Support\Str::slug($name)],
                    ['name' => $name]
                )->id)->all()
        );
    }
}
