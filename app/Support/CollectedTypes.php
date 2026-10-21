<?php

namespace App\Support;

final class CollectedTypes
{
    /** Singular item type => display label. */
    public const TYPES = [
        'book' => 'Books',
        'article' => 'Articles',
        'video' => 'Videos',
        'podcast' => 'Podcasts',
        'music' => 'Music',
        'tool' => 'Tools',
        'quote' => 'Quotes',
        'website' => 'Websites',
        'other' => 'Other',
    ];

    /** URL segment (plural) => singular item type. */
    public const SEGMENTS = [
        'books' => 'book',
        'articles' => 'article',
        'videos' => 'video',
        'podcasts' => 'podcast',
        'music' => 'music',
        'tools' => 'tool',
        'quotes' => 'quote',
        'websites' => 'website',
        'others' => 'other',
    ];

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_keys(self::TYPES);
    }

    public static function label(string $type): string
    {
        return self::TYPES[$type] ?? self::TYPES['other'];
    }

    public static function segment(string $type): ?string
    {
        $segment = array_search($type, self::SEGMENTS, true);

        return $segment === false ? null : $segment;
    }

    public static function fromSegment(string $segment): ?string
    {
        return self::SEGMENTS[$segment] ?? null;
    }
}
