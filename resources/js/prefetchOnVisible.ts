import { router } from '@inertiajs/react';

/**
 * Inertia's `prefetch` prop has no "visible" mode in @inertiajs/react 3.9
 * (`'mount' | 'hover' | 'click'` only), so list rows that should prefetch when
 * scrolled into view attach this ref instead. The observer disconnects after
 * the first intersection, and repeated `router.prefetch` calls are deduped by
 * Inertia's prefetch cache. Safe under SSR and jsdom (no IntersectionObserver).
 */
export function prefetchOnVisibleRef(href: string): (el: unknown) => void {
    let observer: IntersectionObserver | null = null;

    return (el: unknown) => {
        observer?.disconnect();
        observer = null;

        if (!el || typeof IntersectionObserver === 'undefined') return;

        observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    observer?.disconnect();
                    observer = null;
                    router.prefetch(href, { method: 'get' });
                }
            },
            { rootMargin: '240px 0px' },
        );
        observer.observe(el as Element);
    };
}
