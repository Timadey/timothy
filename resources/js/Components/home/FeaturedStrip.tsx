import { Link } from '@inertiajs/react';
import { MetaLine } from '@/Components/MetaLine';
import { formatDate } from './format';

export type FeaturedItem = {
    type: 'writing' | 'project';
    title: string;
    summary: string | null;
    url: string;
    date: string | null;
};

export function FeaturedStrip({ items }: { items: FeaturedItem[] }) {
    if (items.length === 0) {
        return null;
    }

    return (
        <section className="border-t border-hairline bg-surface" aria-labelledby="featured-heading">
            <div className="mx-auto max-w-5xl px-6 py-12">
                <h2 id="featured-heading" className="text-sm font-semibold uppercase tracking-wider text-meta">
                    A few favourites
                </h2>
                <div className="mt-5 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                        <article key={`${item.type}-${item.url}`}>
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-meta">
                                {item.type === 'writing' ? 'Writing' : 'Project'}
                            </span>
                            <Link
                                href={item.url}
                                className="mt-1 block text-lg font-semibold tracking-tight text-ink hover:text-link"
                            >
                                {item.title}
                            </Link>
                            {item.summary && <p className="mt-1 text-sm text-meta line-clamp-3">{item.summary}</p>}
                            {item.date && <MetaLine date={formatDate(item.date)} />}
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
