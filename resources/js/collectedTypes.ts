import type { LucideIcon } from 'lucide-react';
import { BookOpen, Bookmark, Disc3, Globe, Mic, Newspaper, Play, Quote, Wrench } from 'lucide-react';

export type ItemType = 'book' | 'article' | 'video' | 'podcast' | 'music' | 'tool' | 'quote' | 'website' | 'other';

export const ITEM_TYPES: ItemType[] = ['book', 'article', 'video', 'podcast', 'music', 'tool', 'quote', 'website', 'other'];

export const TYPE_LABELS: Record<ItemType, string> = {
    book: 'Books',
    article: 'Articles',
    video: 'Videos',
    podcast: 'Podcasts',
    music: 'Music',
    tool: 'Tools',
    quote: 'Quotes',
    website: 'Websites',
    other: 'Other',
};

export const TYPE_SEGMENTS: Record<ItemType, string> = {
    book: 'books',
    article: 'articles',
    video: 'videos',
    podcast: 'podcasts',
    music: 'music',
    tool: 'tools',
    quote: 'quotes',
    website: 'websites',
    other: 'others',
};

export const VISIT_VERBS: Record<ItemType, string> = {
    book: 'Read',
    article: 'Read',
    video: 'Watch',
    podcast: 'Listen',
    music: 'Listen',
    tool: 'Visit',
    quote: 'View',
    website: 'Visit',
    other: 'Open',
};

export const TYPE_GLYPHS: Record<ItemType, LucideIcon> = {
    book: BookOpen,
    article: Newspaper,
    video: Play,
    podcast: Mic,
    music: Disc3,
    tool: Wrench,
    quote: Quote,
    website: Globe,
    other: Bookmark,
};

export function coverKind(type: ItemType): 'book' | 'music' | 'video' | 'other' {
    if (type === 'book' || type === 'music' || type === 'video') return type;
    return 'other';
}

export type CollectedTag = { name: string; slug: string };

export type CollectedItem = {
    id: number;
    title: string;
    url: string | null;
    creator: string | null;
    item_type: ItemType;
    annotation: string | null;
    date: string;
    tags: CollectedTag[];
    cover_image: string | null;
};

export type PageLink = { url: string | null; label: string; active: boolean };

export type Paginated<T> = { data: T[]; links: PageLink[]; total: number };

export type CategoryTile = { type: ItemType; label: string; count: number; href: string };
