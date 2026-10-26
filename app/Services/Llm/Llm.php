<?php

namespace App\Services\Llm;

use App\Models\Setting;

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

    public static function usable(): bool
    {
        return self::enabled()
            && Setting::get('llm_enabled', '1') !== '0';
    }

    public static function client(): OpenAiLlmClient
    {
        if (! self::enabled()) {
            throw new LlmException('LLM not configured');
        }

        return new OpenAiLlmClient(
            (string) self::baseUrl(),
            (string) config('llm.api_key'),
            (string) config('llm.model'),
            (int) config('llm.timeout', 10),
        );
    }
}
