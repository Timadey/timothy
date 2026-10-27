<?php

namespace App\Http\Middleware;

use App\Models\SocialLink;
use App\Services\Llm\Llm;
use App\Support\CacheKeys;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
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
            'social_links' => fn () => Cache::remember(
                CacheKeys::SOCIAL_LINKS,
                now()->addHour(),
                fn () => SocialLink::where('visible', true)->orderBy('sort_order')
                    ->get(['platform', 'url', 'label'])
            ),
            'llm_enabled' => fn () => Llm::usable(),
        ];
    }
}
