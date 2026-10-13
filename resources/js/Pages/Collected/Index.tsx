import PublicLayout from '@/Layouts/PublicLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import { SearchInput } from '@/Components/SearchInput';
import { FilterBar } from '@/Components/FilterBar';
import { Pagination } from '@/Components/Pagination';
import { EmptyState } from '@/Components/EmptyState';

type Item = {
    title: string;
    url: string | null;
    creator: string | null;
    item_type: string;
    annotation: string | null;
    date: string;
    tags: string[];
};

type Paginated = { data: Item[]; links: { url: string | null; label: string; active: boolean }[] };
type Filters = { type?: string; q?: string; tag?: string };
type TypeOption = { value: string; label: string };

export default function CollectedIndex({ items, types, filters }: { items: Paginated; types: TypeOption[]; filters: Filters }) {
    const [q, setQ] = useState(filters.q ?? '');

    const apply = (patch: Record<string, string | undefined>) =>
        router.get('/collected', { ...filters, q: q || undefined, ...patch }, { preserveState: true, preserveScroll: true });

    return (
        <PublicLayout>
            <div className="mx-auto max-w-3xl px-6 pt-12 pb-16">
                <h1 className="text-3xl font-semibold tracking-tight">Collected</h1>
                <p className="mt-2 text-meta">Books, articles, videos, and tools I keep coming back to.</p>

                <div className="mt-8 flex flex-col gap-4">
                    <div className="max-w-sm">
                        <SearchInput value={q} onChange={setQ} placeholder="Search collection" />
                    </div>
                    <FilterBar
                        options={types}
                        active={filters.type ?? ''}
                        onSelect={(v) => apply({ type: v || undefined })}
                        allLabel="Everything"
                    />
                </div>

                <div className="mt-10 divide-y divide-hairline">
                    {items.data.map((item) => (
                        <article key={`${item.item_type}-${item.title}`} className="py-5">
                            <div className="flex flex-wrap items-baseline gap-x-3">
                                <span className="text-xs font-semibold uppercase tracking-wide text-meta">{item.item_type}</span>
                                <span className="text-xs text-meta">{item.date}</span>
                            </div>
                            {item.url ? (
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 block text-lg font-medium hover:text-link"
                                >
                                    {item.title} ↗
                                </a>
                            ) : (
                                <p className="mt-1 text-lg font-medium">{item.title}</p>
                            )}
                            {item.creator && <p className="mt-0.5 text-sm text-meta">{item.creator}</p>}
                            {item.annotation && <p className="mt-2 max-w-2xl text-sm text-ink">{item.annotation}</p>}
                            {item.tags.length > 0 && <p className="mt-2 text-xs text-meta">{item.tags.join(' · ')}</p>}
                        </article>
                    ))}
                    {items.data.length === 0 && (
                        <div className="py-8">
                            <EmptyState title="Nothing collected yet" hint="Try a different search or type." />
                        </div>
                    )}
                </div>

                <Pagination links={items.links} />
            </div>
        </PublicLayout>
    );
}
