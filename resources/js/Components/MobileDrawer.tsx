import { useEffect, useRef, useState } from 'react';
import { Link } from '@inertiajs/react';
import { X } from 'lucide-react';
import { navItems } from '@/nav';
import { useScrollAwareVisibility } from '@/scrollVisibility';

function NavIcon({ href, className }: { href: string; className?: string }) {
    const shared = {
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
        'aria-hidden': true,
    };

    if (href === '/') {
        return (
            <svg viewBox="0 0 24 24" className={className} {...shared}>
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <path d="M9 22V12h6v10" />
            </svg>
        );
    }
    if (href === '/writing') {
        return (
            <svg viewBox="0 0 24 24" className={className} {...shared}>
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
        );
    }
    if (href === '/notes') {
        return (
            <svg viewBox="0 0 24 24" className={className} {...shared}>
                <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9.5L21 14.5V5a2 2 0 0 0-2-2Z" />
                <path d="M15 21v-5a1 1 0 0 1 1-1h5" />
            </svg>
        );
    }
    if (href === '/projects') {
        return (
            <svg viewBox="0 0 24 24" className={className} {...shared}>
                <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
            </svg>
        );
    }
    if (href === '/collected') {
        return (
            <svg viewBox="0 0 24 24" className={className} {...shared}>
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
            </svg>
        );
    }
    if (href === '/about') {
        return (
            <svg viewBox="0 0 24 24" className={className} {...shared}>
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 24 24" className={className} {...shared}>
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        </svg>
    );
}

function GridOrbIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
            <circle cx="5" cy="5" r="1.7" />
            <circle cx="12" cy="5" r="1.7" />
            <circle cx="19" cy="5" r="1.7" />
            <circle cx="5" cy="12" r="1.7" />
            <circle cx="12" cy="12" r="1.7" />
            <circle cx="19" cy="12" r="1.7" />
            <circle cx="5" cy="19" r="1.7" />
            <circle cx="12" cy="19" r="1.7" />
            <circle cx="19" cy="19" r="1.7" />
        </svg>
    );
}

export function MobileDrawer({ current }: { current: string }) {
    const [open, setOpen] = useState(false);
    const visible = useScrollAwareVisibility();
    const drawerRef = useRef<HTMLElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const wasOpen = useRef(false);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', onKeyDown);
        document.body.style.overflow = 'hidden';
        const focusFrame = requestAnimationFrame(() => drawerRef.current?.focus());
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = '';
            cancelAnimationFrame(focusFrame);
        };
    }, [open]);

    useEffect(() => {
        if (!open && wasOpen.current) triggerRef.current?.focus({ preventScroll: true });
        wasOpen.current = open;
    }, [open]);

    const close = () => setOpen(false);

    return (
        <div className="md:hidden">
            <div
                className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`}
                aria-hidden={!open}
            >
                <div
                    data-testid="drawer-backdrop"
                    onClick={close}
                    className={`absolute inset-0 bg-[#0e0e11]/55 backdrop-blur-md transition-opacity duration-300 ${
                        open ? 'opacity-100' : 'opacity-0'
                    }`}
                />
                <nav
                    ref={drawerRef}
                    tabIndex={-1}
                    aria-label="Menu"
                    aria-hidden={!open}
                    className={`absolute left-1/2 bottom-[calc(130px+env(safe-area-inset-bottom))] w-[318px] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-3xl border border-white/85 bg-white/80 p-3.5 shadow-[0_24px_60px_rgba(0,0,0,0.35)] outline-none backdrop-blur-2xl transition-[opacity,transform] duration-300 ${
                        open
                            ? 'translate-y-0 scale-100 opacity-100'
                            : 'pointer-events-none translate-y-5 scale-[0.72] opacity-0'
                    }`}
                >
                    <div className="mb-3 flex items-center justify-center gap-2 pb-0.5 pt-1.5">
                        <img src="/images/logo-mark.png" alt="" width={22} height={22} className="rounded-md" />
                        <span className="text-[13px] font-bold tracking-tight text-ink">Timadey</span>
                    </div>
                    <ul className="grid grid-cols-4 gap-x-1.5 gap-y-3.5 pt-1.5">
                        {navItems.map((item, index) => {
                            const isCurrent = current === item.href;
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        onClick={close}
                                        aria-current={isCurrent ? 'page' : undefined}
                                        className={`flex flex-col items-center gap-1.5 outline-none transition-[opacity,transform] duration-300 ${
                                            open
                                                ? 'translate-y-0 scale-100 opacity-100'
                                                : 'pointer-events-none translate-y-2.5 scale-90 opacity-0'
                                        }`}
                                        style={{ transitionDelay: open ? `${index * 40}ms` : '0ms' }}
                                    >
                                        <span
                                            className={`grid h-[54px] w-[54px] place-items-center rounded-[17px] ${
                                                isCurrent
                                                    ? 'bg-black text-white'
                                                    : 'bg-surface text-ink shadow-[inset_0_0_0_1px_rgba(210,210,215,0.55)]'
                                            }`}
                                        >
                                            <NavIcon href={item.href} className="h-6 w-6" />
                                        </span>
                                        <span
                                            className={`text-[10.5px] leading-none ${
                                                isCurrent ? 'font-extrabold text-ink' : 'font-semibold text-meta'
                                            }`}
                                        >
                                            {item.label}
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </div>

            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                aria-label={open ? 'Close menu' : 'Open menu'}
                className={`fixed left-1/2 z-50 grid -translate-x-1/2 place-items-center rounded-full bg-black text-white shadow-[0_12px_28px_rgba(0,0,0,0.4)] transition-[opacity,transform,width,height,bottom] duration-300 ${
                    open
                        ? 'bottom-[calc(52px+env(safe-area-inset-bottom))] h-11 w-11 opacity-100'
                        : !visible
                          ? 'pointer-events-none h-[54px] w-[54px] translate-y-4 bottom-[calc(44px+env(safe-area-inset-bottom))] opacity-0'
                          : 'h-[54px] w-[54px] bottom-[calc(44px+env(safe-area-inset-bottom))] opacity-100'
                }`}
            >
                {open ? (
                    <X className="h-5 w-5" aria-hidden="true" />
                ) : (
                    <GridOrbIcon className="h-[22px] w-[22px]" />
                )}
            </button>
        </div>
    );
}
