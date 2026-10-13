<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\{CollectedItem, Post, Project, Setting};
use Illuminate\Http\{RedirectResponse, Request};
use Inertia\{Inertia, Response};

class SettingsController extends Controller
{
    private const KEYS = ['site_title', 'tagline', 'footer_text'];

    public function edit(): Response
    {
        $settings = collect(self::KEYS)
            ->mapWithKeys(fn ($k) => [$k => Setting::get($k, '')])
            ->all();

        return Inertia::render('Admin/Settings', ['settings' => $settings]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'settings' => ['array'],
            'settings.site_title' => ['required', 'string', 'max:100'],
            'settings.tagline' => ['nullable', 'string', 'max:200'],
            'settings.footer_text' => ['nullable', 'string', 'max:300'],
        ]);

        foreach ($data['settings'] as $key => $value) {
            Setting::set($key, $value);
        }

        return redirect()->route('admin.settings.edit')->with('status', 'Settings saved.');
    }

    public function destroyDemo(): RedirectResponse
    {
        $count = Post::where('is_demo', true)->delete()
            + Project::where('is_demo', true)->delete()
            + CollectedItem::where('is_demo', true)->delete();

        return redirect()->route('admin.settings.edit')->with('status', "Removed {$count} demo items.");
    }
}
