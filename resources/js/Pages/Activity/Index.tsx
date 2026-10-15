import PublicLayout from '@/Layouts/PublicLayout';
import { Link } from '@inertiajs/react';
import { MetaLine } from '@/Components/MetaLine';
import { EmptyState } from '@/Components/EmptyState';
import { formatDate } from '@/Components/home/format';

type FeedItem = {
    id: string;
    type: string;
    label: string;
    title: string;
    message: string | null;
    url: string;
    date: string;
    tags: string[];
};

export default function ActivityIndex({ feed }: { feed: FeedItem[] }) {
    return (
        <PublicLayout>
            <div className="mx-auto max-w-5xl px-6 py-12">
                <h1 className="text-4xl font-semibold tracking-tight">Lately</h1>
                <p className="mt-3 max-w-2xl text-lg text-meta">
                    Everything I’ve been writing, building, and collecting — newest first.
                </p>

                <div className="mt-10 divide-y divide-hairline border-t border-hairline">
                    {feed.map((item) => (
                        <article key={item.id} className="py-6">
                            <div className="flex flex-wrap items-baseline gap-x-3">
                                <span className="text-xs font-semibold uppercase tracking-wide text-meta">
                                    {item.label}
                                </span>
                                <MetaLine date={formatDate(item.date)} />
                            </div>
                            <Link
                                href={item.url}
                                className="mt-1 block text-xl font-semibold tracking-tight text-ink hover:text-link"
                            >
                                {item.title}
                            </Link>
                            {item.message && <p className="mt-2 max-w-2xl text-sm text-meta line-clamp-2">{item.message}</p>}
                            {item.tags.length > 0 && (
                                <p className="mt-2 text-xs text-meta">{item.tags.slice(0, 4).join(' · ')}</p>
                            )}
                        </article>
                    ))}
                </div>
                {feed.length === 0 && (
                    <div className="mt-8">
                        <EmptyState title="Nothing here yet" hint="I haven’t posted anything yet — check back soon." />
                    </div>
                )}
            </div>
        </PublicLayout>
    );
}
