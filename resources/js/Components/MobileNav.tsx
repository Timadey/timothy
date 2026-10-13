import { useState } from 'react';
import { Link } from '@inertiajs/react';
import { Menu, X } from 'lucide-react';
import { navItems } from '@/nav';

export function MobileNav({ current }: { current: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="md:hidden">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                aria-label={open ? 'Close menu' : 'Open menu'}
                className="rounded-md p-2 text-ink hover:bg-surface"
            >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            {open && (
                <nav className="absolute inset-x-0 top-14 z-40 border-b border-hairline bg-white px-6 py-4 md:hidden" aria-label="Mobile">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className={`block py-2 text-sm font-medium ${
                                current === item.href ? 'text-primary' : 'text-ink hover:text-link'
                            }`}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>
            )}
        </div>
    );
}
