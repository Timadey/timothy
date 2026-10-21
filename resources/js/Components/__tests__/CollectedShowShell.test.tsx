import { test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@inertiajs/react', () => ({
    Head: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
    router: { get: vi.fn() },
}));
vi.mock('@/Layouts/PublicLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import CollectedShow from '@/Pages/Collected/Show';
import { makeItem } from './collectedFixtures';
import type { Paginated } from '@/collectedTypes';

const items: Paginated<ReturnType<typeof makeItem>> = {
    data: [
        makeItem({ id: 1, title: 'First Other', item_type: 'other' }),
        makeItem({ id: 2, title: 'Second Other', item_type: 'other', annotation: null }),
    ],
    links: [
        { url: null, label: '&laquo; Previous', active: false },
        { url: '/collected/others?page=1', label: '1', active: true },
        { url: null, label: 'Next &raquo;', active: false },
    ],
    total: 2,
};

test('renders the shell header, count, back link and fallback view', () => {
    render(
        <CollectedShow type="other" label="Other" segment="others" items={items} tags={[]} filters={{ tag: null }} />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Other' })).toBeInTheDocument();
    expect(screen.getByText('2 items')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Collected' })).toHaveAttribute('href', '/collected');
    expect(screen.getByRole('button', { name: 'First Other' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Second Other/ })).toBeInTheDocument();
});

test('renders tag chips with the active state', () => {
    render(
        <CollectedShow
            type="other"
            label="Other"
            segment="others"
            items={items}
            tags={[{ label: 'Systems', slug: 'systems' }]}
            filters={{ tag: 'systems' }}
        />,
    );

    const tags = screen.getByRole('navigation', { name: 'Filter by tag' });
    expect(tags).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Systems' }).className).toContain('bg-primary');
    expect(screen.getByRole('link', { name: 'All' })).toHaveAttribute('href', '/collected/others');
});

test('shows an empty state instead of the view when the tag matches nothing', () => {
    render(
        <CollectedShow
            type="other"
            label="Other"
            segment="others"
            items={{ ...items, data: [], total: 0 }}
            tags={[]}
            filters={{ tag: 'missing' }}
        />,
    );

    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
});
