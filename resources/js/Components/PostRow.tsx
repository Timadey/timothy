import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { prefetchOnVisibleRef } from '@/prefetchOnVisible';

export function PostRow({
    href,
    headline,
    meta,
    excerpt,
}: {
    href: string;
    headline: string;
    meta: ReactNode;
    excerpt?: string | null;
}) {
    return (
        <article className="py-6">
            {meta}
            <h3 className="mt-1 text-xl font-semibold tracking-tight">
                <Link href={href} ref={prefetchOnVisibleRef(href)} className="text-ink hover:text-link">
                    {headline}
                </Link>
            </h3>
            {excerpt && <p className="mt-2 text-[15px] leading-relaxed text-meta">{excerpt}</p>}
        </article>
    );
}
