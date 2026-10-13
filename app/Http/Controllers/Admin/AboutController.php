<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AboutSection;
use Illuminate\Http\{RedirectResponse, Request};
use Inertia\{Inertia, Response};

class AboutController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('Admin/About', [
            'sections' => AboutSection::orderBy('sort_order')
                ->get(['id', 'key', 'title', 'body', 'visible', 'sort_order']),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'sections' => ['array'],
            'sections.*.id' => ['required', 'exists:about_sections,id'],
            'sections.*.key' => ['nullable', 'string', 'max:50'],
            'sections.*.title' => ['required', 'string', 'max:150'],
            'sections.*.body' => ['nullable', 'string', 'max:20000'],
            'sections.*.visible' => ['boolean'],
            'sections.*.sort_order' => ['integer', 'min:0'],
        ]);

        foreach ($data['sections'] ?? [] as $i => $s) {
            AboutSection::whereKey($s['id'])->update([
                'title' => $s['title'],
                'body' => $s['body'] ?? null,
                'visible' => (bool) ($s['visible'] ?? true),
                'sort_order' => $s['sort_order'] ?? $i,
            ]);
        }

        return redirect()->route('admin.about.edit')->with('status', 'About page updated.');
    }
}
