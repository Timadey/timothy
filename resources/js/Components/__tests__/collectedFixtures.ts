import type { CollectedItem } from '@/collectedTypes';

export function makeItem(overrides: Partial<CollectedItem> = {}): CollectedItem {
    return {
        id: 1,
        title: 'Systems Design',
        url: 'https://example.com/item',
        creator: 'Donella Meadows',
        item_type: 'book',
        annotation: 'Why it matters',
        date: 'Oct 1, 2026',
        tags: [],
        cover_image: null,
        ...overrides,
    };
}
