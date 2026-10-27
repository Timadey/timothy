import { test, expect, vi, afterEach } from 'vitest';
import { router } from '@inertiajs/react';
import { prefetchOnVisibleRef } from '../prefetchOnVisible';

vi.mock('@inertiajs/react', () => ({ router: { prefetch: vi.fn() } }));

class FakeObserver {
    static instances: FakeObserver[] = [];
    cb: IntersectionObserverCallback;
    observed: Element[] = [];
    disconnected = false;

    constructor(cb: IntersectionObserverCallback) {
        // Real IntersectionObserver delivers no callbacks after disconnect().
        this.cb = (entries, observer) => {
            if (this.disconnected) return;
            cb(entries, observer);
        };
        FakeObserver.instances.push(this);
    }

    observe(el: Element) {
        this.observed.push(el);
    }

    disconnect() {
        this.disconnected = true;
    }

    unobserve() {}

    takeRecords(): IntersectionObserverEntry[] {
        return [];
    }

    root = null;
    rootMargin = '';
    thresholds: number[] = [];
}

afterEach(() => {
    FakeObserver.instances = [];
    vi.unstubAllGlobals();
    vi.clearAllMocks();
});

function intersectingEntry(): IntersectionObserverEntry {
    return { isIntersecting: true } as IntersectionObserverEntry;
}

test('observes the element and prefetches the href on first intersection', () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    const el = document.createElement('a');
    const ref = prefetchOnVisibleRef('/writing');

    ref(el);

    expect(FakeObserver.instances).toHaveLength(1);
    const observer = FakeObserver.instances[0];
    expect(observer.observed).toContain(el);

    observer.cb([intersectingEntry()], observer as unknown as IntersectionObserver);

    expect(router.prefetch).toHaveBeenCalledTimes(1);
    expect(router.prefetch).toHaveBeenCalledWith('/writing', { method: 'get' });
    expect(observer.disconnected).toBe(true);

    // Second intersection after disconnect never fires again.
    observer.cb([intersectingEntry()], observer as unknown as IntersectionObserver);
    expect(router.prefetch).toHaveBeenCalledTimes(1);
});

test('does not prefetch when the element never intersects', () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    const ref = prefetchOnVisibleRef('/writing');

    ref(document.createElement('a'));
    FakeObserver.instances[0].cb([{ isIntersecting: false } as IntersectionObserverEntry], FakeObserver.instances[0] as unknown as IntersectionObserver);

    expect(router.prefetch).not.toHaveBeenCalled();
});

test('detaching the ref disconnects the observer', () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    const ref = prefetchOnVisibleRef('/writing');

    ref(document.createElement('a'));
    const observer = FakeObserver.instances[0];
    ref(null);

    expect(observer.disconnected).toBe(true);
    expect(router.prefetch).not.toHaveBeenCalled();
});

test('is a no-op when IntersectionObserver is unavailable (ssr/jsdom)', () => {
    const el = document.createElement('a');

    expect(() => prefetchOnVisibleRef('/writing')(el)).not.toThrow();
    expect(router.prefetch).not.toHaveBeenCalled();
});
