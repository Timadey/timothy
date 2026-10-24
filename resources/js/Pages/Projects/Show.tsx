import PublicLayout from '@/Layouts/PublicLayout';
import { Head, Link } from '@inertiajs/react';
import { Prose } from '@/Components/Prose';
import { Badge } from '@/Components/Badge';

type Project = {
    slug: string;
    name: string;
    summary: string | null;
    description_html: string;
    status: string;
    repository_url: string | null;
    live_url: string | null;
    started_at: string | null;
    completed_at: string | null;
    cover_image: string | null;
    tags: string[];
};

type RelatedPost = { slug: string; title: string; excerpt: string | null; url: string; date: string | null };

export default function ProjectShow({
    project,
    related,
    canonical,
}: {
    project: Project;
    related: { posts: RelatedPost[] };
    canonical: string;
}) {
    return (
        <PublicLayout>
            <Head>
                <title>{`${project.name} — Timadey`}</title>
                {project.summary && <meta name="description" content={project.summary} />}
                <link rel="canonical" href={canonical} />
                <meta property="og:type" content="website" />
                <meta property="og:title" content={project.name} />
                {project.summary && <meta property="og:description" content={project.summary} />}
                <meta name="twitter:card" content="summary" />
            </Head>

            <article className="mx-auto max-w-3xl px-6 pt-12 pb-16">
                {project.cover_image && (
                    <div className="h-64 relative overflow-hidden rounded-xl">
                        <img src={project.cover_image} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                    </div>
                )}
                <h1 className="mt-6 text-4xl font-semibold tracking-tight">{project.name}</h1>
                {project.summary && <p className="mt-4 text-lg text-meta">{project.summary}</p>}

                {(project.live_url || project.repository_url) && (
                    <div className="mt-8 flex flex-wrap gap-3">
                        {project.live_url && (
                            <a
                                href={project.live_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-white hover:opacity-80"
                            >
                                Visit site
                            </a>
                        )}
                        {project.repository_url && (
                            <a
                                href={project.repository_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-full border border-hairline px-5 py-2 text-sm font-medium hover:bg-surface"
                            >
                                Source code
                            </a>
                        )}
                    </div>
                )}

                <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-meta">
                    <span className="rounded-full border border-hairline px-2 py-1">{project.status}</span>
                    {project.started_at && <span>Started {project.started_at}</span>}
                    {project.completed_at && <span>Completed {project.completed_at}</span>}
                </div>

                <hr className="my-12 border-hairline" />
                <Prose html={project.description_html} />

                {project.tags.length > 0 && (
                    <div className="mt-12 flex flex-wrap gap-2 border-t border-hairline pt-8">
                        {project.tags.map((t) => (
                            <Badge key={t}>{t}</Badge>
                        ))}
                    </div>
                )}
            </article>

            {related.posts.length > 0 && (
                <aside className="mx-auto max-w-3xl border-t border-hairline px-6 py-10" aria-labelledby="related-heading">
                    <h2 id="related-heading" className="text-sm font-semibold uppercase tracking-wider text-meta">
                        Related writing
                    </h2>
                    <ul className="mt-4 space-y-3">
                        {related.posts.map((p) => (
                            <li key={p.slug}>
                                <Link href={p.url} className="font-medium hover:text-link">
                                    {p.title}
                                </Link>
                                <span className="ml-2 text-xs text-meta">{p.date}</span>
                            </li>
                        ))}
                    </ul>
                </aside>
            )}
        </PublicLayout>
    );
}
