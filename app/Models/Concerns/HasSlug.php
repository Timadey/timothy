<?php

namespace App\Models\Concerns;

use Illuminate\Support\Str;

trait HasSlug
{
    public static function makeSlug(string $title): string
    {
        $base = Str::slug($title) ?: 'item';
        $slug = $base;
        $i = 2;
        $exists = fn (string $candidate) => (method_exists(static::class, 'withTrashed')
            ? static::withTrashed()
            : static::query())->where('slug', $candidate)->exists();
        while ($exists($slug)) {
            $slug = $base . '-' . $i++;
        }

        return $slug;
    }
}
