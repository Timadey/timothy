import AdminLayout from '@/Layouts/AdminLayout';
import { Link, router } from '@inertiajs/react';
import { Button } from '@/Components/Button';
import { SearchInput } from '@/Components/SearchInput';
import { FilterBar } from '@/Components/FilterBar';
import { Badge } from '@/Components/Badge';
import { Flash } from '@/Components/Flash';
import { ITEM_TYPES, TYPE_LABELS } from '@/collectedTypes';

type ItemRow = {
    id: number;
    title: string;
    url: string | null;
    cover_image: string | null;
    creator: string | null;
    item_type: string;
    visibility: string;
    date: string;
};

type Paginated = { data: ItemRow[]; links: { url: string | null; label: string; active: boolean }[] };

const typeOptions = ITEM_TYPES.map((t) => ({ label: TYPE_LABELS[t], value: t }));

export default function CollectedIndex({
    items,
    filters,
}: {
    items: Paginated;
    filters: { type?: string; q?: string };
}) {
    const setFilter = (key: string, value: string) =>
        router.get('/admin/collected', { ...filters, [key]: value || undefined }, { preserveState: true, preserveScroll: true });

    return (
        <AdminLayout title="Collected">
            <Flash />
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <Button href="/admin/collected/create">Add item</Button>
                <div className="w-64">
                    <SearchInput value={filters.q ?? ''} onChange={(v) => setFilter('q', v)} placeholder="Search collected" />
                </div>
            </div>

            <div className="mb-4 overflow-x-auto">
                <FilterBar options={typeOptions} active={filters.type ?? ''} onSelect={(v) => setFilter('type', v)} allLabel="All types" />
            </div>

            <div className="overflow-x-auto rounded-md border border-hairline bg-white">
                <table className="w-full text-left text-sm">
                    <thead className="border-b border-hairline text-xs uppercase text-meta">
                        <tr>
                            <th className="px-4 py-3">
                                <span className="sr-only">Cover</span>
                            </th>
                            <th className="px-4 py-3">Title</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Creator</th>
                            <th className="px-4 py-3">Visibility</th>
                            <th className="px-4 py-3">Added</th>
                            <th className="px-4 py-3">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.data.map((i) => (
                            <tr key={i.id} className="border-b border-hairline last:border-0">
                                <td className="px-4 py-2">
                                    {i.cover_image ? (
                                        <img src={i.cover_image} alt="" loading="lazy" className="h-8 w-8 rounded-sm border border-hairline object-cover" />
                                    ) : (
                                        <span aria-hidden="true" className="block h-8 w-8 rounded-sm border border-hairline bg-surface" />
                                    )}
                                </td>
                                <td className="px-4 py-3 font-medium">{i.title}</td>
                                <td className="px-4 py-3">
                                    <Badge>{i.item_type}</Badge>
                                </td>
                                <td className="px-4 py-3 text-meta">{i.creator ?? '—'}</td>
                                <td className="px-4 py-3 text-meta">{i.visibility}</td>
                                <td className="px-4 py-3 text-meta">{i.date}</td>
                                <td className="px-4 py-3 text-right">
                                    <Link href={`/admin/collected/${i.id}/edit`} className="text-sm text-link hover:underline">
                                        Edit
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {items.data.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-meta">
                                    Nothing collected yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex flex-wrap gap-1">
                {items.links.map((l, i) =>
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
