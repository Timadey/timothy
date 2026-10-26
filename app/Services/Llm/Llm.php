<?php

namespace App\Services\Llm;

class Llm
{
    private const PRESETS = [
        'openai' => 'https://api.openai.com/v1',
        'cohere' => 'https://api.cohere.ai/compatibility/v1',
        'nvidia' => 'https://integrate.api.nvidia.com/v1',
    ];

    public static function baseUrl(): ?string
    {
        if ($base = config('llm.base_url')) {
            return rtrim($base, '/');
        }

        $provider = config('llm.provider');

        return self::PRESETS[$provider] ?? null;
    }

    public static function enabled(): bool
    {
        return self::baseUrl() !== null
            && (bool) config('llm.api_key')
            && (bool) config('llm.model');
    }
}
