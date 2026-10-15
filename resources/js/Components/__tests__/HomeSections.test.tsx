import { test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@inertiajs/react', () => ({
    Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
        <a href={href}>{children}</a>
    ),
}));

import { FeaturedStrip } from '../home/FeaturedStrip';
import { Explore } from '../home/Explore';
import { WritingList } from '../home/WritingList';

test('featured strip renders nothing when empty', () => {
    const { container } = render(<FeaturedStrip items={[]} />);
    expect(container.firstChild).toBeNull();
});

test('featured strip renders writing and project items', () => {
    render(
        <FeaturedStrip
            items={[
                { type: 'writing', title: 'Essay', summary: 'Sum.', url: '/writing/essay', date: '2026-10-01T00:00:00Z' },
                { type: 'project', title: 'App', summary: null, url: '/projects/app', date: null },
            ]}
        />,
    );
    expect(screen.getByText('Writing')).toBeInTheDocument();
    expect(screen.getByText('Project')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Essay' })).toHaveAttribute('href', '/writing/essay');
    expect(screen.getByRole('link', { name: 'App' })).toHaveAttribute('href', '/projects/app');
});

test('explore rows show live counts and link out', () => {
    render(<Explore projects={7} collected={3} />);
    expect(screen.getByRole('link', { name: /Projects/ })).toHaveAttribute('href', '/projects');
    expect(screen.getByRole('link', { name: /Collected/ })).toHaveAttribute('href', '/collected');
    expect(screen.getByRole('link', { name: /Activity/ })).toHaveAttribute('href', '/activity');
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
});

test('writing list renders items and all-writing link', () => {
    render(
        <WritingList
            writings={[
                { slug: 'hello', title: 'Hello World', excerpt: 'An excerpt.', reading_time: 4, date: 'Oct 1, 2026' },
            ]}
        />,
    );
    expect(screen.getByRole('link', { name: 'Hello World' })).toHaveAttribute('href', '/writing/hello');
    expect(screen.getByText('An excerpt.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'All writing' })).toHaveAttribute('href', '/writing');
});

test('writing list shows empty hint when nothing published', () => {
    render(<WritingList writings={[]} />);
    expect(screen.getByText(/Nothing published yet/)).toBeInTheDocument();
});
