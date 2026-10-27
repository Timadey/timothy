<?php

namespace App\Http\Controllers;

use App\Models\CollectedItem;
use App\Models\Tag;
use App\Support\CollectedTypes;
use App\Support\Fts;
use Illuminate\Http\Request;
use Inertia\{Inertia, Response};

class CollectedController extends Controller
{
    public function index(Request $request): Response
    {
        $q = trim((string) $request->query('q'));
        $items = null;

        if ($q !== '') {
            $query = CollectedItem::publiclyVisible()
                ->with('tags')
                ->latest('created_at');
            Fts::apply($query, $q);
            $items = $query->paginate(20)
                ->withQueryString()
                ->through(fn ($i) => $this->mapItem($i));
        }

        return Inertia::render('Collected/Index', [
            'categories' => $this->drawerCategories(),
            'items' => $items,
            'filters' => ['q' => $q !== '' ? $q : null],
        ]);
    }

    public function show(Request $request, string $type): Response
    {
        $singular = CollectedTypes::fromSegment($type);
        abort_unless($singular !== null, 404);

        abort_unless(
            CollectedItem::publiclyVisible()->where('item_type', $singular)->exists(),
            404
        );

        $query = CollectedItem::publiclyVisible()
            ->where('item_type', $singular)
            ->with('tags')
            ->latest('created_at');

        if ($tag = $request->query('tag')) {
            $query->whereHas('tags', fn ($t) => $t->where('slug', $tag));
        }

        $tags = Tag::whereHas('collectedItems', fn ($q) => $q
                ->where('collected_items.item_type', $singular)
                ->where('visibility', 'public'))
            ->orderBy('name')
            ->get(['name', 'slug'])
            ->map(fn ($t) => ['label' => $t->name, 'slug' => $t->slug])
            ->values();

        return Inertia::render('Collected/Show', [
            'type' => $singular,
            'label' => CollectedTypes::label($singular),
            'segment' => $type,
            'items' => $query->paginate(20)->withQueryString()->through(fn ($i) => $this->mapItem($i)),
            'tags' => $tags,
            'filters' => $request->only(['tag']),
        ]);
    }

    /** @return array<int, array{type: string, label: string, count: int, href: string}> */
    private function drawerCategories(): array
    {
        $rows = CollectedItem::publiclyVisible()
            ->selectRaw('item_type, COUNT(*) as total')
            ->groupBy('item_type')
            ->get();

        return $rows
            ->map(fn ($row) => [
                'type' => $row->item_type,
                'label' => CollectedTypes::label($row->item_type),
                'count' => (int) $row->total,
            ])
            ->filter(fn ($c) => $c['count'] > 0 && array_key_exists($c['type'], CollectedTypes::TYPES))
            ->sortBy(fn ($c) => array_search($c['type'], CollectedTypes::values(), true))
            ->values()
            ->map(fn ($c) => $c + ['href' => '/collected/'.CollectedTypes::segment($c['type'])])
            ->all();
    }

    private function mapItem(CollectedItem $i): array
    {
        return [
            'id' => $i->id,
            'title' => $i->title,
            'url' => $i->url,
            'creator' => $i->creator,
            'item_type' => $i->item_type,
            'annotation' => $i->annotation,
            'date' => $i->created_at->format('M j, Y'),
            'tags' => $i->tags->map(fn (Tag $t) => ['name' => $t->name, 'slug' => $t->slug])->values(),
            'cover_image' => $i->coverUrl(),
        ];
    }
}
