import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileNav } from '@/Components/MobileNav';

vi.mock('@inertiajs/react', () => ({
    Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

test('opens as a menu popover with all nav links', () => {
    render(<MobileNav current="/" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const menu = screen.getByRole('navigation', { name: 'Menu' });
    expect(menu).toBeInTheDocument();
    expect(menu).toHaveClass('w-56', 'rounded-lg', 'shadow-lg', 'backdrop-blur');
    expect(screen.getAllByRole('link')).toHaveLength(7);
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');
});

test('marks the current page with aria-current and a leading checkmark', () => {
    render(<MobileNav current="/notes" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const current = screen.getByRole('link', { name: /Notes/ });
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current.querySelector('svg.lucide-check')).toBeInTheDocument();
    const other = screen.getByRole('link', { name: /About/ });
    expect(other).not.toHaveAttribute('aria-current');
    expect(other.querySelector('svg.lucide-check')).not.toBeInTheDocument();
});

test('renders a single separator before About', () => {
    render(<MobileNav current="/" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getAllByRole('separator')).toHaveLength(1);
    const links = screen.getAllByRole('link').map((link) => link.textContent?.trim());
    expect(links.indexOf('About') > links.indexOf('Collected')).toBe(true);
});

test('closes on Escape', () => {
    render(<MobileNav current="/" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('navigation', { name: 'Menu' })).not.toBeInTheDocument();
});

test('closes when clicking outside the menu', () => {
    render(<MobileNav current="/" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('navigation', { name: 'Menu' })).not.toBeInTheDocument();
});

test('closes after navigating', () => {
    render(<MobileNav current="/" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(screen.getByRole('link', { name: /Writing/ }));
    expect(screen.queryByRole('navigation', { name: 'Menu' })).not.toBeInTheDocument();
});

test('hover styles use the system blue highlight', () => {
    render(<MobileNav current="/" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const link = screen.getByRole('link', { name: /Home/ });
    expect(link.className).toContain('hover:bg-[#007aff]');
    expect(link.className).toContain('hover:text-white');
});
