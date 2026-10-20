import { test, expect } from 'vitest';
import { navItems } from '../../nav';

test('does not link the now page from the primary navigation', () => {
    expect(navItems.some((item) => item.href === '/now')).toBe(false);
});
