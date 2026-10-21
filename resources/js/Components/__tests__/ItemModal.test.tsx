import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { makeItem } from './collectedFixtures';

vi.mock('@inertiajs/react', () => ({
    Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
    router: { get: vi.fn() },
}));

import { ItemModal } from '@/Components/collected/ItemModal';
import type { CollectedItem } from '@/collectedTypes';

const annotated = makeItem({
    title: 'Thinking in Systems',
    annotation: 'A classic on feedback loops.',
    tags: [{ name: 'Systems', slug: 'systems' }],
});

test('renders dialog content with annotation, tags and a visit button', () => {
    render(<ItemModal item={annotated} onClose={() => {}} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('heading', { name: 'Thinking in Systems' })).toBeInTheDocument();
    expect(screen.getByText('A classic on feedback loops.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Systems' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Read/ })).toHaveAttribute('href', 'https://example.com/item');
});

test('calls onClose on Escape and on backdrop click', () => {
    const onClose = vi.fn();
    const { rerender } = render(<ItemModal item={annotated} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(<ItemModal item={annotated} onClose={onClose} />);
    const backdrop = screen.getByRole('dialog').parentElement as HTMLElement;
    fireEvent.mouseDown(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);
});

function Harness() {
    const [open, setOpen] = useState<CollectedItem | null>(null);
    return (
        <div>
            <button type="button" onClick={() => setOpen(annotated)}>
                open me
            </button>
            <ItemModal item={open} onClose={() => setOpen(null)} />
        </div>
    );
}

test('focuses the dialog on open and restores focus after close', async () => {
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'open me' });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = await screen.findByRole('dialog');
    expect(document.activeElement).toBe(dialog);

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(document.activeElement).toBe(trigger);
});
