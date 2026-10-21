import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditorialList } from '@/Pages/Collected/views/EditorialList';
import { makeItem } from './collectedFixtures';

const lead = makeItem({ id: 1, title: 'Lead Story', annotation: 'Featured note.', item_type: 'article' });
const row = makeItem({ id: 2, title: 'Second Story', annotation: 'Row note.', item_type: 'article', date: 'Oct 2, 2026' });
const external = makeItem({ id: 3, title: 'No Note', annotation: null, url: 'https://example.com/read', item_type: 'article' });

test('renders the first item as a serif lead story', () => {
    render(<EditorialList items={[lead, row]} onOpen={() => {}} />);
    expect(screen.getByRole('button', { name: 'Lead Story' }).className).toContain('font-serif');
    expect(screen.getByText('Featured note.')).toBeInTheDocument();
});

test('clicking an annotated title calls onOpen with the item', () => {
    const onOpen = vi.fn();
    render(<EditorialList items={[lead, row]} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'Second Story' }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 2, title: 'Second Story' }));
});

test('items without an annotation link out instead of opening', () => {
    render(<EditorialList items={[external]} onOpen={() => {}} lead={false} />);
    const link = screen.getByRole('link', { name: /No Note/ });
    expect(link).toHaveAttribute('href', 'https://example.com/read');
    expect(link).toHaveAttribute('target', '_blank');
});

test('lead=false renders every item as an equal row', () => {
    render(<EditorialList items={[lead, row]} onOpen={() => {}} lead={false} />);
    expect(screen.getByRole('button', { name: 'Lead Story' }).className).not.toContain('font-serif');
    expect(screen.getByRole('button', { name: 'Second Story' })).toBeInTheDocument();
});
