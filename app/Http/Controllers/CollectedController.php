<?php

namespace App\Http\Controllers;

use App\Models\CollectedItem;
use Illuminate\Http\Request;
use Inertia\{Inertia, Response};

class CollectedController extends Controller
{
    private const TYPES = [
        'book' => 'Books',
        'article' => 'Articles',
        'video' => 'Videos',
        'podcast' => 'Podcasts',
        'music' => 'Music',
        'tool' => 'Tools',
        'quote' => 'Quotes',
        'website' => 'Websites',
        'other' => 'Other',
    ];

    public function index(Request $request): Response
    {
        $query = CollectedItem::publiclyVisible()->with('tags')->latest('created_at');

        if ($type = $request->query('type')) {
            $query->where('item_type', array_key_exists($type, self::TYPES) ? $type : 'other');
        }
        if ($q = $request->query('q')) {
            $needle = '%'.mb_strtolower($q).'%';
            $query->where(fn ($w) => $w
                ->whereRaw('LOWER(title) LIKE ?', [$needle])
                ->orWhereRaw('LOWER(COALESCE(annotation, \'\')) LIKE ?', [$needle])
                ->orWhereRaw('LOWER(COALESCE(creator, \'\')) LIKE ?', [$needle]));
        }
        if ($tag = $request->query('tag')) {
            $query->whereHas('tags', fn ($t) => $t->where('slug', $tag));
        }

        return Inertia::render('Collected/Index', [
            'items' => $query->paginate(20)->withQueryString()->through(fn ($i) => [
                'title' => $i->title,
                'url' => $i->url,
                'creator' => $i->creator,
                'item_type' => $i->item_type,
                'annotation' => $i->annotation,
                'date' => $i->created_at->format('M j, Y'),
                'tags' => $i->tags->pluck('name'),
            ]),
            'types' => collect(self::TYPES)
                ->map(fn ($label, $value) => ['value' => $value, 'label' => $label])
                ->values(),
            'filters' => $request->only(['type', 'q', 'tag']),
        ]);
    }
}
