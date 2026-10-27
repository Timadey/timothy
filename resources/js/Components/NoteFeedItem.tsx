import { useState } from 'react';
import { MetaLine } from '@/Components/MetaLine';
import { Prose } from '@/Components/Prose';

export function NoteFeedItem({
    slug,
    teaser,
    date,
    tags,
    initialBodyHtml = null,
}: {
    slug: string;
    teaser: string;
    date: string | null;
    tags: string[];
    initialBodyHtml?: string | null;
}) {
    const [expanded, setExpanded] = useState(false);
    const [bodyHtml, setBodyHtml] = useState<string | null>(initialBodyHtml);
    const [failed, setFailed] = useState(false);

    const load = async () => {
        setFailed(false);
        try {
            const res = await fetch(`/notes/${encodeURIComponent(slug)}/body`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = (await res.json()) as { body_html: string };
            setBodyHtml(data.body_html);
        } catch {
            setFailed(true);
        }
    };

    const onExpand = () => {
        setExpanded(true);
        if (bodyHtml === null) void load();
    };

    return (
        <article className="py-6">
            <MetaLine date={date ?? undefined} items={tags} />
            {expanded ? (
                <div className="mt-2">
                    {bodyHtml !== null ? (
                        <Prose html={bodyHtml} />
                    ) : failed ? (
                        <p className="text-[15px] leading-relaxed text-ink">
                            Couldn’t load the note.{' '}
                            <button type="button" onClick={() => void load()} className="text-link hover:underline">
                                Try again
                            </button>
                        </p>
                    ) : (
                        <p className="text-sm text-meta" aria-live="polite">
                            Loading…
                        </p>
                    )}
                </div>
            ) : (
                <p className="mt-2 text-[15px] leading-relaxed text-ink">
                    {teaser}{' '}
                    <button type="button" onClick={onExpand} className="text-link hover:underline">
                        read more
                    </button>
                </p>
            )}
        </article>
    );
}
