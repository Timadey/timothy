import { describe, expect, test } from 'vitest';
import { suggestSeo } from '@/seoSuggest';

describe('suggestSeo', () => {
    test('uses the trimmed title for meta_title and leaves text fields empty without a body', () => {
        const suggestion = suggestSeo('', '  My Great Piece  ');

        expect(suggestion.meta_title).toBe('My Great Piece');
        expect(suggestion.excerpt).toBe('');
        expect(suggestion.meta_description).toBe('');
    });

    test('strips inline markup, skips headings and joins paragraphs', () => {
        const body =
            '<h2>Intro</h2><p>Hello <strong>world</strong> and <a href="#">a link</a>.</p><p>Second paragraph.</p>';

        const { excerpt, meta_description } = suggestSeo(body, 'Title');

        expect(excerpt).toBe('Hello world and a link. Second paragraph.');
        expect(meta_description).toBe('Hello world and a link. Second paragraph.');
    });

    test('falls back to all text when the body has no paragraphs', () => {
        const { excerpt } = suggestSeo('<h2>Only a heading</h2>', 'Title');

        expect(excerpt).toBe('Only a heading');
    });

    test('clamps the excerpt at a sentence boundary inside the limit', () => {
        const first = `${'word '.repeat(40).trim()}.`;
        const second = `${'more '.repeat(30).trim()}.`;
        const { excerpt, meta_description } = suggestSeo(`<p>${first} ${second}</p>`, 'Title');

        expect(excerpt).toBe(first);
        expect(excerpt.endsWith('…')).toBe(false);
        expect(meta_description.length).toBeLessThanOrEqual(160);
    });

    test('cuts at a word boundary with an ellipsis when there is no sentence', () => {
        const body = `<p>${'lorem ipsum dolor '.repeat(40).trim()}</p>`;
        const { excerpt } = suggestSeo(body, 'Title');

        expect(excerpt.length).toBeLessThanOrEqual(280);
        expect(excerpt.endsWith('…')).toBe(true);
        expect(excerpt).not.toContain('  ');
        expect(excerpt.slice(0, -1).endsWith(' ')).toBe(false);
    });

    test('does not end on a tiny opening sentence', () => {
        const body = `<p>Yes. ${'lorem ipsum '.repeat(40).trim()}</p>`;
        const { excerpt } = suggestSeo(body, 'Title');

        expect(excerpt).not.toBe('Yes.');
        expect(excerpt.endsWith('…')).toBe(true);
    });

    test('keeps meta_description within 160 characters', () => {
        const body = `<p>${'long content here '.repeat(50).trim()}</p>`;
        const { meta_description, excerpt } = suggestSeo(body, 'Title');

        expect(meta_description.length).toBeLessThanOrEqual(160);
        expect(excerpt.length).toBeGreaterThan(meta_description.length);
    });
});
