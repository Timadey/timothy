import PublicLayout from '@/Layouts/PublicLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { EmptyState } from '@/Components/EmptyState';
import { Pagination } from '@/Components/Pagination';
import { Tag } from '@/Components/Tag';
import { ItemModal } from '@/Components/collected/ItemModal';
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
                <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline pb-4">
                    <Link
                        href="/collected"
                        onClick={goBack}
                        aria-label="Back to Collected"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-hairline text-ink hover:bg-surface"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <h1 className="text-2xl font-semibold tracking-tight">{label}</h1>
                    <span className="text-sm text-meta">
                        {items.total} {items.total === 1 ? 'item' : 'items'}
                    </span>
                </header>

                {tags.length > 0 && (
                    <nav className="mt-4 flex flex-wrap gap-2" aria-label="Filter by tag">
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

                <Pagination links={items.links} />
            </div>
            <ItemModal item={open} onClose={() => setOpen(null)} />
        </PublicLayout>
    );
}
