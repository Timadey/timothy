<?php

namespace App\Models;

use App\Support\CacheKeys;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    public static function get(string $key, ?string $default = null): ?string
    {
        $value = Cache::remember(
            CacheKeys::setting($key),
            now()->addHour(),
            fn () => static::where('key', $key)->value('value')
        );

        return $value ?? $default;
    }

    public static function set(string $key, ?string $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
    }
}
