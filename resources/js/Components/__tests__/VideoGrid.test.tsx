import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoGrid } from '@/Pages/Collected/views/VideoGrid';
import { makeItem } from './collectedFixtures';

const withCover = makeItem({ id: 1, title: 'Product Talk', item_type: 'video', cover_image: 'https://cdn.example.com/v.jpg' });
const noCover = makeItem({ id: 2, title: 'No Cover Talk', item_type: 'video', cover_image: null, annotation: 'watch me' });

test('renders a 16:9 tile with the cover and the title scrim', () => {
    render(<VideoGrid items={[withCover]} onOpen={() => {}} />);
    expect(screen.getByAltText('Cover of Product Talk')).toBeInTheDocument();
    expect(screen.getAllByText('Product Talk').length).toBeGreaterThan(0);
});

test('renders the play glyph placeholder without a cover', () => {
    render(<VideoGrid items={[noCover]} onOpen={() => {}} />);
    expect(screen.queryByAltText('Cover of No Cover Talk')).not.toBeInTheDocument();
    expect(screen.getAllByText('No Cover Talk').length).toBeGreaterThan(0);
});

test('annotated videos open the modal, plain videos link out', () => {
    const onOpen = vi.fn();
    const { rerender } = render(<VideoGrid items={[noCover]} onOpen={onOpen} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'No Cover Talk' })[0]);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));

    rerender(<VideoGrid items={[{ ...noCover, annotation: null }]} onOpen={onOpen} />);
    expect(screen.getAllByRole('link', { name: /No Cover Talk/ })[0]).toHaveAttribute('target', '_blank');
});
