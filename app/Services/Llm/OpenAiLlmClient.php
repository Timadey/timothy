<?php

namespace App\Services\Llm;

use Illuminate\Support\Facades\Http;
use Throwable;

class OpenAiLlmClient
{
    public function __construct(
        private readonly string $baseUrl,
        private readonly string $apiKey,
        private readonly string $model,
        private readonly int $timeout,
    ) {
    }

    public function complete(string $system, string $user): string
    {
        try {
            $response = Http::withToken($this->apiKey)
                ->timeout($this->timeout)
                ->post($this->baseUrl.'/chat/completions', [
                    'model' => $this->model,
                    'messages' => [
                        ['role' => 'system', 'content' => $system],
                        ['role' => 'user', 'content' => $user],
                    ],
                    'temperature' => 0.6,
                    'max_tokens' => 400,
                ]);
        } catch (Throwable $e) {
            throw new LlmException('LLM request failed: '.$e->getMessage(), 0, $e);
        }

        if ($response->failed()) {
            throw new LlmException('LLM HTTP '.$response->status());
        }

        $content = $response->json('choices.0.message.content');

        if (! is_string($content) || $content === '') {
            throw new LlmException('LLM returned no message content');
        }

        return $content;
    }
}
