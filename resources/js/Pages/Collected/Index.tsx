import PublicLayout from '@/Layouts/PublicLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { SearchInput } from '@/Components/SearchInput';
import { Pagination } from '@/Components/Pagination';
import { EmptyState } from '@/Components/EmptyState';
import { ItemModal } from '@/Components/collected/ItemModal';
import { TrafficLights } from '@/Components/WindowChrome';
import { EditorialList } from '@/Pages/Collected/views/EditorialList';
import { TYPE_GLYPHS, type CategoryTile, type CollectedItem, type Paginated } from '@/collectedTypes';

type Props = {
    categories: CategoryTile[];
    items: Paginated<CollectedItem> | null;
    filters: { q: string | null };
};

export default function CollectedIndex({ categories, items, filters }: Props) {
    const [q, setQ] = useState(filters.q ?? '');
    const [open, setOpen] = useState<CollectedItem | null>(null);
    const [pushing, setPushing] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => setQ(filters.q ?? ''), [filters.q]);
    useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current);
    }, []);

    const onSearch = (next: string) => {
        setQ(next);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            router.get('/collected', { q: next || undefined }, { preserveState: true, preserveScroll: true });
        }, 300);
    };

    const launchFrom = (event: React.MouseEvent<Element>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const root = document.documentElement;
        root.style.setProperty('--launch-x', `${rect.left + rect.width / 2}px`);
        root.style.setProperty('--launch-y', `${rect.top + rect.height / 2}px`);
        setPushing(true);
    };

    return (
        <PublicLayout>
            <Head>
                <title>Collected — Timadey</title>
                <meta name="description" content="Books, articles, videos, and tools I keep coming back to." />
                <meta property="og:type" content="website" />
                <meta property="og:title" content="Collected — Timadey" />
                <meta property="og:description" content="Books, articles, videos, and tools I keep coming back to." />
                <meta property="og:url" content="/collected" />
                <link rel="canonical" href="/collected" />
                <meta name="twitter:card" content="summary" />
            </Head>
            <div className="mx-auto max-w-4xl px-4 pt-10 pb-16 sm:px-6">
                <h1 className="text-3xl font-semibold tracking-tight">Collected</h1>
                <p className="mt-2 text-meta">Books, articles, videos, and tools I keep coming back to.</p>

                <div className={`mt-8 overflow-hidden rounded-xl border border-hairline bg-white ${pushing ? 'animate-pushback' : ''}`}>
                    <div className="relative flex h-10 items-center border-b border-hairline bg-[#f6f6f6] px-4">
                        <TrafficLights />
                        <span className="pointer-events-none absolute inset-x-0 text-center text-sm font-medium text-ink">
                            Collected
                        </span>
                    </div>

                    <div className="px-4 py-5 sm:px-6">
                        <div className="max-w-sm">
                            <SearchInput value={q} onChange={onSearch} placeholder="Search collection" />
                        </div>

                        {categories.length === 0 && items === null && (
                            <div className="mt-6">
                                <EmptyState title="Nothing collected yet" hint="Categories will appear here once there's something to show." />
                            </div>
                        )}

                        <ul className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4 sm:gap-6 lg:grid-cols-6" aria-label="Categories">
                            {categories.map((category, index) => {
                                const Glyph = TYPE_GLYPHS[category.type];
                                return (
                                    <li key={category.type} className="animate-tile-in" style={{ animationDelay: `${index * 35}ms` }}>
                                        <Link
                                            href={category.href}
                                            onClick={launchFrom}
                                            aria-label={`${category.label}, ${category.count} items`}
                                            className="group flex flex-col items-center gap-2 rounded-md p-2 transition hover:bg-surface/80"
                                        >
                                            <span className="relative">
                                                <span className="flex h-16 w-16 items-center justify-center rounded-[10px] border border-hairline bg-surface transition group-hover:border-meta/60 sm:h-[72px] sm:w-[72px]">
                                                    <Glyph className="h-7 w-7 text-ink" strokeWidth={1.5} aria-hidden="true" />
                                                </span>
                                                <span className="absolute -right-2 -top-2 min-w-5 rounded-full border border-hairline bg-white px-1.5 py-px text-center text-[10px] font-medium leading-4 text-meta">
                                                    {category.count}
                                                </span>
                                            </span>
                                            <span className="text-center text-sm text-ink">{category.label}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>

                        {items && (
                            <section className="mt-8 border-t border-hairline pt-6" aria-label="Search results" aria-live="polite">
                                <p className="text-sm text-meta">
                                    {items.total} {items.total === 1 ? 'result' : 'results'} for “{filters.q}”
                                </p>
                                <div className="mt-2">
                                    {items.data.length > 0 ? (
                                        <EditorialList items={items.data} onOpen={setOpen} lead={false} />
                                    ) : (
                                        <EmptyState title="No matches" hint="Try different words." />
                                    )}
                                </div>
                                <Pagination links={items.links} />
                            </section>
                        )}
                    </div>
                </div>
            </div>
            <ItemModal item={open} onClose={() => setOpen(null)} />
        </PublicLayout>
    );
}
