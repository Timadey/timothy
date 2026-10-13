import PublicLayout from '@/Layouts/PublicLayout';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { SearchInput } from '@/Components/SearchInput';
import { FilterBar } from '@/Components/FilterBar';
import { MetaLine } from '@/Components/MetaLine';
import { Pagination } from '@/Components/Pagination';
import { EmptyState } from '@/Components/EmptyState';

type PostRow = {
    slug: string;
    title: string;
    excerpt: string | null;
    reading_time: number;
    featured: boolean;
    date: string | null;
    topics: string[];
    tags: string[];
};

type Paginated = { data: PostRow[]; links: { url: string | null; label: string; active: boolean }[] };
type Filters = { q?: string; topic?: string; tag?: string };

export default function WritingIndex({ posts, topics, filters }: { posts: Paginated; topics: { name: string; slug: string }[]; filters: Filters }) {
    const [q, setQ] = useState(filters.q ?? '');

    const apply = (patch: Record<string, string | undefined>) =>
        router.get('/writing', { ...filters, q: q || undefined, ...patch }, { preserveState: true, preserveScroll: true });

    return (
        <PublicLayout>
            <div className="mx-auto max-w-3xl px-6 pt-12 pb-16">
                <h1 className="text-3xl font-semibold tracking-tight">Writing</h1>
                <p className="mt-2 text-meta">Long-form pieces about technology, product thinking, and ideas in progress.</p>

                <div className="mt-8 flex flex-col gap-4">
                    <div className="max-w-sm">
                        <SearchInput value={q} onChange={setQ} placeholder="Search writing" />
                    </div>
                    <FilterBar
                        options={topics.map((t) => ({ label: t.name, value: t.slug }))}
                        active={filters.topic ?? ''}
                        onSelect={(v) => apply({ topic: v || undefined })}
                        allLabel="All topics"
                    />
                </div>

                <div className="mt-10 divide-y divide-hairline">
                    {posts.data.map((post) => (
                        <article key={post.slug} className="py-6">
                            <MetaLine type={post.featured ? 'Featured' : undefined} date={post.date ?? undefined} readingTime={post.reading_time} />
                            <Link href={`/writing/${post.slug}`} className="mt-1 block text-xl font-semibold tracking-tight hover:text-link">
                                {post.title}
                            </Link>
                            <p className="mt-1 text-meta">{post.excerpt}</p>
                            {post.topics.length > 0 && <p className="mt-2 text-xs text-meta">{post.topics.join(' · ')}</p>}
                        </article>
                    ))}
                    {posts.data.length === 0 && (
                        <div className="py-8">
                            <EmptyState title="No writing found" hint="Try a different search or filter." />
                        </div>
                    )}
                </div>

                <Pagination links={posts.links} />
            </div>
        </PublicLayout>
    );
}
