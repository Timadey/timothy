<?php

namespace App\Support;

use DOMDocument;
use DOMElement;
use DOMXPath;
use Illuminate\Validation\ValidationException;

final class HtmlSanitizer
{
    private static string $field = 'body';

    private const ALLOWED = [
        'p' => [],
        'h1' => [],
        'h2' => [],
        'h3' => [],
        'strong' => [],
        'em' => [],
        'u' => [],
        's' => [],
        'ul' => [],
        'ol' => [],
        'li' => [],
        'blockquote' => [],
        'pre' => [],
        'code' => [],
        'br' => [],
        'hr' => [],
        'a' => ['href', 'title', 'target', 'rel'],
        'img' => ['src', 'alt', 'width', 'height'],
        'figure' => [],
        'figcaption' => [],
    ];

    public static function sanitize(string $html, string $field = 'body'): string
    {
        self::$field = $field;
        if (trim($html) === '') {
            return '';
        }

        $doc = new DOMDocument();
        libxml_use_internal_errors(true);
        $doc->loadHTML(
            '<div id="sanitizer-root">'.$html.'</div>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
        );
        libxml_clear_errors();

        $root = $doc->documentElement;
        if (! $root instanceof DOMElement) {
            self::reject();
        }

        $xpath = new DOMXPath($doc);
        foreach ($xpath->query('.//*', $root) ?: [] as $node) {
            if (! $node instanceof DOMElement) {
                continue;
            }

            $tag = strtolower($node->tagName);
            if (! array_key_exists($tag, self::ALLOWED)) {
                self::reject();
            }

            $allowedAttributes = self::ALLOWED[$tag];
            foreach (iterator_to_array($node->attributes) as $attribute) {
                $name = strtolower($attribute->name);
                if (! in_array($name, $allowedAttributes, true)) {
                    self::reject();
                }

                self::assertValidValue($tag, $name, $attribute->value);
            }

            if ($tag === 'a' && ! $node->hasAttribute('href')) {
                self::reject();
            }

            if ($tag === 'img' && ! $node->hasAttribute('src')) {
                self::reject();
            }
        }

        $clean = '';
        foreach ($root->childNodes as $child) {
            $clean .= $doc->saveHTML($child);
        }

        return $clean;
    }

    private static function assertValidValue(string $tag, string $name, string $value): void
    {
        $value = trim($value);

        if ($name === 'src') {
            if (! str_starts_with($value, '/storage/uploads/')) {
                self::reject();
            }

            return;
        }

        if ($name === 'target') {
            if (! in_array($value, ['_blank', '_self'], true)) {
                self::reject();
            }

            return;
        }

        if ($name === 'rel') {
            return;
        }

        if ($name === 'href') {
            if (str_starts_with($value, '//')) {
                self::reject();
            }

            if (str_starts_with($value, '/') || str_starts_with($value, '#')) {
                return;
            }

            $scheme = strtolower((string) parse_url($value, PHP_URL_SCHEME));
            if (! in_array($scheme, ['http', 'https', 'mailto'], true)) {
                self::reject();
            }

            return;
        }

        if ($name === 'width' || $name === 'height') {
            if ($value !== '' && ! ctype_digit($value)) {
                self::reject();
            }
        }
    }

    private static function reject(): never
    {
        throw ValidationException::withMessages([
            self::$field => 'Content contains unsupported markup.',
        ]);
    }
}
