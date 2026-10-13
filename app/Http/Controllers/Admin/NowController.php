<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\{NowSection, NowUpdate};
use Illuminate\Http\{RedirectResponse, Request};
use Illuminate\Support\Facades\DB;
use Inertia\{Inertia, Response};

class NowController extends Controller
{
    public function edit(): Response
    {
        $lastUpdated = NowSection::max('updated_at');

        return Inertia::render('Admin/Now', [
            'sections' => NowSection::orderBy('sort_order')
                ->get(['id', 'key', 'label', 'body', 'visible', 'sort_order']),
            'updates' => NowUpdate::orderByDesc('occurred_at')
                ->get(['id', 'now_section_id', 'text', 'occurred_at', 'visible']),
            'lastUpdatedAt' => $lastUpdated ? \Illuminate\Support\Carbon::parse($lastUpdated)->toIso8601String() : null,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'sections' => ['array'],
            'sections.*.id' => ['required', 'exists:now_sections,id'],
            'sections.*.key' => ['nullable', 'string', 'max:50'],
            'sections.*.label' => ['required', 'string', 'max:100'],
            'sections.*.body' => ['nullable', 'string', 'max:5000'],
            'sections.*.visible' => ['boolean'],
            'sections.*.sort_order' => ['integer', 'min:0'],
            'updates' => ['array'],
            'updates.*.id' => ['nullable', 'exists:now_updates,id'],
            'updates.*.now_section_id' => ['required', 'exists:now_sections,id'],
            'updates.*.text' => ['required', 'string', 'max:500'],
            'updates.*.occurred_at' => ['nullable', 'date'],
            'updates.*.visible' => ['boolean'],
        ]);

        DB::transaction(function () use ($data) {
            foreach ($data['sections'] ?? [] as $i => $s) {
                NowSection::whereKey($s['id'])->update([
                    'label' => $s['label'],
                    'body' => $s['body'] ?? null,
                    'visible' => (bool) ($s['visible'] ?? true),
                    'sort_order' => $s['sort_order'] ?? $i,
                ]);
            }

            $keptIds = collect($data['updates'] ?? [])->pluck('id')->filter()->values()->all();
            NowUpdate::whereNotIn('id', $keptIds)->delete();

            foreach ($data['updates'] ?? [] as $u) {
                $payload = [
                    'now_section_id' => $u['now_section_id'],
                    'text' => $u['text'],
                    'occurred_at' => $u['occurred_at'] ?? now(),
                    'visible' => (bool) ($u['visible'] ?? true),
                ];

                if (! empty($u['id'])) {
                    NowUpdate::whereKey($u['id'])->update($payload);
                } else {
                    NowUpdate::create($payload);
                }
            }
        });

        return redirect()->route('admin.now.edit')->with('status', 'Now page updated.');
    }
}
