import { Link } from '@inertiajs/react';
import { prefetchOnVisibleRef } from '@/prefetchOnVisible';

export type PageLink = { url: string | null; label: string; active: boolean };

export function Pagination({ links }: { links: PageLink[] }) {
    if (links.length <= 3) return null;
    return (
        <nav className="mt-8 flex flex-wrap gap-1" aria-label="Pagination">
            {links.map((l, i) =>
                l.url ? (
                    <Link
                        key={i}
                        href={l.url}
                        preserveScroll
                        ref={prefetchOnVisibleRef(l.url)}
                        className={`rounded-sm px-3 py-1 text-sm ${
                            l.active ? 'bg-primary text-white' : 'border border-hairline bg-white text-ink hover:bg-surface'
                        }`}
                        dangerouslySetInnerHTML={{ __html: l.label }}
                    />
                ) : (
                    <span
                        key={i}
                        className="px-3 py-1 text-sm text-meta"
                        dangerouslySetInnerHTML={{ __html: l.label }}
                    />
                ),
            )}
        </nav>
    );
}
