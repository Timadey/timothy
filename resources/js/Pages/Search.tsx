import PublicLayout from '@/Layouts/PublicLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { SearchInput } from '@/Components/SearchInput';
import { FilterBar } from '@/Components/FilterBar';
import { EmptyState } from '@/Components/EmptyState';

type Result = { type: string; title: string; snippet: string; url: string; date: string | null };
type TypeOption = { value: string; label: string };

const typeLabels: Record<string, string> = {
    article: 'Article',
    note: 'Note',
    project: 'Project',
    collected: 'Collected',
};

export default function Search({
    results,
    types,
    q,
    type,
    total,
}: {
    results: Result[];
    types: TypeOption[];
    q: string;
    type: string | null;
    total: number;
}) {
    const [value, setValue] = useState(q);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setValue(q);
    }, [q]);

    useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current);
    }, []);

    const submit = (next: string, nextType?: string | null) => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            router.get(
                '/search',
                { q: next || undefined, type: nextType ?? type ?? undefined },
                { preserveState: true, preserveScroll: true },
            );
        }, 300);
    };

    const onChange = (next: string) => {
        setValue(next);
        submit(next);
    };

    return (
        <PublicLayout>
            <Head>
                <title>Search — Timadey</title>
            </Head>

            <div className="mx-auto max-w-3xl px-6 pt-12 pb-16">
                <h1 className="text-3xl font-semibold tracking-tight">Search</h1>

                <div className="mt-6 max-w-md">
                    <SearchInput value={value} onChange={onChange} placeholder="Search writing, notes, projects…" />
                </div>

                <div className="mt-4">
                    <FilterBar
                        options={types}
                        active={type ?? ''}
                        onSelect={(v) => submit(value, v || null)}
                        allLabel="Everything"
                    />
                </div>

                <div className="mt-8">
                    {q.length < 2 ? (
                        <EmptyState title="Type at least 2 characters" hint="Search covers articles, notes, projects, and collected items." />
                    ) : results.length === 0 ? (
                        <EmptyState title={`No results for “${q}”`} hint="Try different words or clear the type filter." />
                    ) : (
                        <>
                            <p className="text-sm text-meta">
                                {total} result{total === 1 ? '' : 's'}
                            </p>
                            <ul className="mt-4 divide-y divide-hairline">
                                {results.map((r) => (
                                    <li key={`${r.type}-${r.url}`} className="py-4">
                                        <div className="flex flex-wrap items-baseline gap-x-3">
                                            <span className="text-xs font-semibold uppercase tracking-wide text-meta">
                                                {typeLabels[r.type] ?? r.type}
                                            </span>
                                            {r.date && <span className="text-xs text-meta">{r.date}</span>}
                                        </div>
                                        <a href={r.url} className="mt-1 block text-lg font-medium hover:text-link">
                                            {r.title}
                                        </a>
                                        {r.snippet && <p className="mt-1 text-sm text-meta line-clamp-2">{r.snippet}</p>}
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>
            </div>
        </PublicLayout>
    );
}
