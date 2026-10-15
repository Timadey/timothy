import PublicLayout from '@/Layouts/PublicLayout';
import { Head, Link } from '@inertiajs/react';
import { Prose } from '@/Components/Prose';
import { MetaLine } from '@/Components/MetaLine';
import { Badge } from '@/Components/Badge';

type Post = {
    slug: string;
    title: string;
    excerpt: string | null;
    body_html: string;
    reading_time: number;
    date: string | null;
    published_iso: string | null;
    updated_iso: string;
    cover_image: string | null;
    meta_title: string;
    meta_description: string | null;
    tags: string[];
    topics: string[];
};

type Related = { slug: string; title: string; date: string | null };

export default function ArticleShow({ post, related, canonical, preview }: { post: Post; related: Related[]; canonical: string; preview?: boolean }) {
    return (
        <PublicLayout>
            <Head>
                <title>{`${post.meta_title} — Timadey`}</title>
                <meta name="description" content={post.meta_description ?? undefined} />
                <link rel="canonical" href={canonical} />
                <meta property="og:type" content="article" />
                <meta property="og:title" content={post.meta_title} />
                <meta property="og:description" content={post.meta_description ?? undefined} />
                {post.published_iso && <meta property="article:published_time" content={post.published_iso} />}
                <meta property="article:modified_time" content={post.updated_iso} />
                <meta name="twitter:card" content="summary" />
            </Head>

            <article className="mx-auto max-w-3xl px-6 pt-12 pb-16">
                {preview && (
                    <div className="mb-6 rounded-md border border-hairline bg-surface px-4 py-3 text-sm text-meta">
                        Preview — this article isn&rsquo;t public yet. Only you can see it.
                    </div>
                )}
                <MetaLine type="Article" date={post.date ?? undefined} readingTime={post.reading_time} />
                <h1 className="mt-2 text-4xl font-semibold tracking-tight">{post.title}</h1>
                {post.excerpt && <p className="mt-3 text-lg text-meta">{post.excerpt}</p>}
                {post.cover_image && <img src={post.cover_image} alt="" className="mt-8 w-full rounded-md" loading="lazy" />}
                <hr className="my-8 border-hairline" />
                <Prose html={post.body_html} />
                {(post.tags.length > 0 || post.topics.length > 0) && (
                    <div className="mt-10 flex flex-wrap gap-2 border-t border-hairline pt-6">
                        {[...post.topics, ...post.tags].map((t) => (
                            <Badge key={t}>{t}</Badge>
                        ))}
                    </div>
                )}
            </article>

            {related.length > 0 && (
                <aside className="mx-auto max-w-3xl border-t border-hairline px-6 py-10" aria-labelledby="related-heading">
                    <h2 id="related-heading" className="text-sm font-semibold uppercase tracking-wider text-meta">
                        Related writing
                    </h2>
                    <ul className="mt-4 space-y-3">
                        {related.map((r) => (
                            <li key={r.slug}>
                                <Link href={`/writing/${r.slug}`} className="font-medium hover:text-link">
                                    {r.title}
                                </Link>
                                <span className="ml-2 text-xs text-meta">{r.date}</span>
                            </li>
                        ))}
                    </ul>
                </aside>
            )}
        </PublicLayout>
    );
}
