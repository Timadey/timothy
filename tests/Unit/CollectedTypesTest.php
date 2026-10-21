<?php

use App\Support\CollectedTypes;

it('maps every type to a label and a url segment', function () {
    expect(CollectedTypes::TYPES)->toHaveCount(9)
        ->and(CollectedTypes::SEGMENTS)->toHaveCount(9)
        ->and(CollectedTypes::values())->toBe(['book', 'article', 'video', 'podcast', 'music', 'tool', 'quote', 'website', 'other']);
});

it('converts between singular types and plural segments', function () {
    expect(CollectedTypes::segment('book'))->toBe('books')
        ->and(CollectedTypes::segment('music'))->toBe('music')
        ->and(CollectedTypes::fromSegment('books'))->toBe('book')
        ->and(CollectedTypes::fromSegment('others'))->toBe('other');
});

it('returns null for unknown segments and types', function () {
    expect(CollectedTypes::fromSegment('nope'))->toBeNull()
        ->and(CollectedTypes::segment('nope'))->toBeNull();
});

it('labels known types and falls back to Other', function () {
    expect(CollectedTypes::label('music'))->toBe('Music')
        ->and(CollectedTypes::label('bogus'))->toBe('Other');
});
