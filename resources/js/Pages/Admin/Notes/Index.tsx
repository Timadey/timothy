import AdminLayout from '@/Layouts/AdminLayout';
import { Link, router } from '@inertiajs/react';
import { Button } from '@/Components/Button';
import { SearchInput } from '@/Components/SearchInput';
import { Badge } from '@/Components/Badge';
import { Flash } from '@/Components/Flash';

type NoteRow = {
    id: number;
    title: string | null;
    snippet: string;
    status: string;
    published_at: string | null;
    tags: string[];
};

type Paginated = {
    data: NoteRow[];
    links: { url: string | null; label: string; active: boolean }[];
};

type Filters = { q?: string };

export default function NotesIndex({ notes, filters }: { notes: Paginated; filters: Filters }) {
    const setQ = (value: string) =>
        router.get('/admin/notes', { q: value || undefined }, { preserveState: true, preserveScroll: true });

    return (
        <AdminLayout title="Notes">
            <Flash />
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <Button href="/admin/notes/new">New note</Button>
                <div className="w-64">
                    <SearchInput value={filters.q ?? ''} onChange={setQ} placeholder="Search notes" />
                </div>
            </div>

            <div className="overflow-x-auto rounded-md border border-hairline bg-white">
                <table className="w-full text-left text-sm">
                    <thead className="border-b border-hairline text-xs uppercase text-meta">
                        <tr>
                            <th className="px-4 py-3">Note</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Published</th>
                            <th className="px-4 py-3">Tags</th>
                            <th className="px-4 py-3">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {notes.data.map((n) => (
                            <tr key={n.id} className="border-b border-hairline last:border-0">
                                <td className="max-w-md px-4 py-3">
                                    <span className={n.title ? 'font-medium' : 'text-meta'}>
                                        {n.snippet}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <Badge>{n.status}</Badge>
                                </td>
                                <td className="px-4 py-3 text-meta">{n.published_at ?? '—'}</td>
                                <td className="px-4 py-3 text-xs text-meta">{n.tags.join(', ')}</td>
                                <td className="px-4 py-3 text-right">
                                    <Link
                                        href={`/admin/notes/${n.id}/edit`}
                                        className="text-sm text-link hover:underline"
                                    >
                                        Edit
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {notes.data.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-meta">
                                    No notes yet. Write your first one.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex flex-wrap gap-1">
                {notes.links.map((l, i) =>
                    l.url ? (
                        <Link
                            key={i}
                            href={l.url}
                            preserveScroll
                            className={`rounded-sm px-3 py-1 text-sm ${
                                l.active ? 'bg-primary text-white' : 'border border-hairline bg-white'
                            }`}
                            dangerouslySetInnerHTML={{ __html: l.label }}
                        />
                    ) : (
                        <span key={i} className="px-3 py-1 text-sm text-meta" dangerouslySetInnerHTML={{ __html: l.label }} />
                    ),
                )}
            </div>
        </AdminLayout>
    );
}
