import PublicLayout from '@/Layouts/PublicLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { SearchInput } from '@/Components/SearchInput';
import { FilterBar } from '@/Components/FilterBar';
import { Pagination } from '@/Components/Pagination';
import { EmptyState } from '@/Components/EmptyState';
import { NoteFeedItem } from '@/Components/NoteFeedItem';

type NoteRow = { slug: string; teaser: string; date: string | null; tags: string[] };
type Paginated = { data: NoteRow[]; links: { url: string | null; label: string; active: boolean }[] };
type Filters = { q?: string; tag?: string };

export default function NotesIndex({ notes, tags, filters }: { notes: Paginated; tags: { name: string; slug: string }[]; filters: Filters }) {
    const [q, setQ] = useState(filters.q ?? '');
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setQ(filters.q ?? '');
    }, [filters.q]);

    useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current);
    }, []);

    const apply = (patch: Record<string, string | undefined>) =>
        router.get('/notes', { ...filters, q: q || undefined, ...patch }, { preserveState: true, preserveScroll: true });

    const onSearch = (next: string) => {
        setQ(next);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            router.get('/notes', { ...filters, q: next || undefined }, { preserveState: true, preserveScroll: true });
        }, 300);
    };

    return (
        <PublicLayout>
            <Head>
                <title>Notes — Timadey</title>
                <meta name="description" content="Half-formed thoughts, small observations, and things I want to remember." />
                <meta property="og:type" content="website" />
                <meta property="og:title" content="Notes — Timadey" />
                <meta property="og:description" content="Half-formed thoughts, small observations, and things I want to remember." />
                <meta property="og:url" content="/notes" />
                <link rel="canonical" href="/notes" />
                <meta name="twitter:card" content="summary" />
            </Head>
            <div className="mx-auto max-w-3xl px-6 pt-12 pb-16">
                <h1 className="text-3xl font-semibold tracking-tight">Notes</h1>
                <p className="mt-2 text-meta">Half-formed thoughts, small observations, and things I want to remember.</p>

                <div className="mt-8 flex flex-col gap-4">
                    <div className="max-w-sm">
                        <SearchInput value={q} onChange={onSearch} placeholder="Search my notes" />
                    </div>
                    <FilterBar
                        options={tags.map((t) => ({ label: t.name, value: t.slug }))}
                        active={filters.tag ?? ''}
                        onSelect={(v) => apply({ tag: v || undefined })}
                        allLabel="All tags"
                    />
                </div>

                <div className="mt-10">
                    {notes.data.map((note) => (
                        <NoteFeedItem
                            key={note.slug}
                            slug={note.slug}
                            teaser={note.teaser}
                            date={note.date}
                            tags={note.tags}
                        />
                    ))}
                    {notes.data.length === 0 && (
                        <div className="py-8">
                            <EmptyState
                                title="Couldn’t find anything"
                                hint="I haven’t written a note matching that — try a different word or tag."
                            />
                        </div>
                    )}
                </div>

                <Pagination links={notes.links} />
            </div>
        </PublicLayout>
    );
}
