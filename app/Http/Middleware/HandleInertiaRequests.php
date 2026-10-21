<?php

namespace App\Http\Middleware;

use App\Models\SocialLink;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'status' => fn () => $request->session()->get('status'),
            'flash' => fn () => $request->session()->get('flash'),
            'social_links' => fn () => SocialLink::where('visible', true)->orderBy('sort_order')
                ->get(['platform', 'url', 'label']),
        ];
    }
}
