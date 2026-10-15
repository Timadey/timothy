import { Link } from '@inertiajs/react';
import { MetaLine } from '@/Components/MetaLine';
import { PostRow } from '@/Components/PostRow';

export type WritingItem = {
    slug: string;
    title: string;
    excerpt: string | null;
    reading_time: number | null;
    date: string | null;
};

export function WritingList({ writings }: { writings: WritingItem[] }) {
    return (
        <section className="mx-auto max-w-5xl border-t border-hairline px-6 py-12" aria-labelledby="writing-heading">
            <div className="flex items-baseline justify-between gap-4">
                <h2 id="writing-heading" className="text-sm font-semibold uppercase tracking-wider text-meta">
                    What I’ve been writing
                </h2>
                <Link href="/writing" className="shrink-0 text-sm text-link hover:underline">
                    All writing
                </Link>
            </div>
            <div className="mt-4 divide-y divide-hairline border-t border-hairline">
                {writings.length === 0 && (
                    <p className="py-6 text-sm text-meta">Nothing published yet — I’m still working on it.</p>
                )}
                {writings.map((post) => (
                    <PostRow
                        key={post.slug}
                        href={`/writing/${post.slug}`}
                        headline={post.title}
                        meta={<MetaLine date={post.date ?? undefined} readingTime={post.reading_time ?? undefined} />}
                        excerpt={post.excerpt}
                    />
                ))}
            </div>
        </section>
    );
}
