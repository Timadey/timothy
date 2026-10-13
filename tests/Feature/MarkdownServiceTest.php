<?php

use App\Services\MarkdownService;

it('renders markdown to html', function () {
    $html = app(MarkdownService::class)->render("# Title\n\nSome **bold** text");
    expect($html)->toContain('<h1>')->toContain('<strong>bold</strong>');
});

it('strips raw html for safety', function () {
    $html = app(MarkdownService::class)->render('Hello <script>alert(1)</script>');
    expect($html)->not->toContain('<script>');
});

it('renders fenced code blocks', function () {
    $html = app(MarkdownService::class)->render("```php\necho 1;\n```");
    expect($html)->toContain('<pre>')->toContain('echo 1;');
});

it('renders links and blockquotes', function () {
    $html = app(MarkdownService::class)->render("[site](https://example.com)\n\n> quoted");
    expect($html)->toContain('<a href="https://example.com">site</a>')->toContain('<blockquote>');
});

it('converts to plain text', function () {
    $text = app(MarkdownService::class)->toPlainText("# Hello\n\nWorld");
    expect($text)->toContain('Hello')->toContain('World')->not->toContain('#');
});
