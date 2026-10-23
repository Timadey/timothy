<?php

use App\Support\HtmlSanitizer;
use Illuminate\Validation\ValidationException;

it('passes clean editor html through unchanged', function () {
    $html = '<p>Hello <strong>world</strong> and <em>friends</em>.</p><h2>Section</h2><ul><li>one</li><li>two</li></ul><blockquote>quoted</blockquote><pre><code>echo 1;</code></pre><p><a href="https://example.com" title="x">link</a></p>';

    expect(HtmlSanitizer::sanitize($html))->toBe($html);
});

it('keeps allowed attributes on images', function () {
    $html = '<p><img src="/storage/uploads/abc/photo.png" alt="a photo" width="600" height="400"></p>';

    expect(HtmlSanitizer::sanitize($html))->toBe($html);
});

it('rejects script tags', function () {
    expect(fn () => HtmlSanitizer::sanitize('<p>hi</p><script>alert(1)</script>'))
        ->toThrow(ValidationException::class);
});

it('rejects event handler attributes', function () {
    expect(fn () => HtmlSanitizer::sanitize('<p><img src="/storage/uploads/x.png" onerror="alert(1)"></p>'))
        ->toThrow(ValidationException::class);
});

it('rejects images outside our uploads', function () {
    expect(fn () => HtmlSanitizer::sanitize('<p><img src="https://evil.example/x.png"></p>'))
        ->toThrow(ValidationException::class);
});

it('rejects javascript links', function () {
    expect(fn () => HtmlSanitizer::sanitize('<p><a href="javascript:alert(1)">x</a></p>'))
        ->toThrow(ValidationException::class);
});

it('rejects unknown elements', function () {
    expect(fn () => HtmlSanitizer::sanitize('<p><span style="color:red">x</span></p>'))
        ->toThrow(ValidationException::class);
});

it('accepts local and mailto links', function () {
    $html = '<p><a href="/about">a</a> <a href="mailto:hi@example.com">b</a> <a href="#top">c</a></p>';

    expect(HtmlSanitizer::sanitize($html))->toBe($html);
});

it('allows pasted external link attributes (target and rel)', function () {
    $html = '<p>I found <a target="_blank" rel="noopener noreferrer nofollow" href="https://alxafrica.com">ALX</a>.</p>';

    expect(HtmlSanitizer::sanitize($html))->toBe($html);
});

it('rejects unexpected target values on links', function () {
    expect(fn () => HtmlSanitizer::sanitize('<p><a target="evil" href="https://example.com">x</a></p>'))
        ->toThrow(ValidationException::class);
});
