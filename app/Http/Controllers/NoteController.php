<?php

namespace App\Http\Controllers;

use App\Models\{Post, Tag};
use App\Services\MarkdownService;
use App\Support\CacheKeys;
use App\Support\Fts;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\{Inertia, Response};

class NoteController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Post::publiclyVisible()->ofType('note')->with('tags')->latest('published_at');

        if ($q = $request->query('q')) {
            Fts::apply($query, (string) $q);
        }
        if ($tag = $request->query('tag')) {
            $query->whereHas('tags', fn ($t) => $t->where('slug', $tag));
        }

        return Inertia::render('Notes/Index', [
            'notes' => $query->paginate(15)->withQueryString()->through(fn ($p) => [
                'slug' => $p->slug,
                'headline' => $p->streamHeadline(),
                'teaser' => $p->streamTeaser(),
                'date' => $p->published_at?->format('M j, Y'),
                'tags' => $p->tags->pluck('name'),
            ]),
            'tags' => Cache::remember(
                CacheKeys::NOTE_TAGS,
                now()->addMinutes(5),
                fn () => Tag::whereHas('posts', fn ($q2) => $q2->where('post_type', 'note'))
                    ->orderBy('name')->get(['name', 'slug'])
            ),
            'filters' => $request->only(['q', 'tag']),
        ]);
    }

    public function body(string $slug, MarkdownService $markdown): JsonResponse
    {
        $note = Post::publiclyVisible()->ofType('note')->where('slug', $slug)->firstOrFail();

        return response()->json([
            'body_html' => Cache::remember(
                CacheKeys::noteBody($slug),
                now()->addHour(),
                fn () => $markdown->render((string) $note->body)
            ),
        ]);
    }

    public function show(Request $request, string $slug, MarkdownService $markdown): Response
    {
        $query = Post::ofType('note')->where('slug', $slug)->with('tags');

        $canPreview = $request->boolean('preview') && $request->user()?->isOwner();
        $note = ($canPreview ? $query : $query->publiclyVisible())->firstOrFail();

        $isPublic = $note->status === 'published'
            && $note->visibility === 'public'
            && $note->published_at !== null
            && $note->published_at->lte(now());
        $preview = (bool) $canPreview && ! $isPublic;

        return Inertia::render('Notes/Show', [
            'preview' => $preview,
            'note' => [
                'slug' => $note->slug,
                'title' => $note->title,
                'headline' => $note->streamHeadline(),
                'excerpt' => $note->excerpt,
                'body_html' => $markdown->render((string) $note->body),
                'date' => $note->published_at?->format('F j, Y'),
                'published_iso' => $note->published_at?->toIso8601String(),
                'reading_time' => $note->reading_time,
                'tags' => $note->tags->pluck('name'),
            ],
            'canonical' => url('/notes/'.$note->slug),
        ]);
    }
}
