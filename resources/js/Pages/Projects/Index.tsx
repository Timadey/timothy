import PublicLayout from '@/Layouts/PublicLayout';
import { Head, Link } from '@inertiajs/react';
import { Badge } from '@/Components/Badge';
import { Pagination } from '@/Components/Pagination';
import { EmptyState } from '@/Components/EmptyState';

type ProjectCard = {
    slug: string;
    name: string;
    summary: string | null;
    status: string;
    cover_image: string | null;
    featured: boolean;
    started_at: string | null;
    tags: string[];
};

type Paginated = { data: ProjectCard[]; links: { url: string | null; label: string; active: boolean }[] };
type Filters = { status?: string };

const statusLabels: Record<string, string> = {
    idea: 'Idea',
    exploring: 'Exploring',
    building: 'Building',
    active: 'Active',
    paused: 'Paused',
    completed: 'Completed',
};

export default function ProjectsIndex({ projects, statuses, filters }: { projects: Paginated; statuses: string[]; filters: Filters }) {
    const featured = projects.data.filter((p) => p.featured);
    const rest = projects.data.filter((p) => !p.featured);

    return (
        <PublicLayout>
            <Head>
                <title>Projects — Timadey</title>
                <meta name="description" content="Things I am building, exploring, or keeping alive." />
                <meta property="og:type" content="website" />
                <meta property="og:title" content="Projects — Timadey" />
                <meta property="og:description" content="Things I am building, exploring, or keeping alive." />
                <meta property="og:url" content="/projects" />
                <link rel="canonical" href="/projects" />
                <meta name="twitter:card" content="summary" />
            </Head>
            <div className="mx-auto max-w-5xl px-6 pt-12 pb-16">
                <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
                <p className="mt-2 max-w-2xl text-meta">Things I am building, exploring, or keeping alive.</p>

                {featured.length > 0 && (
                    <div className="mt-10 grid gap-6 md:grid-cols-2">
                        {featured.map((p) => (
                            <article key={p.slug} className="border border-hairline rounded-xl overflow-hidden">
                                <div className="h-48 relative overflow-hidden">
                                    {p.cover_image ? (
                                        <img src={p.cover_image} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                                    ) : (
                                        <div className="absolute inset-0 w-full h-full border border-dashed border-hairline rounded-[inherit] bg-surface/50 flex items-center justify-center">
                                            <span className="z-10"><Badge>{statusLabels[p.status] ?? p.status}</Badge></span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 pt-3">
                                    {p.tags.length > 0 && (
                                        <span className="ml-auto text-xs text-meta block mb-2">
                                            {p.tags.join(' · ')}
                                        </span>
                                    )}
                                    <Link href={`/projects/${p.slug}`} className="mt-2 block text-lg font-semibold tracking-tight hover:text-link">
                                        {p.name}
                                    </Link>
                                    {p.summary && <p className="mt-2 text-sm text-meta line-clamp-2">{p.summary}</p>}
                                </div>
                            </article>
                        ))}
                    </div>
                )}

                <div className="mt-10 grid gap-6 sm:grid-cols-3">
                    {rest.map((p) => (
                        <article key={p.slug} className="border-t border-hairline pt-4">
                            <div className="flex items-end justify-between gap-2">
                                {p.tags.length > 0 && <span className="text-xs text-meta">{p.tags.join(' · ')}</span>}
                            </div>
                            {p.cover_image && <img src={p.cover_image} alt="" className="mt-3 w-full rounded-md" loading="lazy" />}
                            <Link href={`/projects/${p.slug}`} className="mt-2 block text-lg font-semibold tracking-tight hover:text-link">
                                {p.name}
                            </Link>
                            {p.summary && <p className="mt-1 text-sm text-meta line-clamp-2">{p.summary}</p>}
                        </article>
                    ))}
                </div>

                {projects.data.length === 0 && (
                    <div className="mt-10"><EmptyState title="No projects here" hint="Come back soon." /></div>
                )}

                {projects.data.length > 0 && projects.links.length > 0 && <Pagination links={projects.links} />}
            </div>
        </PublicLayout>
    );
}
