import { test, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CoverImage } from '@/Components/collected/CoverImage';

test('renders the cover image when present', () => {
    render(<CoverImage src="https://cdn.example.com/c.jpg" title="Systems Design" kind="book" />);
    const img = screen.getByAltText('Cover of Systems Design');
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/c.jpg');
    expect(img.className).toContain('w-full');
    expect(img.className).toContain('object-cover');
});

test('fits rather than crops when fit is contain', () => {
    render(<CoverImage src="https://cdn.example.com/icon.png" title="Figma" kind="other" fit="contain" />);
    const img = screen.getByAltText('Cover of Figma');
    expect(img.className).toContain('object-contain');
    expect(img.className).not.toContain('object-cover');
});

test('falls back to serif initials when no cover is set', () => {
    render(<CoverImage src={null} title="Systems Design" kind="book" />);
    expect(screen.getByText('SD')).toBeInTheDocument();
});

test('swaps to the placeholder when the image fails to load', () => {
    render(<CoverImage src="https://cdn.example.com/missing.jpg" title="Systems Design" kind="book" />);
    fireEvent.error(screen.getByAltText('Cover of Systems Design'));
    expect(screen.queryByAltText('Cover of Systems Design')).not.toBeInTheDocument();
    expect(screen.getByText('SD')).toBeInTheDocument();
});

test('renders a glyph placeholder when a glyph is given', () => {
    const Glyph = () => <svg data-testid="glyph" />;
    render(<CoverImage src={null} title="Any Title" kind="music" glyph={Glyph} />);
    expect(screen.getByTestId('glyph')).toBeInTheDocument();
});
