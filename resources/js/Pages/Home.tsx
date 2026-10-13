import PublicLayout from '@/Layouts/PublicLayout';
import { Link } from '@inertiajs/react';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { MetaLine } from '@/Components/MetaLine';
import { Badge } from '@/Components/Badge';
import { EmptyState } from '@/Components/EmptyState';

type FeedItem = {
    id: string;
    type: string;
    label: string;
    title: string;
    message: string | null;
    url: string;
    date: string;
    tags: string[];
};

type FeaturedPost = { slug: string; title: string; excerpt: string | null; reading_time: number; date: string | null };
type ProjectCard = { slug: string; name: string; summary: string | null; status: string };
type NowSnapshot = { sections: { key: string; label: string; body: string | null; update: string | null }[]; last_updated_at: string } | null;
type SocialLink = { platform: string; url: string; label: string | null };

const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

export default function Home({
    intro,
    statement,
    feed,
    featuredPosts,
    projects,
    now,
    social_links,
}: {
    intro: string;
    statement: string;
    feed: FeedItem[];
    featuredPosts: FeaturedPost[];
    projects: ProjectCard[];
    now: NowSnapshot;
    social_links: SocialLink[];
}) {
    return (
        <PublicLayout>
            <section className="mx-auto max-w-5xl px-6 pt-14 pb-10">
                <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">Hey, I&rsquo;m Timadey.</h1>
                <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink">{intro}</p>
                <p className="mt-3 max-w-2xl text-base text-meta">{statement}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                        href="/ask"
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-white hover:opacity-80"
                    >
                        <MessageCircle className="h-4 w-4" /> Ask Timadey
                    </Link>
                    <Link
                        href="/writing"
                        className="inline-flex items-center gap-2 rounded-md border border-hairline px-5 py-2.5 text-sm font-medium hover:bg-surface"
                    >
                        Read the writing <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>

            <section className="mx-auto max-w-5xl border-t border-hairline px-6 py-10" aria-labelledby="activity-heading">
                <h2 id="activity-heading" className="text-sm font-semibold uppercase tracking-wider text-meta">
                    Recent activity
                </h2>
                <ul className="mt-5 divide-y divide-hairline">
                    {feed.map((item) => (
                        <li key={item.id} className="py-4">
                            <div className="flex flex-wrap items-baseline gap-x-3">
                                <span className="text-xs font-semibold uppercase tracking-wide text-meta">{item.label}</span>
                                <MetaLine date={fmt(item.date)} />
                            </div>
                            <Link href={item.url} className="mt-1 block text-lg font-medium hover:text-link">
                                {item.title}
                            </Link>
                            {item.message && <p className="mt-1 max-w-2xl text-sm text-meta line-clamp-2">{item.message}</p>}
                            {item.tags.length > 0 && (
                                <div className="mt-2 flex gap-2">
                                    {item.tags.slice(0, 3).map((t) => (
                                        <Badge key={t}>{t}</Badge>
                                    ))}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
                {feed.length === 0 && (
                    <div className="mt-4">
                        <EmptyState title="Nothing here yet" hint="New writing and updates will appear here." />
                    </div>
                )}
            </section>

            {featuredPosts.length > 0 && (
                <section className="mx-auto max-w-5xl border-t border-hairline px-6 py-10" aria-labelledby="writing-heading">
                    <div className="flex items-baseline justify-between">
                        <h2 id="writing-heading" className="text-sm font-semibold uppercase tracking-wider text-meta">
                            Featured writing
                        </h2>
                        <Link href="/writing" className="text-sm text-link hover:underline">
                            All writing
                        </Link>
                    </div>
                    <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {featuredPosts.map((p) => (
                            <article key={p.slug}>
                                <MetaLine date={p.date ?? undefined} readingTime={p.reading_time} />
                                <Link href={`/writing/${p.slug}`} className="mt-1 block text-lg font-semibold tracking-tight hover:text-link">
                                    {p.title}
                                </Link>
                                <p className="mt-1 text-sm text-meta line-clamp-3">{p.excerpt}</p>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {projects.length > 0 && (
                <section className="mx-auto max-w-5xl border-t border-hairline px-6 py-10" aria-labelledby="projects-heading">
                    <div className="flex items-baseline justify-between">
                        <h2 id="projects-heading" className="text-sm font-semibold uppercase tracking-wider text-meta">
                            Selected projects
                        </h2>
                        <Link href="/projects" className="text-sm text-link hover:underline">
                            All projects
                        </Link>
                    </div>
                    <div className="mt-5 grid gap-6 sm:grid-cols-3">
                        {projects.map((p) => (
                            <article key={p.slug} className="border-t border-hairline pt-4">
                                <Badge>{p.status}</Badge>
                                <Link href={`/projects/${p.slug}`} className="mt-2 block font-semibold hover:text-link">
                                    {p.name}
                                </Link>
                                <p className="mt-1 text-sm text-meta">{p.summary}</p>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {now && (
                <section className="mx-auto max-w-5xl border-t border-hairline px-6 py-10" aria-labelledby="now-heading">
                    <div className="flex items-baseline justify-between">
                        <h2 id="now-heading" className="text-sm font-semibold uppercase tracking-wider text-meta">
                            Now
                        </h2>
                        <Link href="/now" className="text-sm text-link hover:underline">
                            Details
                        </Link>
                    </div>
                    <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {now.sections.map((s) => (
                            <div key={s.key}>
                                <dt className="text-xs uppercase tracking-wide text-meta">{s.label}</dt>
                                <dd className="mt-1 text-sm">{s.update || s.body}</dd>
                            </div>
                        ))}
                    </dl>
                    <p className="mt-3 text-xs text-meta">Last updated {fmt(now.last_updated_at)}</p>
                </section>
            )}

            {social_links.length > 0 && (
                <section className="mx-auto max-w-5xl border-t border-hairline px-6 py-8">
                    <ul className="flex flex-wrap gap-4">
                        {social_links.map((l) => (
                            <li key={l.url}>
                                <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-sm text-link hover:underline">
                                    {l.label || l.platform}
                                </a>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </PublicLayout>
    );
}
