<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::useHotFile((string) config('vite.hot_file'));

        foreach ([
            \App\Models\Post::class,
            \App\Models\Project::class,
            \App\Models\CollectedItem::class,
            \App\Models\Tag::class,
            \App\Models\Topic::class,
            \App\Models\SocialLink::class,
            \App\Models\Setting::class,
        ] as $model) {
            $model::observe(\App\Observers\CacheFlushObserver::class);
        }

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute((int) config('auth.login_throttle.max_attempts', 5))
                ->by($request->ip());
        });
    }
}
