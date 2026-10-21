import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BooksGrid } from '@/Pages/Collected/views/BooksGrid';
import { makeItem } from './collectedFixtures';

const books = [
    makeItem({ id: 1, title: 'Thinking in Systems', cover_image: 'https://cdn.example.com/1.jpg', item_type: 'book' }),
    makeItem({ id: 2, title: 'Design of Everyday Things', cover_image: null, item_type: 'book', creator: 'Don Norman', annotation: null }),
];

test('renders the Library rail and the full grid with covers', () => {
    render(<BooksGrid items={books} onOpen={() => {}} />);

    expect(screen.getByRole('region', { name: 'Library' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'All books' })).toBeInTheDocument();
    expect(screen.getAllByAltText('Cover of Thinking in Systems').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DO').length).toBeGreaterThan(0); // serif initials (Design of…)
});

test('tapping an annotated book title opens it', () => {
    const onOpen = vi.fn();
    render(<BooksGrid items={books} onOpen={onOpen} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Thinking in Systems' })[0]);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
});

test('books without annotation link out', () => {
    render(<BooksGrid items={[books[1]]} onOpen={() => {}} />);
    const link = screen.getAllByRole('link', { name: /Design of Everyday Things/ })[0];
    expect(link).toHaveAttribute('target', '_blank');
});
