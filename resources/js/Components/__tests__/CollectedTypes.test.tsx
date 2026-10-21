import { test, expect } from 'vitest';
import { ITEM_TYPES, TYPE_GLYPHS, TYPE_LABELS, TYPE_SEGMENTS, VISIT_VERBS, coverKind } from '@/collectedTypes';

test('every type has a label, segment, verb, glyph and cover kind', () => {
    for (const type of ITEM_TYPES) {
        expect(TYPE_LABELS[type], `label for ${type}`).toBeTruthy();
        expect(TYPE_SEGMENTS[type], `segment for ${type}`).toBeTruthy();
        expect(VISIT_VERBS[type], `verb for ${type}`).toBeTruthy();
        expect(TYPE_GLYPHS[type], `glyph for ${type}`).toBeDefined();
        expect(['book', 'music', 'video', 'other']).toContain(coverKind(type));
    }
});

test('segments follow the plural url convention', () => {
    expect(TYPE_SEGMENTS.book).toBe('books');
    expect(TYPE_SEGMENTS.music).toBe('music');
    expect(TYPE_SEGMENTS.other).toBe('others');
    expect(ITEM_TYPES).toHaveLength(9);
});
