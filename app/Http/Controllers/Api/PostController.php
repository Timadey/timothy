<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PostResource;
use App\Models\Post;
use Illuminate\Http\Request;

class PostController extends Controller
{
    public function index(Request $request)
    {
        $type = in_array($request->query('type'), ['article', 'note'], true) ? $request->query('type') : 'article';

        // The public API is always scoped to published, public posts via
        // publiclyVisible(); `status` is accepted only as a no-op confirm of
        // `published` so a guest can never widen the scope — any other value
        // is rejected with 400 rather than silently ignored.
        $status = $request->query('status');
        if ($status !== null && $status !== 'published') {
            return response()->json(['message' => 'The status query parameter only supports "published" on the public API.'], 400);
        }

        $perPage = $request->query('per_page', 15);
        if (! filter_var($perPage, FILTER_VALIDATE_INT) || (int) $perPage < 5 || (int) $perPage > 50) {
            return response()->json(['message' => 'The per_page query parameter must be an integer between 5 and 50.'], 400);
        }

        $query = Post::publiclyVisible()->ofType($type)->with(['tags', 'topics'])->latest('published_at');

        if ($q = $request->query('q')) {
            $query->where(fn ($w) => $w->where('title', 'like', "%{$q}%"));
        }
        if ($tag = $request->query('tag')) {
            $query->whereHas('tags', fn ($t) => $t->where('slug', $tag));
        }
        if ($topic = $request->query('topic')) {
            $query->whereHas('topics', fn ($t) => $t->where('slug', $topic));
        }

        return PostResource::collection($query->paginate((int) $perPage)->withQueryString());
    }

    public function notes(Request $request)
    {
        $query = Post::publiclyVisible()->ofType('note')->with(['tags', 'topics'])->latest('published_at');

        if ($q = $request->query('q')) {
            $query->where(fn ($w) => $w->where('title', 'like', "%{$q}%"));
        }

        return PostResource::collection($query->paginate(15)->withQueryString());
    }

    public function show(string $slug)
    {
        return new PostResource(
            Post::publiclyVisible()->ofType('article')->where('slug', $slug)->with(['tags', 'topics'])->firstOrFail()
        );
    }

    public function showNote(string $slug)
    {
        return new PostResource(
            Post::publiclyVisible()->ofType('note')->where('slug', $slug)->with(['tags', 'topics'])->firstOrFail()
        );
    }
}
