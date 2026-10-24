import { test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@inertiajs/react', () => ({
    Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
        <a href={href}>{children}</a>
    ),
}));

import { Hero } from '../home/Hero';

const base = {
    headline: "Hey, I'm Timadey.",
    role: 'Design Engineer',
    company: 'Striped',
    company_url: 'https://striped.test',
    status: 'Rebuilding billing',
    avatar_url: null as string | null,
    logo_url: null as string | null,
    initials: 'TS',
};

test('renders headline, role/company byline, and status', () => {
    render(<Hero hero={base} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent("Hey, I'm Timadey.");
    expect(screen.getByText('Design Engineer')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Striped' })).toHaveAttribute('href', 'https://striped.test');
    expect(screen.getByText('Rebuilding billing')).toBeInTheDocument();
});

test('renders hero call-to-action links', () => {
    render(<Hero hero={base} />);
    expect(screen.getByRole('link', { name: 'Ask me anything' })).toHaveAttribute('href', '/ask');
    expect(screen.getByRole('link', { name: /Read what I/ })).toHaveAttribute('href', '/writing');
});

test('shows initials when no avatar', () => {
    render(<Hero hero={base} />);
    expect(screen.getByText('TS')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
});

test('renders avatar and logo images when provided', () => {
    const { container } = render(
        <Hero hero={{ ...base, avatar_url: '/storage/hero/a.png', logo_url: '/storage/hero/logo.png' }} />,
    );
    const images = container.querySelectorAll('img');
    expect(images[0]).toHaveAttribute('src', '/storage/hero/a.png');
    expect(images[1]).toHaveAttribute('src', '/storage/hero/logo.png');
});

test('company without url renders as plain text', () => {
    render(<Hero hero={{ ...base, company_url: null }} />);
    expect(screen.getByText('Striped')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Striped' })).not.toBeInTheDocument();
});

test('omits byline and status when empty', () => {
    render(<Hero hero={{ ...base, role: null, company: null, status: null }} />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText('Design Engineer')).not.toBeInTheDocument();
    expect(screen.queryByText('@')).not.toBeInTheDocument();
});
