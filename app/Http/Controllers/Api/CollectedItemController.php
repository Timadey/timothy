<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CollectedItemResource;
use App\Models\CollectedItem;
use App\Support\CollectedTypes;
use Illuminate\Http\Request;

class CollectedItemController extends Controller
{
    public function index(Request $request)
    {
        $query = CollectedItem::publiclyVisible()->with('tags')->latest('created_at');

        if ($type = $request->query('type')) {
            $query->where('item_type', in_array($type, CollectedTypes::values(), true) ? $type : 'other');
        }

        if ($q = $request->query('q')) {
            $needle = '%'.mb_strtolower($q).'%';
            $query->where(fn ($w) => $w
                ->whereRaw('LOWER(title) LIKE ?', [$needle])
                ->orWhereRaw('LOWER(COALESCE(annotation, \'\')) LIKE ?', [$needle])
                ->orWhereRaw('LOWER(COALESCE(creator, \'\')) LIKE ?', [$needle]));
        }

        return CollectedItemResource::collection($query->paginate(15)->withQueryString());
    }
}
