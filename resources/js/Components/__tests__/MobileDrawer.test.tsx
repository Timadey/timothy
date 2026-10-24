import { test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileDrawer } from '@/Components/MobileDrawer';

vi.mock('@inertiajs/react', () => ({
    Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

function setScrollY(y: number) {
    Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true });
}

beforeEach(() => {
    setScrollY(0);
    document.body.style.overflow = '';
});

test('renders a grid-orb trigger that opens the drawer with all nav links', () => {
    render(<MobileDrawer current="/" />);

    const trigger = screen.getByRole('button', { name: 'Open menu' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);

    const menu = screen.getByRole('navigation', { name: 'Menu' });
    expect(menu).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(7);
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');
});

test('marks the current page with aria-current on its tile', () => {
    render(<MobileDrawer current="/notes" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(screen.getByRole('link', { name: /Notes/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /About/ })).not.toHaveAttribute('aria-current');
});

test('closes on Escape', () => {
    render(<MobileDrawer current="/" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('button', { name: 'Close menu' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false');
});

test('closes when the backdrop is clicked', () => {
    render(<MobileDrawer current="/" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(screen.getByTestId('drawer-backdrop'));

    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false');
});

test('closes after navigating', () => {
    render(<MobileDrawer current="/" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(screen.getByRole('link', { name: /Writing/ }));

    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false');
});

test('locks body scroll while open and releases on close', () => {
    render(<MobileDrawer current="/" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.body.style.overflow).toBe('');
});

test('hides the trigger on scroll up, shows it on scroll down and at the top', () => {
    render(<MobileDrawer current="/" />);
    const trigger = screen.getByRole('button', { name: 'Open menu' });

    expect(trigger.className).not.toContain('opacity-0');

    setScrollY(300);
    fireEvent.scroll(window);
    expect(trigger.className).not.toContain('opacity-0');

    setScrollY(240);
    fireEvent.scroll(window);
    expect(trigger.className).toContain('opacity-0');

    setScrollY(0);
    fireEvent.scroll(window);
    expect(trigger.className).not.toContain('opacity-0');
});

test('keeps the trigger visible while the drawer is open', () => {
    render(<MobileDrawer current="/" />);
    const trigger = screen.getByRole('button', { name: 'Open menu' });

    setScrollY(400);
    fireEvent.scroll(window);
    setScrollY(300);
    fireEvent.scroll(window);
    expect(trigger.className).toContain('opacity-0');

    setScrollY(250);
    fireEvent.scroll(window);
    fireEvent.click(trigger);
    expect(trigger.className).not.toContain('opacity-0');
    expect(trigger.className).not.toContain('pointer-events-none');
});
