import AdminLayout from '@/Layouts/AdminLayout';
import { Link, router } from '@inertiajs/react';
import { Button } from '@/Components/Button';
import { FilterBar } from '@/Components/FilterBar';
import { Badge } from '@/Components/Badge';
import { Flash } from '@/Components/Flash';

type ProjectRow = {
    id: number;
    name: string;
    slug: string;
    status: string;
    visibility: string;
    featured: boolean;
};

type Paginated = { data: ProjectRow[]; links: { url: string | null; label: string; active: boolean }[] };

const statusOptions = [
    { label: 'Idea', value: 'idea' },
    { label: 'Exploring', value: 'exploring' },
    { label: 'Building', value: 'building' },
    { label: 'Active', value: 'active' },
    { label: 'Paused', value: 'paused' },
    { label: 'Completed', value: 'completed' },
];

export default function ProjectsIndex({ projects, filters }: { projects: Paginated; filters: { status?: string } }) {
    const setStatus = (value: string) =>
        router.get('/admin/projects', { status: value || undefined }, { preserveState: true, preserveScroll: true });

    return (
        <AdminLayout title="Projects">
            <Flash />
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <Button href="/admin/projects/create">New project</Button>
                <div className="overflow-x-auto">
                    <FilterBar options={statusOptions} active={filters.status ?? ''} onSelect={setStatus} allLabel="All statuses" />
                </div>
            </div>

            <div className="overflow-x-auto rounded-md border border-hairline bg-white">
                <table className="w-full text-left text-sm">
                    <thead className="border-b border-hairline text-xs uppercase text-meta">
                        <tr>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Visibility</th>
                            <th className="px-4 py-3">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {projects.data.map((p) => (
                            <tr key={p.id} className="border-b border-hairline last:border-0">
                                <td className="px-4 py-3 font-medium">
                                    {p.featured && '★ '}
                                    {p.name}
                                </td>
                                <td className="px-4 py-3">
                                    <Badge>{p.status}</Badge>
                                </td>
                                <td className="px-4 py-3 text-meta">{p.visibility}</td>
                                <td className="px-4 py-3 text-right">
                                    <Link href={`/admin/projects/${p.id}/edit`} className="text-sm text-link hover:underline">
                                        Edit
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {projects.data.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-meta">
                                    No projects yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex flex-wrap gap-1">
                {projects.links.map((l, i) =>
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
