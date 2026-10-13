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

        $query = Post::publiclyVisible()->ofType($type)->with(['tags', 'topics'])->latest('published_at');

        if ($q = $request->query('q')) {
            $query->where(fn ($w) => $w->where('title', 'like', "%{$q}%"));
        }

        return PostResource::collection($query->paginate(15)->withQueryString());
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
