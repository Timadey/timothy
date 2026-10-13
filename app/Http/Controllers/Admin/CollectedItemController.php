<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCollectedItemRequest;
use App\Models\{CollectedItem, Tag};
use Illuminate\Http\{RedirectResponse, Request};
use Illuminate\Support\Str;
use Inertia\{Inertia, Response};

class CollectedItemController extends Controller
{
    public function index(Request $request): Response
    {
        $query = CollectedItem::latest()->with('tags');

        if ($type = $request->query('type')) {
            $query->where('item_type', $type);
        }
        if ($search = $request->query('q')) {
            $needle = '%'.mb_strtolower($search).'%';
            $query->where(fn ($q) => $q
                ->whereRaw('LOWER(title) LIKE ?', [$needle])
                ->orWhereRaw('LOWER(COALESCE(creator, \'\')) LIKE ?', [$needle]));
        }

        return Inertia::render('Admin/Collected/Index', [
            'items' => $query->paginate(20)->withQueryString()->through(fn ($i) => [
                'id' => $i->id,
                'title' => $i->title,
                'url' => $i->url,
                'creator' => $i->creator,
                'item_type' => $i->item_type,
                'visibility' => $i->visibility,
                'date' => $i->created_at->format('Y-m-d'),
            ]),
            'filters' => $request->only(['type', 'q']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Collected/Edit', ['item' => null]);
    }

    public function store(StoreCollectedItemRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $tags = $data['tags'] ?? [];
        unset($data['tags']);

        $item = CollectedItem::create($data);
        $this->syncTags($item, $tags);

        return redirect()->route('admin.collected.edit', $item)->with('status', 'Item added.');
    }

    public function edit(CollectedItem $collectedItem): Response
    {
        $collectedItem->load('tags');

        return Inertia::render('Admin/Collected/Edit', [
            'item' => [
                'id' => $collectedItem->id,
                'title' => $collectedItem->title,
                'url' => $collectedItem->url,
                'creator' => $collectedItem->creator,
                'item_type' => $collectedItem->item_type,
                'annotation' => $collectedItem->annotation,
                'visibility' => $collectedItem->visibility,
                'tags' => $collectedItem->tags->pluck('name')->values(),
            ],
        ]);
    }

    public function update(StoreCollectedItemRequest $request, CollectedItem $collectedItem): RedirectResponse
    {
        $data = $request->validated();
        $tags = $data['tags'] ?? [];
        unset($data['tags']);

        $collectedItem->update($data);
        $this->syncTags($collectedItem, $tags);

        return redirect()->route('admin.collected.edit', $collectedItem)->with('status', 'Item updated.');
    }

    public function destroy(CollectedItem $collectedItem): RedirectResponse
    {
        $collectedItem->delete();

        return redirect()->route('admin.collected.index')->with('status', 'Item removed.');
    }

    private function syncTags(CollectedItem $item, array $tags): void
    {
        $ids = collect($tags)->filter()->unique()->map(fn ($name) =>
            Tag::firstOrCreate(['slug' => Str::slug($name)], ['name' => $name])->id)->all();
        $item->tags()->sync($ids);
    }
}
