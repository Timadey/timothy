<?php

namespace App\Services\Llm;

class SeoSuggestService
{
    private const SYSTEM_PROMPT = <<<'PROMPT'
You write SEO metadata for a personal blog called "Timadey".
Return ONLY a JSON object with no markdown fences and no commentary, containing exactly these three string keys:
"excerpt" — a narrative teaser of at most 280 characters that makes a reader want to continue; it flows from the title without repeating it.
"meta_title" — a search title of at most 60 characters with the primary keyword front-loaded; never include the site name.
"meta_description" — a summary hook of at most 160 characters in active voice; never truncate the first paragraph.
Plain text only, no HTML.
PROMPT;

    public function suggest(string $title, string $bodyHtml): array
    {
        $raw = Llm::client()->complete(self::SYSTEM_PROMPT, $this->userPrompt($title, $bodyHtml));
        $fields = $this->decode($raw);

        return [
            'excerpt' => self::clamp($fields['excerpt'], 280),
            'meta_title' => self::clamp($fields['meta_title'], 60),
            'meta_description' => self::clamp($fields['meta_description'], 160),
            'source' => 'ai',
        ];
    }

    private function userPrompt(string $title, string $bodyHtml): string
    {
        $text = preg_replace('/<[^>]+>/u', ' ', $bodyHtml);
        $text = html_entity_decode((string) $text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = trim(preg_replace('/\s+/u', ' ', (string) $text));

        if (mb_strlen($text) > 4000) {
            $text = mb_substr($text, 0, 4000).'…';
        }

        return "Post title: {$title}\n\nPost content (plain text):\n{$text}";
    }

    private function decode(string $raw): array
    {
        $raw = trim($raw);
        $raw = (string) preg_replace('/^```(?:json)?\s*/i', '', $raw);
        $raw = (string) preg_replace('/\s*```$/i', '', $raw);

        $start = strpos($raw, '{');
        $end = strrpos($raw, '}');

        if ($start === false || $end === false || $end < $start) {
            throw new LlmException('No JSON object in LLM response');
        }

        $decoded = json_decode(substr($raw, $start, $end - $start + 1), true);

        if (! is_array($decoded)) {
            throw new LlmException('LLM response is not valid JSON');
        }

        foreach (['excerpt', 'meta_title', 'meta_description'] as $key) {
            if (! array_key_exists($key, $decoded) || ! is_string($decoded[$key])) {
                throw new LlmException("LLM response is missing string key: {$key}");
            }
        }

        return [
            'excerpt' => $decoded['excerpt'],
            'meta_title' => $decoded['meta_title'],
            'meta_description' => $decoded['meta_description'],
        ];
    }

    private static function clamp(string $text, int $max): string
    {
        $trimmed = trim($text);

        if (mb_strlen($trimmed) <= $max) {
            return $trimmed;
        }

        $slice = mb_substr($trimmed, 0, $max);
        $positions = array_filter(
            [mb_strrpos($slice, '.'), mb_strrpos($slice, '!'), mb_strrpos($slice, '?')],
            fn ($p) => $p !== false,
        );
        $sentenceEnd = $positions === [] ? -1 : max($positions);

        if ($sentenceEnd >= intdiv($max, 2)) {
            return trim(mb_substr($slice, 0, $sentenceEnd + 1));
        }

        $wordCut = mb_substr($trimmed, 0, $max - 1);
        $lastSpace = mb_strrpos($wordCut, ' ');
        $base = $lastSpace !== false && $lastSpace > 0 ? mb_substr($wordCut, 0, $lastSpace) : $wordCut;

        return trim($base).'…';
    }
}
