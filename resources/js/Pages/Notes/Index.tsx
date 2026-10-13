import PublicLayout from '@/Layouts/PublicLayout';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { SearchInput } from '@/Components/SearchInput';
import { FilterBar } from '@/Components/FilterBar';
import { MetaLine } from '@/Components/MetaLine';
import { Pagination } from '@/Components/Pagination';
import { EmptyState } from '@/Components/EmptyState';

type NoteRow = {
    slug: string;
    title: string;
    excerpt: string | null;
    reading_time: number;
    date: string | null;
    tags: string[];
};

type Paginated = { data: NoteRow[]; links: { url: string | null; label: string; active: boolean }[] };
type Filters = { q?: string; tag?: string };

export default function NotesIndex({ notes, tags, filters }: { notes: Paginated; tags: { name: string; slug: string }[]; filters: Filters }) {
    const [q, setQ] = useState(filters.q ?? '');

    const apply = (patch: Record<string, string | undefined>) =>
        router.get('/notes', { ...filters, q: q || undefined, ...patch }, { preserveState: true, preserveScroll: true });

    return (
        <PublicLayout>
            <div className="mx-auto max-w-3xl px-6 pt-12 pb-16">
                <h1 className="text-3xl font-semibold tracking-tight">Notes</h1>
                <p className="mt-2 text-meta">Shorter observations, links, and things worth remembering.</p>

                <div className="mt-8 flex flex-col gap-4">
                    <div className="max-w-sm">
                        <SearchInput value={q} onChange={setQ} placeholder="Search notes" />
                    </div>
                    <FilterBar
                        options={tags.map((t) => ({ label: t.name, value: t.slug }))}
                        active={filters.tag ?? ''}
                        onSelect={(v) => apply({ tag: v || undefined })}
                        allLabel="All tags"
                    />
                </div>

                <div className="mt-10 divide-y divide-hairline">
                    {notes.data.map((note) => (
                        <article key={note.slug} className="py-5">
                            <MetaLine date={note.date ?? undefined} readingTime={note.reading_time} />
                            <Link href={`/notes/${note.slug}`} className="mt-1 block text-lg font-semibold tracking-tight hover:text-link">
                                {note.title}
                            </Link>
                            {note.excerpt && <p className="mt-1 text-sm text-meta line-clamp-2">{note.excerpt}</p>}
                            {note.tags.length > 0 && <p className="mt-2 text-xs text-meta">{note.tags.join(' · ')}</p>}
                        </article>
                    ))}
                    {notes.data.length === 0 && (
                        <div className="py-8">
                            <EmptyState title="No notes found" hint="Try a different search or tag." />
                        </div>
                    )}
                </div>

                <Pagination links={notes.links} />
            </div>
        </PublicLayout>
    );
}
