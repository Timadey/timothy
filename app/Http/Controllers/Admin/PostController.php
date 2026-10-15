<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePostRequest;
use App\Models\{Post, Tag, Topic};
use Illuminate\Http\{RedirectResponse, Request};
use Inertia\{Inertia, Response};

class PostController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Post::latest()->with(['tags', 'topics']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($type = $request->query('type')) {
            $query->where('post_type', $type);
        }
        if ($search = $request->query('q')) {
            $needle = '%'.mb_strtolower($search).'%';
            $query->where(fn ($q) => $q
                ->whereRaw('LOWER(title) LIKE ?', [$needle])
                ->orWhereRaw('LOWER(COALESCE(excerpt, \'\')) LIKE ?', [$needle]));
        }

        return Inertia::render('Admin/Posts/Index', [
            'posts' => $query->paginate(15)->withQueryString()->through(fn ($p) => [
                'id' => $p->id,
                'title' => $p->title,
                'slug' => $p->slug,
                'post_type' => $p->post_type,
                'status' => $p->status,
                'visibility' => $p->visibility,
                'featured' => $p->featured,
                'published_at' => $p->published_at?->format('Y-m-d'),
            ]),
            'filters' => $request->only(['status', 'type', 'q']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Posts/Edit', ['post' => null]);
    }

    public function store(StorePostRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['author_id'] = $request->user()->id;
        $data['slug'] = ($data['slug'] ?? '') ?: Post::makeSlug($data['title']);
        $tags = $data['tags'] ?? [];
        $topics = $data['topics'] ?? [];
        unset($data['tags'], $data['topics']);

        $post = Post::create($data);
        $this->syncRelations($post, $tags, $topics);

        return redirect()->route('admin.posts.edit', $post)->with('status', 'Post created.');
    }

    public function edit(Post $post): Response
    {
        $post->load(['tags', 'topics']);

        return Inertia::render('Admin/Posts/Edit', [
            'post' => [
                'id' => $post->id,
                'title' => $post->title,
                'slug' => $post->slug,
                'excerpt' => $post->excerpt,
                'body' => $post->body,
                'post_type' => $post->post_type,
                'status' => $post->status,
                'visibility' => $post->visibility,
                'featured' => $post->featured,
                'cover_image' => $post->cover_image,
                'meta_title' => $post->meta_title,
                'meta_description' => $post->meta_description,
                'reading_time' => $post->reading_time,
                'published_at' => $post->published_at?->format('Y-m-d H:i'),
                'tags' => $post->tags->pluck('name')->values(),
                'topics' => $post->topics->pluck('name')->values(),
            ],
        ]);
    }

    public function update(StorePostRequest $request, Post $post): RedirectResponse
    {
        $data = $request->validated();
        $tags = $data['tags'] ?? [];
        $topics = $data['topics'] ?? [];
        unset($data['tags'], $data['topics']);
        if (empty($data['slug'])) {
            $data['slug'] = Post::resolveSlug($data['title'] ?? null, $data['body'] ?? null);
        }

        $post->update($data);
        $this->syncRelations($post, $tags, $topics);

        return redirect()->route('admin.posts.edit', $post)->with('status', 'Post updated.');
    }

    public function destroy(Post $post): RedirectResponse
    {
        $post->delete();

        return redirect()->route('admin.posts.index')->with('status', 'Post deleted.');
    }

    public function preview(Post $post): RedirectResponse
    {
        $path = $post->post_type === 'article' ? 'writing' : 'notes';

        return redirect("/{$path}/{$post->slug}?preview=1");
    }

    private function syncRelations(Post $post, array $tags, array $topics): void
    {
        $tagIds = collect($tags)->filter()->unique()->map(fn ($name) =>
            Tag::firstOrCreate(['slug' => \Illuminate\Support\Str::slug($name)], ['name' => $name])->id)->all();
        $topicIds = collect($topics)->filter()->unique()->map(fn ($name) =>
            Topic::firstOrCreate(['slug' => \Illuminate\Support\Str::slug($name)], ['name' => $name])->id)->all();

        $post->tags()->sync($tagIds);
        $post->topics()->sync($topicIds);
    }
}
