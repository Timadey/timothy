import { test, expect, describe, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
