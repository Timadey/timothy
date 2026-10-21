import { useState } from 'react';
import { MetaLine } from '@/Components/MetaLine';
import { Prose } from '@/Components/Prose';

export function NoteFeedItem({
    teaser,
    bodyHtml,
    date,
    tags,
}: {
    teaser: string;
    bodyHtml: string;
    date: string | null;
    tags: string[];
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <article className="py-6">
            <MetaLine date={date ?? undefined} items={tags} />
            {expanded ? (
                <div className="mt-2">
                    <Prose html={bodyHtml} />
                </div>
            ) : (
                <p className="mt-2 text-[15px] leading-relaxed text-ink">
                    {teaser}{' '}
                    <button
                        type="button"
                        onClick={() => setExpanded(true)}
                        className="text-link hover:underline"
                    >
                        read more
                    </button>
                </p>
            )}
        </article>
    );
}
