<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAboutRequest;
use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Inertia\{Inertia, Response};

class AboutController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('Admin/About', [
            'body' => (string) Setting::get('about_body'),
        ]);
    }

    public function update(StoreAboutRequest $request): RedirectResponse
    {
        Setting::set('about_body', (string) $request->validated('body'));

        return redirect()->route('admin.about.edit')->with('status', 'About page updated.');
    }
}
