import AdminLayout from '@/Layouts/AdminLayout';
import { Link, router } from '@inertiajs/react';
import { Button } from '@/Components/Button';
import { SearchInput } from '@/Components/SearchInput';
import { FilterBar } from '@/Components/FilterBar';
import { Badge } from '@/Components/Badge';
import { Flash } from '@/Components/Flash';

type PostRow = {
    id: number;
    title: string;
    slug: string;
    post_type: string;
    status: string;
    visibility: string;
    featured: boolean;
    published_at: string | null;
};

type Paginated = {
    data: PostRow[];
    links: { url: string | null; label: string; active: boolean }[];
};

type Filters = { status?: string; type?: string; q?: string };

export default function PostsIndex({ posts, filters }: { posts: Paginated; filters: Filters }) {
    const setFilter = (key: string, value: string) =>
        router.get(
            '/admin/posts',
            { ...filters, [key]: value || undefined },
            { preserveState: true, preserveScroll: true },
        );

    return (
        <AdminLayout title="Posts">
            <Flash />
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <Button href="/admin/posts/create">New post</Button>
                <div className="w-64">
                    <SearchInput
                        value={filters.q ?? ''}
                        onChange={(v) => setFilter('q', v)}
                        placeholder="Search posts"
                    />
                </div>
            </div>

            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:gap-8">
                <FilterBar
                    options={[
                        { label: 'Articles', value: 'article' },
                        { label: 'Notes', value: 'note' },
                        { label: 'Questions', value: 'question' },
                    ]}
                    active={filters.type ?? ''}
                    onSelect={(v) => setFilter('type', v)}
                    allLabel="All types"
                />
                <FilterBar
                    options={[
                        { label: 'Draft', value: 'draft' },
                        { label: 'Published', value: 'published' },
                        { label: 'Archived', value: 'archived' },
                    ]}
                    active={filters.status ?? ''}
                    onSelect={(v) => setFilter('status', v)}
                    allLabel="All statuses"
                />
            </div>

            <div className="overflow-x-auto rounded-md border border-hairline bg-white">
                <table className="w-full text-left text-sm">
                    <thead className="border-b border-hairline text-xs uppercase text-meta">
                        <tr>
                            <th className="px-4 py-3">Title</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Visibility</th>
                            <th className="px-4 py-3">Published</th>
                            <th className="px-4 py-3">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {posts.data.map((p) => (
                            <tr key={p.id} className="border-b border-hairline last:border-0">
                                <td className="px-4 py-3 font-medium">
                                    {p.featured && '★ '}
                                    {p.title}
                                </td>
                                <td className="px-4 py-3 text-meta">{p.post_type}</td>
                                <td className="px-4 py-3">
                                    <Badge>{p.status}</Badge>
                                </td>
                                <td className="px-4 py-3 text-meta">{p.visibility}</td>
                                <td className="px-4 py-3 text-meta">{p.published_at ?? '—'}</td>
                                <td className="px-4 py-3 text-right">
                                    <Link href={`/admin/posts/${p.id}/edit`} className="text-sm text-link hover:underline">
                                        Edit
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {posts.data.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-meta">
                                    No posts found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex flex-wrap gap-1">
                {posts.links.map((l, i) =>
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
