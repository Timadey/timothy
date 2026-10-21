<?php

it('ships non-empty brand image assets', function (string $path) {
    $absolute = public_path($path);

    expect(file_exists($absolute))->toBeTrue()
        ->and(filesize($absolute))->toBeGreaterThan(0);
})->with([
    'favicon' => 'favicon.ico',
    'favicon png 32' => 'favicon-32x32.png',
    'favicon png 16' => 'favicon-16x16.png',
    'apple touch' => 'apple-touch-icon.png',
    'header mark' => 'images/logo-mark.png',
    'og card' => 'images/og-card.png',
]);
