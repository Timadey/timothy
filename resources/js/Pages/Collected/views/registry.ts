import type { ComponentType } from 'react';
import type { CollectedItem, ItemType } from '@/collectedTypes';
import { EditorialList } from './EditorialList';
import { BooksGrid } from './BooksGrid';
import { VideoGrid } from './VideoGrid';
import { MusicShelf } from './MusicShelf';
import { FinderTools } from './FinderTools';

export type ViewProps = {
    items: CollectedItem[];
    onOpen: (item: CollectedItem) => void;
};
export type ViewComponent = ComponentType<ViewProps>;

const REGISTRY: Partial<Record<ItemType, ViewComponent>> = {
    book: BooksGrid,
    video: VideoGrid,
    music: MusicShelf,
    tool: FinderTools,
    article: EditorialList,
    podcast: EditorialList,
    quote: EditorialList,
    other: EditorialList,
};

export function resolveView(type: ItemType): ViewComponent {
    return REGISTRY[type] ?? EditorialList;
}
