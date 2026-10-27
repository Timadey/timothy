<?php

namespace App\Support;

use App\Models\{Post, Setting, SocialLink};
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class CacheKeys
{
    public const SOCIAL_LINKS = 'social_links';
    public const HOME = 'home';
    public const FEED = 'feed';
    public const RSS = 'rss';
    public const SITEMAP = 'sitemap';
    public const TOPICS = 'taxonomy.topics';
    public const NOTE_TAGS = 'taxonomy.note_tags';

    public static function setting(string $key): string
    {
        return 'setting.'.$key;
    }

    public static function noteBody(string $slug): string
    {
        return 'note.body.'.$slug;
    }

    /** Forget every key derived from site content (works on any cache store). */
    public static function flushContent(): void
    {
        foreach ([self::HOME, self::FEED, self::RSS, self::SITEMAP, self::TOPICS, self::NOTE_TAGS] as $key) {
            Cache::forget($key);
        }
    }

    /** Model-event entry point. */
    public static function flushFor(Model $model): void
    {
        self::flushContent();

        if ($model instanceof Post) {
            $slugs = array_unique(array_filter([
                $model->slug,
                $model->getOriginal('slug') ?: null,
            ]));

            foreach ($slugs as $slug) {
                Cache::forget(self::noteBody((string) $slug));
            }
        }

        if ($model instanceof Setting) {
            Cache::forget(self::setting((string) $model->key));
        }

        if ($model instanceof SocialLink) {
            Cache::forget(self::SOCIAL_LINKS);
        }
    }
}
