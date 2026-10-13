import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Menu, X, ExternalLink } from 'lucide-react';

const items = [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Posts', href: '/admin/posts' },
    { label: 'Projects', href: '/admin/projects' },
    { label: 'Collected', href: '/admin/collected' },
    { label: 'Now', href: '/admin/now' },
    { label: 'About', href: '/admin/about' },
    { label: 'Social', href: '/admin/social' },
    { label: 'Tags & Topics', href: '/admin/tags' },
    { label: 'Settings', href: '/admin/settings' },
];

export default function AdminLayout({ children, title }: { children: React.ReactNode; title: string }) {
    const { url } = usePage();
    const current = url.split('?')[0];
    const [open, setOpen] = useState(false);

    const nav = (
        <nav className="flex flex-col gap-1" aria-label="Admin">
            {items.map((item) => {
                const active =
                    current === item.href || (item.href !== '/admin' && current.startsWith(item.href));
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`rounded-sm px-3 py-2 text-sm font-medium ${
                            active ? 'bg-primary text-white' : 'text-ink hover:bg-surface'
                        }`}
                    >
                        {item.label}
                    </Link>
                );
            })}
            <Link
                href="/"
                className="mt-4 flex items-center gap-1 rounded-sm px-3 py-2 text-sm text-meta hover:text-ink"
            >
                View site <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <Link
                href="/admin/logout"
                method="post"
                as="button"
                type="button"
                className="rounded-sm px-3 py-2 text-left text-sm text-meta hover:text-ink"
            >
                Sign out
            </Link>
        </nav>
    );

    return (
        <div className="min-h-screen bg-surface">
            <header className="flex items-center justify-between border-b border-hairline bg-white px-4 py-3 md:hidden">
                <span className="font-semibold tracking-tight">Timadey Admin</span>
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    aria-label="Toggle menu"
                    aria-expanded={open}
                    className="p-2"
                >
                    {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </header>
            {open && (
                <div className="border-b border-hairline bg-white p-3 md:hidden">{nav}</div>
            )}
            <div className="mx-auto flex max-w-6xl">
                <aside className="hidden w-56 shrink-0 border-r border-hairline bg-white p-4 md:block md:min-h-screen">
                    <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-meta">
                        Timadey
                    </p>
                    {nav}
                </aside>
                <main className="flex-1 p-6 md:p-8">
                    <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                    <div className="mt-6">{children}</div>
                </main>
            </div>
        </div>
    );
}
