<?php

namespace App\Http\Controllers;

use App\Services\SearchService;
use Illuminate\Http\Request;
use Inertia\{Inertia, Response};

class SearchController extends Controller
{
    public function __invoke(Request $request, SearchService $search): Response
    {
        $q = (string) $request->query('q', '');
        $type = $request->query('type');
        $type = in_array($type, ['article', 'note', 'project', 'collected'], true) ? $type : null;

        $results = mb_strlen($q) >= 2 ? $search->search($q, $type) : [];

        return Inertia::render('Search', [
            'results' => $results,
            'types' => [
                ['value' => 'article', 'label' => 'Articles'],
                ['value' => 'note', 'label' => 'Notes'],
                ['value' => 'project', 'label' => 'Projects'],
                ['value' => 'collected', 'label' => 'Collected'],
            ],
            'q' => $q,
            'type' => $type,
            'total' => count($results),
        ]);
    }
}
