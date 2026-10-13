<?php

namespace App\Http\Controllers;

use App\Models\{Post, Topic};
use App\Services\MarkdownService;
use Illuminate\Http\Request;
use Inertia\{Inertia, Response};

class WritingController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Post::publiclyVisible()->ofType('article')->with(['tags', 'topics'])->latest('published_at');

        if ($q = $request->query('q')) {
            $needle = '%'.mb_strtolower($q).'%';
            $query->where(fn ($w) => $w
                ->whereRaw('LOWER(title) LIKE ?', [$needle])
                ->orWhereRaw('LOWER(COALESCE(excerpt, \'\')) LIKE ?', [$needle]));
        }
        if ($topic = $request->query('topic')) {
            $query->whereHas('topics', fn ($t) => $t->where('slug', $topic));
        }
        if ($tag = $request->query('tag')) {
            $query->whereHas('tags', fn ($t) => $t->where('slug', $tag));
        }

        return Inertia::render('Writing/Index', [
            'posts' => $query->paginate(10)->withQueryString()->through(fn ($p) => [
                'slug' => $p->slug,
                'title' => $p->title,
                'excerpt' => $p->excerpt,
                'reading_time' => $p->reading_time,
                'featured' => $p->featured,
                'date' => $p->published_at?->format('M j, Y'),
                'topics' => $p->topics->pluck('name'),
                'tags' => $p->tags->pluck('name'),
            ]),
            'topics' => Topic::orderBy('name')->get(['name', 'slug']),
            'filters' => $request->only(['q', 'topic', 'tag']),
        ]);
    }

    public function show(Request $request, string $slug, MarkdownService $markdown): Response
    {
        $query = Post::ofType('article')->where('slug', $slug)->with(['tags', 'topics']);

        $canPreview = $request->boolean('preview') && $request->user()?->isOwner();
        $post = ($canPreview ? $query : $query->publiclyVisible())->firstOrFail();

        $isPublic = $post->status === 'published'
            && $post->visibility === 'public'
            && $post->published_at !== null
            && $post->published_at->lte(now());
        $preview = (bool) $canPreview && ! $isPublic;

        $related = Post::publiclyVisible()->ofType('article')
            ->where('id', '!=', $post->id)
            ->whereHas('topics', fn ($t) => $t->whereIn('topics.id', $post->topics->pluck('id')))
            ->with('topics')->limit(3)->get()
            ->map(fn ($p) => $p->only(['slug', 'title', 'excerpt', 'reading_time'])
                + ['date' => $p->published_at?->format('M j, Y')]);

        return Inertia::render('Writing/Show', [
            'preview' => $preview,
            'post' => [
                'slug' => $post->slug,
                'title' => $post->title,
                'excerpt' => $post->excerpt,
                'body_html' => $markdown->render((string) $post->body),
                'reading_time' => $post->reading_time,
                'date' => $post->published_at?->format('F j, Y'),
                'published_iso' => $post->published_at?->toIso8601String(),
                'updated_iso' => $post->updated_at->toIso8601String(),
                'cover_image' => $post->cover_image,
                'meta_title' => $post->meta_title ?: $post->title,
                'meta_description' => $post->meta_description ?: $post->excerpt,
                'tags' => $post->tags->pluck('name'),
                'topics' => $post->topics->pluck('name'),
            ],
            'related' => $related,
            'canonical' => url('/writing/'.$post->slug),
        ]);
    }
}
