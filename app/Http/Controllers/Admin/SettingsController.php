<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\{CollectedItem, Post, Project, Setting};
use App\Support\HomeHero;
use Illuminate\Http\{RedirectResponse, Request, UploadedFile};
use Illuminate\Support\Facades\Storage;
use Inertia\{Inertia, Response};

class SettingsController extends Controller
{
    private const KEYS = ['site_title', 'tagline', 'footer_text'];

    private const UPLOAD_RULES = ['nullable', 'file', 'image', 'mimes:jpeg,png,webp,gif', 'max:5120'];

    public function edit(): Response
    {
        $settings = collect(self::KEYS)
            ->mapWithKeys(fn ($k) => [$k => Setting::get($k, '')])
            ->all();

        return Inertia::render('Admin/Settings', [
            'settings' => $settings,
            'hero' => HomeHero::load()->toArray(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'settings' => ['sometimes', 'array'],
            'settings.site_title' => ['required_with:settings', 'string', 'max:100'],
            'settings.tagline' => ['nullable', 'string', 'max:200'],
            'settings.footer_text' => ['nullable', 'string', 'max:300'],
            'hero' => ['sometimes', 'array'],
            'hero.headline' => ['nullable', 'string', 'max:120'],
            'hero.role' => ['nullable', 'string', 'max:80'],
            'hero.company' => ['nullable', 'string', 'max:80'],
            'hero.company_url' => ['nullable', 'url', 'max:200'],
            'hero.status' => ['nullable', 'string', 'max:200'],
            'hero_avatar' => self::UPLOAD_RULES,
            'hero_logo' => self::UPLOAD_RULES,
            'hero_avatar_clear' => ['nullable', 'boolean'],
            'hero_logo_clear' => ['nullable', 'boolean'],
        ]);

        foreach (($data['settings'] ?? []) as $key => $value) {
            Setting::set($key, $value);
        }

        if (array_key_exists('hero', $data)) {
            $this->saveHero($request, $data);
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

    /** @param array<string, mixed> $data */
    private function saveHero(Request $request, array $data): void
    {
        $current = HomeHero::load();
        $hero = array_merge($current->toArray(), $data['hero']);

        $hero['avatar_path'] = $this->resolveUpload(
            $request->file('hero_avatar'),
            (bool) $request->boolean('hero_avatar_clear'),
            $current->avatarPath,
        );
        $hero['logo_path'] = $this->resolveUpload(
            $request->file('hero_logo'),
            (bool) $request->boolean('hero_logo_clear'),
            $current->logoPath,
        );

        HomeHero::save($hero);
    }

    private function resolveUpload(?UploadedFile $file, bool $clear, ?string $existing): ?string
    {
        if ($clear) {
            if ($existing !== null) {
                Storage::disk('public')->delete($existing);
            }

            return null;
        }

        if ($file === null) {
            return $existing;
        }

        $path = $file->store('hero', 'public');

        if ($existing !== null) {
            Storage::disk('public')->delete($existing);
        }

        return $path;
    }
}
