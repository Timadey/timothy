import { test, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

vi.mock('@inertiajs/react', () => ({
    Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
        <a href={href} className={className}>
            {children}
        </a>
    ),
}));

import { PostRow } from '../PostRow';

const META = <p className="text-xs text-meta tracking-wide uppercase">Oct 15, 2026 · Notes</p>;

test('renders the headline as a level-3 link with the ink-to-link hover pattern', () => {
    render(<PostRow href="/notes/quiet-note" headline="Quiet note headline" meta={META} />);

    const heading = screen.getByRole('heading', { level: 3, name: 'Quiet note headline' });
    const link = within(heading).getByRole('link');
    expect(link).toHaveAttribute('href', '/notes/quiet-note');
    expect(link.className).toContain('text-ink');
    expect(link.className).toContain('hover:text-link');
});

test('renders the meta line and teaser, but no interactive buttons', () => {
    const { container } = render(
        <PostRow href="/writing/post" headline="A post" meta={META} excerpt="The teaser text." />,
    );

    expect(screen.getByText('Oct 15, 2026 · Notes')).toBeInTheDocument();
    expect(screen.getByText('The teaser text.')).toBeInTheDocument();
    expect(within(container).queryByRole('button')).not.toBeInTheDocument();
});

test('omits the teaser paragraph when no excerpt is given', () => {
    render(<PostRow href="/notes/x" headline="Only headline" meta={META} />);

    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    expect(screen.queryByText(/teaser/i)).not.toBeInTheDocument();
});
