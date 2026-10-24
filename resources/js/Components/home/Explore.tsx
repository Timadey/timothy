import { Link } from '@inertiajs/react';

type Row = {
    label: string;
    hint: string;
    count: number | null;
    href: string;
};

export function Explore({ projects, collected }: { projects: number; collected: number }) {
    const rows: Row[] = [
        { label: 'Projects', hint: 'Things I’ve built and kept alive', count: projects, href: '/projects' },
        { label: 'Collected', hint: 'Links I’m keeping close', count: collected, href: '/collected' },
        { label: 'Activity', hint: 'Everything I’ve been up to, newest first', count: null, href: '/activity' },
    ];

    return (
        <section className="mx-auto max-w-5xl px-6 py-12 md:border-t md:border-hairline" aria-labelledby="explore-heading">
            <h2 id="explore-heading" className="text-sm font-semibold uppercase tracking-wider text-meta">
                More to explore
            </h2>
            <ul className="mt-4 divide-y divide-hairline border-t border-hairline">
                {rows.map((row) => (
                    <li key={row.href}>
                        <Link href={row.href} className="group flex items-baseline justify-between gap-6 py-4">
                            <span className="flex flex-wrap items-baseline gap-x-3">
                                <span className="text-base font-medium text-ink transition-colors group-hover:text-link">
                                    {row.label}
                                </span>
                                <span className="text-sm text-meta">{row.hint}</span>
                            </span>
                            <span className="flex shrink-0 items-baseline gap-2 text-sm text-meta">
                                {row.count !== null && <span className="tabular-nums">{row.count}</span>}
                                <span aria-hidden="true" className="transition-colors group-hover:text-link">
                                    →
                                </span>
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}
