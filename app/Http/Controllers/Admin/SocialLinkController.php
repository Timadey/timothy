<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SocialLink;
use Illuminate\Http\{RedirectResponse, Request};
use Inertia\{Inertia, Response};

class SocialLinkController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Social', [
            'social_links' => SocialLink::orderBy('sort_order')
                ->get(['id', 'platform', 'url', 'label', 'sort_order', 'visible']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'platform' => ['required', 'string', 'max:50'],
            'url' => ['required', 'url', 'max:500'],
            'label' => ['nullable', 'string', 'max:50'],
            'visible' => ['boolean'],
        ]);
        $data['visible'] = (bool) ($data['visible'] ?? true);
        $data['sort_order'] = (int) SocialLink::max('sort_order') + 1;

        SocialLink::create($data);

        return redirect()->route('admin.social.index')->with('status', 'Link added.');
    }

    public function update(Request $request, SocialLink $socialLink): RedirectResponse
    {
        $data = $request->validate([
            'platform' => ['required', 'string', 'max:50'],
            'url' => ['required', 'url', 'max:500'],
            'label' => ['nullable', 'string', 'max:50'],
            'visible' => ['boolean'],
            'sort_order' => ['integer', 'min:0'],
        ]);
        $data['visible'] = (bool) ($data['visible'] ?? true);

        $socialLink->update($data);

        return redirect()->route('admin.social.index')->with('status', 'Link updated.');
    }

    public function destroy(SocialLink $socialLink): RedirectResponse
    {
        $socialLink->delete();

        return redirect()->route('admin.social.index')->with('status', 'Link removed.');
    }
}
