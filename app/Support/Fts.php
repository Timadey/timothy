<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;

class Fts
{
    /**
     * Add a prefix-matching full-text filter on `search_vector` to $query.
     * Words are extracted with a unicode split so raw input never reaches
     * tsquery syntax. A non-empty input with no word characters matches nothing.
     */
    public static function apply(Builder $query, string $input): void
    {
        $ts = self::prefixQuery($input);

        if ($ts === null) {
            $query->whereRaw('false');

            return;
        }

        $query->whereRaw('search_vector @@ to_tsquery(?, ?)', ['english', $ts]);
    }

    /** e.g. "distributed systems" -> "distributed:* & systems:*"; null when no words. */
    public static function prefixQuery(string $input): ?string
    {
        $words = preg_split('/[^\p{L}\p{N}_]+/u', $input, -1, PREG_SPLIT_NO_EMPTY) ?: [];

        if ($words === []) {
            return null;
        }

        return implode(' & ', array_map(fn (string $w) => $w.':*', $words));
    }
}
