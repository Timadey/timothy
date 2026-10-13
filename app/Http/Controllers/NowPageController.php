<?php

namespace App\Http\Controllers;

use App\Models\NowSection;
use Inertia\{Inertia, Response};

class NowPageController extends Controller
{
    public function __invoke(): Response
    {
        $sections = NowSection::where('visible', true)->orderBy('sort_order')
            ->with(['updates' => fn ($q) => $q->where('visible', true)->orderByDesc('occurred_at')])
            ->get()
            ->filter(fn ($s) => $s->body || $s->updates->isNotEmpty())
            ->values();

        return Inertia::render('Now', [
            'sections' => $sections->map(fn ($s) => [
                'key' => $s->key,
                'label' => $s->label,
                'body' => $s->body,
                'updates' => $s->updates->map(fn ($u) => [
                    'text' => $u->text,
                    'occurred_at' => $u->occurred_at?->format('M j, Y'),
                ]),
            ]),
            'last_updated_at' => $sections->max(fn ($s) => $s->updated_at->toIso8601String()),
        ]);
    }
}
