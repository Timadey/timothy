import PublicLayout from '@/Layouts/PublicLayout';
import { Head } from '@inertiajs/react';
import { Prose } from '@/Components/Prose';
import { MetaLine } from '@/Components/MetaLine';
import { Badge } from '@/Components/Badge';

type Note = {
    slug: string;
    title: string;
    excerpt: string | null;
    body_html: string;
    date: string | null;
    published_iso: string | null;
    reading_time: number;
    tags: string[];
};

export default function NoteShow({ note, canonical, preview }: { note: Note; canonical: string; preview?: boolean }) {
    return (
        <PublicLayout>
            <Head>
                <title>{note.title} — Timadey</title>
                {note.excerpt && <meta name="description" content={note.excerpt} />}
                <link rel="canonical" href={canonical} />
                <meta property="og:type" content="article" />
                <meta property="og:title" content={note.title} />
                {note.excerpt && <meta property="og:description" content={note.excerpt} />}
                <meta name="twitter:card" content="summary" />
            </Head>

            <article className="mx-auto max-w-3xl px-6 pt-12 pb-16">
                {preview && (
                    <div className="mb-6 rounded-md border border-hairline bg-surface px-4 py-3 text-sm text-meta">
                        Preview — this note isn&rsquo;t public yet. Only you can see it.
                    </div>
                )}
                <MetaLine type="Note" date={note.date ?? undefined} readingTime={note.reading_time} />
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">{note.title}</h1>
                <hr className="my-8 border-hairline" />
                <Prose html={note.body_html} />
                {note.tags.length > 0 && (
                    <div className="mt-10 flex flex-wrap gap-2 border-t border-hairline pt-6">
                        {note.tags.map((t) => (
                            <Badge key={t}>{t}</Badge>
                        ))}
                    </div>
                )}
            </article>
        </PublicLayout>
    );
}
