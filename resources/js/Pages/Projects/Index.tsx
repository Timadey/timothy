import PublicLayout from '@/Layouts/PublicLayout';
import { Head, Link, router } from '@inertiajs/react';
import { FilterBar } from '@/Components/FilterBar';
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
    const setStatus = (value: string) =>
        router.get('/projects', { status: value || undefined }, { preserveState: true, preserveScroll: true });

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

                <div className="mt-8">
                    <FilterBar
                        options={statuses.map((s) => ({ label: statusLabels[s] ?? s, value: s }))}
                        active={filters.status ?? ''}
                        onSelect={setStatus}
                        allLabel="All statuses"
                    />
                </div>

                <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {projects.data.map((p) => (
                        <article key={p.slug} className="border-t border-hairline pt-4">
                            <div className="flex items-center justify-between gap-2">
                                <Badge>{statusLabels[p.status] ?? p.status}</Badge>
                                {p.featured && <span className="text-xs text-meta">Featured</span>}
                            </div>
                            {p.cover_image && <img src={p.cover_image} alt="" className="mt-3 w-full rounded-md" loading="lazy" />}
                            <Link href={`/projects/${p.slug}`} className="mt-3 block text-lg font-semibold tracking-tight hover:text-link">
                                {p.name}
                            </Link>
                            {p.summary && <p className="mt-1 text-sm text-meta line-clamp-3">{p.summary}</p>}
                            <p className="mt-2 text-xs text-meta">
                                {[p.started_at, p.tags.join(' · ')].filter(Boolean).join(' — ')}
                            </p>
                        </article>
                    ))}
                </div>
                {projects.data.length === 0 && <div className="mt-8"><EmptyState title="No projects here" hint="Try another status." /></div>}

                <Pagination links={projects.links} />
            </div>
        </PublicLayout>
    );
}
