import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@inertiajs/react', () => ({
    Head: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode; onClick?: () => void }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
    router: { get: vi.fn() },
}));
vi.mock('@/Layouts/PublicLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/Components/SearchInput', () => ({
    SearchInput: ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
        <input aria-label={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    ),
}));
vi.mock('@/Pages/Collected/views/EditorialList', () => ({
    EditorialList: ({ items }: { items: { id: number; title: string }[] }) => (
        <ul data-testid="results">
            {items.map((i) => (
                <li key={i.id}>{i.title}</li>
            ))}
        </ul>
    ),
}));

import CollectedIndex from '@/Pages/Collected/Index';
import { makeItem } from './collectedFixtures';
import type { CategoryTile, Paginated } from '@/collectedTypes';

const categories: CategoryTile[] = [
    { type: 'book', label: 'Books', count: 3, href: '/collected/books' },
    { type: 'tool', label: 'Tools', count: 2, href: '/collected/tools' },
];

test('renders category tiles with counts, hrefs and accessible names', () => {
    render(<CollectedIndex categories={categories} items={null} filters={{ q: null }} />);

    const books = screen.getByRole('link', { name: 'Books, 3 items' });
    expect(books).toHaveAttribute('href', '/collected/books');
    expect(screen.getByRole('link', { name: 'Tools, 2 items' })).toHaveAttribute('href', '/collected/tools');
    expect(screen.getByRole('heading', { name: 'Collected' })).toBeInTheDocument();
});

test('shows an empty state when there is nothing to show', () => {
    render(<CollectedIndex categories={[]} items={null} filters={{ q: null }} />);
    expect(screen.getByText('Nothing collected yet')).toBeInTheDocument();
});

test('renders search results with a live count when items are present', () => {
    const items: Paginated<ReturnType<typeof makeItem>> = {
        data: [makeItem({ id: 1, title: 'Hit One' }), makeItem({ id: 2, title: 'Hit Two' })],
        links: [{ url: null, label: '1', active: true }],
        total: 2,
    };
    render(<CollectedIndex categories={categories} items={items} filters={{ q: 'hit' }} />);

    expect(screen.getByText('2 results for “hit”')).toBeInTheDocument();
    expect(screen.getByTestId('results')).toBeInTheDocument();
    expect(screen.getByText('Hit One')).toBeInTheDocument();
    expect(screen.getByLabelText('Search results')).toBeInTheDocument();
});

test('clicking a tile records the launch origin on the document', () => {
    render(<CollectedIndex categories={categories} items={null} filters={{ q: null }} />);
    fireEvent.click(screen.getByRole('link', { name: 'Books, 3 items' }));

    expect(document.documentElement.style.getPropertyValue('--launch-x')).not.toBe('');
    expect(document.documentElement.style.getPropertyValue('--launch-y')).not.toBe('');
});
