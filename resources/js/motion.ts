function matches(query: string): boolean {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(query).matches
        : false;
}

export function isCoarsePointer(): boolean {
    return matches('(pointer: coarse)');
}

export function prefersReducedMotion(): boolean {
    return matches('(prefers-reduced-motion: reduce)');
}
