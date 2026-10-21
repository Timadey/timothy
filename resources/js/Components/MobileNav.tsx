import { useEffect, useRef, useState } from 'react';
import { Link } from '@inertiajs/react';
import { Check, Menu, X } from 'lucide-react';
import { navItems } from '@/nav';

export function MobileNav({ current }: { current: string }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: PointerEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    return (
        <div ref={rootRef} className="relative md:hidden">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                aria-label={open ? 'Close menu' : 'Open menu'}
                className="rounded-md p-3 text-ink hover:bg-surface"
            >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            {open && (
                <nav
                    aria-label="Menu"
                    className="animate-menu-pop absolute right-0 top-[calc(100%+20px)] z-50 w-56 rounded-lg border border-hairline/70 bg-white/95 p-1.5 shadow-lg backdrop-blur"
                >
                    {navItems.map((item) => {
                        const isCurrent = current === item.href;
                        return (
                            <div key={item.href}>
                                {item.separatorBefore && <div role="separator" className="mx-2 my-1 h-px bg-hairline/70" />}
                                <Link
                                    href={item.href}
                                    onClick={() => setOpen(false)}
                                    aria-current={isCurrent ? 'page' : undefined}
                                    className={`flex items-center gap-2 rounded-md px-3 py-3 text-sm font-medium ${
                                        isCurrent ? 'text-primary' : 'text-ink'
                                    } hover:bg-[#007aff] hover:text-white focus-visible:bg-[#007aff] focus-visible:text-white`}
                                >
                                    <span className="w-4 shrink-0">
                                        {isCurrent && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                                    </span>
                                    {item.label}
                                </Link>
                            </div>
                        );
                    })}
                </nav>
            )}
        </div>
    );
}
