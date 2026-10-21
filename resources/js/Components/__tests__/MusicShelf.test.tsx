import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MusicShelf } from '@/Pages/Collected/views/MusicShelf';
import { makeItem } from './collectedFixtures';

const tracks = [
    makeItem({ id: 1, title: 'Blue Train', item_type: 'music', creator: 'John Coltrane', cover_image: null }),
    makeItem({ id: 2, title: 'So What', item_type: 'music', creator: 'Miles Davis', cover_image: 'https://cdn.example.com/a.jpg' }),
];

test('renders the Recently added rail and the full grid', () => {
    render(<MusicShelf items={tracks} onOpen={() => {}} />);
    expect(screen.getByRole('region', { name: 'Recently added' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'All music' })).toBeInTheDocument();
    expect(screen.getAllByAltText('Cover of So What').length).toBeGreaterThan(0);
    expect(screen.getAllByText('John Coltrane').length).toBeGreaterThan(0);
});

test('annotated albums open on click', () => {
    const onOpen = vi.fn();
    render(<MusicShelf items={tracks} onOpen={onOpen} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Blue Train' })[0]);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
});
