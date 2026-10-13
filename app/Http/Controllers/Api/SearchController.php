<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function __invoke(Request $request, SearchService $search): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));

        if ($q === '') {
            return response()->json(['message' => 'The q query parameter is required.'], 400);
        }

        $type = $request->query('type');
        $type = in_array($type, ['article', 'note', 'project', 'collected'], true) ? $type : null;

        $results = mb_strlen($q) >= 2 ? $search->search($q, $type) : [];

        return response()->json(['data' => $results, 'total' => count($results)]);
    }
}
