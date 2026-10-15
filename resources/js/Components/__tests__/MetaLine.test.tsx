import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetaLine } from '../MetaLine';

test('joins type, date, reading time, and trailing items with dots', () => {
    render(<MetaLine type="Article" date="Oct 13, 2026" readingTime={4} items={['Technology', 'Ideas']} />);
    expect(screen.getByText('Article · Oct 13, 2026 · 4 min read · Technology · Ideas')).toBeInTheDocument();
});

test('renders without items, keeping prior behavior', () => {
    render(<MetaLine date="Oct 13, 2026" readingTime={1} />);
    expect(screen.getByText('Oct 13, 2026 · 1 min read')).toBeInTheDocument();
});
