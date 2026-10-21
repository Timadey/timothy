import PublicLayout from '@/Layouts/PublicLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { EmptyState } from '@/Components/EmptyState';
import { Pagination } from '@/Components/Pagination';
import { Tag } from '@/Components/Tag';
import { ItemModal } from '@/Components/collected/ItemModal';
import { TrafficLights } from '@/Components/WindowChrome';
import { prefersReducedMotion } from '@/motion';
import type { CollectedItem, ItemType, Paginated } from '@/collectedTypes';
import { resolveView } from './views/registry';

type Props = {
    type: ItemType;
    label: string;
    segment: string;
    items: Paginated<CollectedItem>;
    tags: { label: string; slug: string }[];
    filters: { tag?: string | null };
};

export default function CollectedShow({ type, label, segment, items, tags, filters }: Props) {
    const [open, setOpen] = useState<CollectedItem | null>(null);
    const shellRef = useRef<HTMLDivElement>(null);

    const launchClass =
        typeof document !== 'undefined' && document.documentElement.style.getPropertyValue('--launch-x')
            ? 'animate-page-launch'
            : '';

    useEffect(() => {
        if (!launchClass) return;
        const root = document.documentElement;
        const timer = window.setTimeout(() => {
            root.style.removeProperty('--launch-x');
            root.style.removeProperty('--launch-y');
        }, 600);
        return () => window.clearTimeout(timer);
    }, [launchClass]);

    const goBack = (event: React.MouseEvent<Element>) => {
        if (prefersReducedMotion()) return;
        event.preventDefault();
        shellRef.current?.classList.add('animate-page-leave');
        window.setTimeout(() => router.get('/collected'), 200);
    };

    const View = resolveView(type);

    return (
        <PublicLayout>
            <Head>
                <title>{`${label} — Collected — Timadey`}</title>
                <meta name="description" content={`Things I've collected: ${label.toLowerCase()}.`} />
                <link rel="canonical" href={`/collected/${segment}`} />
                <meta property="og:type" content="website" />
                <meta property="og:title" content={`${label} — Collected — Timadey`} />
                <meta name="twitter:card" content="summary" />
            </Head>
            <div ref={shellRef} className={`mx-auto max-w-5xl px-6 pt-10 pb-16 ${launchClass}`}>
                <div className="overflow-hidden rounded-xl border border-hairline bg-white">
                    <div className="relative flex h-10 items-center border-b border-hairline bg-[#f6f6f6] px-4">
                        <div className="flex items-center gap-3">
                            <TrafficLights />
                            <Link
                                href="/collected"
                                onClick={goBack}
                                aria-label="Back to Collected"
                                className="inline-flex h-6 w-6 items-center justify-center rounded text-ink hover:bg-black/5"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                            </Link>
                        </div>
                        <h1 className="pointer-events-none absolute inset-x-0 text-center text-sm font-medium text-ink">{label}</h1>
                        <span className="ml-auto text-xs text-meta">
                            {items.total} {items.total === 1 ? 'item' : 'items'}
                        </span>
                    </div>

                    <div className="px-4 py-5 sm:px-6">
                        {tags.length > 0 && (
                            <nav className="flex flex-wrap gap-2" aria-label="Filter by tag">
                                <Tag label="All" href={`/collected/${segment}`} active={!filters.tag} />
                                {tags.map((tag) => (
                                    <Tag
                                        key={tag.slug}
                                        label={tag.label}
                                        href={`/collected/${segment}?tag=${tag.slug}`}
                                        active={filters.tag === tag.slug}
                                    />
                                ))}
                            </nav>
                        )}

                        <div className="mt-6">
                            {items.data.length > 0 ? (
                                <View items={items.data} onOpen={setOpen} />
                            ) : (
                                <EmptyState title="Nothing here yet" hint="Try another tag." />
                            )}
                        </div>

                        <div className="mt-6">
                            <Pagination links={items.links} />
                        </div>
                    </div>
                </div>
            </div>
            <ItemModal item={open} onClose={() => setOpen(null)} />
        </PublicLayout>
    );
}
