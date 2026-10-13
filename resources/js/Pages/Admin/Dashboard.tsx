import AdminLayout from '@/Layouts/AdminLayout';
import { Link } from '@inertiajs/react';
import { Flash } from '@/Components/Flash';

type Stats = {
    publishedPosts: number;
    draftPosts: number;
    publishedNotes: number;
    projects: number;
    collectedItems: number;
    recentPosts: { id: number; title: string; status: string; created_at: string }[];
};

export default function Dashboard({ stats }: { stats: Stats }) {
    const cards = [
        { label: 'Published articles', value: stats.publishedPosts, href: '/admin/posts?type=article' },
        { label: 'Drafts', value: stats.draftPosts, href: '/admin/posts?status=draft' },
        { label: 'Published notes', value: stats.publishedNotes, href: '/admin/posts?type=note' },
        { label: 'Projects', value: stats.projects, href: '/admin/projects' },
        { label: 'Collected items', value: stats.collectedItems, href: '/admin/collected' },
    ];

    return (
        <AdminLayout title="Dashboard">
            <Flash />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((c) => (
                    <Link
                        key={c.label}
                        href={c.href}
                        className="rounded-md border border-hairline bg-white p-5 hover:border-primary"
                    >
                        <p className="text-3xl font-semibold tracking-tight">{c.value}</p>
                        <p className="mt-1 text-sm text-meta">{c.label}</p>
                    </Link>
                ))}
            </div>
            <section className="mt-8 rounded-md border border-hairline bg-white">
                <h2 className="border-b border-hairline px-5 py-3 text-sm font-semibold">Recent posts</h2>
                <ul>
                    {stats.recentPosts.map((p) => (
                        <li
                            key={p.id}
                            className="flex items-center justify-between border-b border-hairline px-5 py-3 last:border-0"
                        >
                            <Link href={`/admin/posts/${p.id}/edit`} className="text-sm hover:text-link">
                                {p.title}
                            </Link>
                            <span className="text-xs uppercase text-meta">
                                {p.status} · {p.created_at}
                            </span>
                        </li>
                    ))}
                    {stats.recentPosts.length === 0 && (
                        <li className="px-5 py-6 text-sm text-meta">No posts yet.</li>
                    )}
                </ul>
            </section>
        </AdminLayout>
    );
}
