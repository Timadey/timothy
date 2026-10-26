import { test, expect, describe, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SeoSuggestButton } from '../SeoSuggestButton';

const BODY =
    '<p>This is a body paragraph with enough words to produce a reasonable excerpt for the suggestion engine.</p>';

const empty = { excerpt: '', meta_title: '', meta_description: '' };

describe('SeoSuggestButton', () => {
    test('fills every empty seo field from the content', () => {
        const onFill = vi.fn();
        render(<SeoSuggestButton body={BODY} title="Sample Title" values={empty} onFill={onFill} />);

        fireEvent.click(screen.getByRole('button', { name: 'Suggest from content' }));

        expect(onFill).toHaveBeenCalledWith('excerpt', expect.stringContaining('This is a body paragraph'));
        expect(onFill).toHaveBeenCalledWith('meta_title', 'Sample Title');
        expect(onFill).toHaveBeenCalledWith('meta_description', expect.stringContaining('This is a body paragraph'));
    });

    test('keeps fields that already have a value', () => {
        const onFill = vi.fn();
        render(
            <SeoSuggestButton
                body={BODY}
                title="Sample Title"
                values={{ ...empty, excerpt: 'My own excerpt.' }}
                onFill={onFill}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Suggest from content' }));

        expect(onFill).not.toHaveBeenCalledWith('excerpt', expect.anything());
        expect(onFill).toHaveBeenCalledTimes(2);
    });

    test('is disabled when every field already has a value', () => {
        render(
            <SeoSuggestButton
                body={BODY}
                title="Sample Title"
                values={{ excerpt: 'Excerpt.', meta_title: 'Meta', meta_description: 'Description.' }}
                onFill={vi.fn()}
            />,
        );

        expect(screen.getByRole('button', { name: 'Suggest from content' })).toBeDisabled();
    });

    test('treats null values as empty instead of crashing', () => {
        const onFill = vi.fn();
        render(
            <SeoSuggestButton
                body={BODY}
                title="Sample Title"
                values={{ excerpt: null, meta_title: null, meta_description: null }}
                onFill={onFill}
            />,
        );

        const button = screen.getByRole('button', { name: 'Suggest from content' });
        expect(button).toBeEnabled();
        fireEvent.click(button);

        expect(onFill).toHaveBeenCalledTimes(3);
    });

    test('does nothing when there is no content to suggest from', () => {
        const onFill = vi.fn();
        render(<SeoSuggestButton body="" title="" values={empty} onFill={onFill} />);

        fireEvent.click(screen.getByRole('button', { name: 'Suggest from content' }));

        expect(onFill).not.toHaveBeenCalled();
    });
});

function jsonResponse(body: unknown) {
    return { ok: true, json: async () => body } as Response;
}

describe('SeoSuggestButton with llmEnabled', () => {
    test('posts to the suggest-seo endpoint and fills from the response', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            jsonResponse({
                excerpt: 'AI excerpt here.',
                meta_title: 'AI Title',
                meta_description: 'AI description.',
                source: 'ai',
            }),
        );
        vi.stubGlobal('fetch', fetchMock);
        const onFill = vi.fn();
        render(<SeoSuggestButton body="<p>Body</p>" title="T" values={empty} onFill={onFill} llmEnabled />);

        fireEvent.click(screen.getByRole('button', { name: 'Suggest from content' }));

        expect(screen.getByRole('button', { name: 'Suggesting…' })).toBeDisabled();

        await waitFor(() => expect(onFill).toHaveBeenCalledTimes(3));
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('/admin/posts/suggest-seo');
        expect(JSON.parse(init.body)).toEqual({ title: 'T', body: '<p>Body</p>' });
        expect(onFill).toHaveBeenCalledWith('excerpt', 'AI excerpt here.');
        expect(screen.getByRole('button', { name: 'Suggest from content' })).toBeEnabled();

        vi.unstubAllGlobals();
    });

    test('falls back to local rules when the request fails', async () => {
        const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
        vi.stubGlobal('fetch', fetchMock);
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const onFill = vi.fn();
        render(<SeoSuggestButton body={BODY} title="Sample Title" values={empty} onFill={onFill} llmEnabled />);

        fireEvent.click(screen.getByRole('button', { name: 'Suggest from content' }));

        await waitFor(() =>
            expect(onFill).toHaveBeenCalledWith('excerpt', expect.stringContaining('This is a body paragraph')),
        );
        expect(warn).toHaveBeenCalled();

        warn.mockRestore();
        vi.unstubAllGlobals();
    });

    test('does not call the network when the llm is disabled', () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        const onFill = vi.fn();
        render(<SeoSuggestButton body={BODY} title="Sample Title" values={empty} onFill={onFill} />);

        fireEvent.click(screen.getByRole('button', { name: 'Suggest from content' }));

        expect(onFill).toHaveBeenCalledTimes(3);
        expect(fetchMock).not.toHaveBeenCalled();

        vi.unstubAllGlobals();
    });

    test('does not overwrite a field the user fills while the request is in flight', async () => {
        let resolveFetch!: (value: unknown) => void;
        const fetchMock = vi.fn(() => new Promise((resolve) => (resolveFetch = resolve)));
        vi.stubGlobal('fetch', fetchMock);
        const onFill = vi.fn();
        const { rerender } = render(
            <SeoSuggestButton body={BODY} title="T" values={empty} onFill={onFill} llmEnabled />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Suggest from content' }));

        rerender(
            <SeoSuggestButton
                body={BODY}
                title="T"
                values={{ ...empty, excerpt: 'Hand written.' }}
                onFill={onFill}
                llmEnabled
            />,
        );

        resolveFetch(
            jsonResponse({
                excerpt: 'AI excerpt.',
                meta_title: 'AI title',
                meta_description: 'AI description.',
            }),
        );

        await waitFor(() => expect(onFill).toHaveBeenCalledTimes(2));
        expect(onFill).not.toHaveBeenCalledWith('excerpt', expect.anything());

        vi.unstubAllGlobals();
    });
});
