import PublicLayout from '@/Layouts/PublicLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { SearchInput } from '@/Components/SearchInput';
import { FilterBar } from '@/Components/FilterBar';
import { MetaLine } from '@/Components/MetaLine';
import { Pagination } from '@/Components/Pagination';
import { EmptyState } from '@/Components/EmptyState';
import { PostRow } from '@/Components/PostRow';

type PostRowData = {
    slug: string;
    title: string;
    excerpt: string | null;
    reading_time: number;
    date: string | null;
    topics: string[];
    tags: string[];
};

type Paginated = { data: PostRowData[]; links: { url: string | null; label: string; active: boolean }[] };
type Filters = { q?: string; topic?: string; tag?: string };

export default function WritingIndex({ posts, topics, filters }: { posts: Paginated; topics: { name: string; slug: string }[]; filters: Filters }) {
    const [q, setQ] = useState(filters.q ?? '');
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setQ(filters.q ?? '');
    }, [filters.q]);

    useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current);
    }, []);

    const apply = (patch: Record<string, string | undefined>) =>
        router.get('/writing', { ...filters, q: q || undefined, ...patch }, { preserveState: true, preserveScroll: true });

    const onSearch = (next: string) => {
        setQ(next);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            router.get('/writing', { ...filters, q: next || undefined }, { preserveState: true, preserveScroll: true });
        }, 300);
    };

    return (
        <PublicLayout>
            <Head>
                <title>Writing — Timadey</title>
                <meta
                    name="description"
                    content="I lay out my thoughts here. Mostly about technology, products, ideas or philosophy and sometimes reflections of life."
                />
                <meta property="og:type" content="website" />
                <meta property="og:title" content="Writing — Timadey" />
                <meta
                    property="og:description"
                    content="I lay out my thoughts here. Mostly about technology, products, ideas or philosophy and sometimes reflections of life."
                />
                <meta property="og:url" content="/writing" />
                <link rel="canonical" href="/writing" />
                <meta name="twitter:card" content="summary" />
            </Head>
            <div className="mx-auto max-w-3xl px-6 pt-12 pb-16">
                <h1 className="text-3xl font-semibold tracking-tight">Writing</h1>
                <p className="mt-2 text-meta">I lay out my thoughts here. Mostly about technology, products, ideas or philosophy and sometimes reflections of life.</p>

                <div className="mt-8 flex flex-col gap-4">
                    <div className="max-w-sm">
                        <SearchInput value={q} onChange={onSearch} placeholder="Search writing" />
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
                        <PostRow
                            key={post.slug}
                            href={`/writing/${post.slug}`}
                            headline={post.title}
                            meta={<MetaLine date={post.date ?? undefined} readingTime={post.reading_time} items={post.topics} />}
                            excerpt={post.excerpt}
                        />
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
