import type { ComponentType } from 'react';
import type { CollectedItem, ItemType } from '@/collectedTypes';
import { EditorialList } from './EditorialList';
import { BooksGrid } from './BooksGrid';

export type ViewProps = {
    items: CollectedItem[];
    onOpen: (item: CollectedItem) => void;
};
export type ViewComponent = ComponentType<ViewProps>;

const REGISTRY: Partial<Record<ItemType, ViewComponent>> = {
    book: BooksGrid,
    article: EditorialList,
    podcast: EditorialList,
    quote: EditorialList,
    other: EditorialList,
};

export function resolveView(type: ItemType): ViewComponent {
    return REGISTRY[type] ?? EditorialList;
}
