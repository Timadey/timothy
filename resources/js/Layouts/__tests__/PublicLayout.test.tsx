import { test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PublicLayout from '@/Layouts/PublicLayout';

vi.mock('@inertiajs/react', () => ({
    Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
    usePage: () => ({ url: '/', props: {} }),
}));

function setScrollY(y: number) {
    Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true });
}

beforeEach(() => {
    setScrollY(0);
});

test('header hides while scrolling down, returns on scroll up and at the top', () => {
    render(
        <PublicLayout>
            <div>content</div>
        </PublicLayout>,
    );
    const header = screen.getByRole('banner');

    expect(header.className).not.toContain('-translate-y-full');

    setScrollY(500);
    fireEvent.scroll(window);
    expect(header.className).toContain('-translate-y-full');

    setScrollY(430);
    fireEvent.scroll(window);
    expect(header.className).not.toContain('-translate-y-full');

    setScrollY(0);
    fireEvent.scroll(window);
    expect(header.className).not.toContain('-translate-y-full');
});

test('header stays visible within the top zone even while scrolling down', () => {
    render(
        <PublicLayout>
            <div>content</div>
        </PublicLayout>,
    );
    const header = screen.getByRole('banner');

    setScrollY(600);
    fireEvent.scroll(window);
    expect(header.className).toContain('-translate-y-full');

    setScrollY(660);
    fireEvent.scroll(window);
    expect(header.className).toContain('-translate-y-full');

    setScrollY(640);
    fireEvent.scroll(window);
    expect(header.className).not.toContain('-translate-y-full');

    setScrollY(60);
    fireEvent.scroll(window);
    expect(header.className).not.toContain('-translate-y-full');
});
