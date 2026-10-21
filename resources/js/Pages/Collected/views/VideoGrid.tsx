import { Play } from 'lucide-react';
import { CoverImage } from '@/Components/collected/CoverImage';
import { ItemTags } from '@/Components/collected/ItemTags';
import { ItemTitle } from '@/Components/collected/ItemTitle';
import type { CollectedItem } from '@/collectedTypes';

export type VideoGridProps = {
    items: CollectedItem[];
    onOpen: (item: CollectedItem) => void;
};

export function VideoGrid({ items, onOpen }: VideoGridProps) {
    return (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
                <li key={item.id} className="animate-row-in">
                    <div className="group overflow-hidden rounded-lg border border-hairline">
                        <div className="relative">
                            <CoverImage
                                src={item.cover_image}
                                title={item.title}
                                kind="video"
                                glyph={Play}
                                glyphClassName="h-12 w-12 rounded-full border border-hairline bg-white/80 p-3 text-ink"
                                className="w-full"
                            />
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.6),transparent)] p-3">
                                <p className="truncate text-sm font-medium text-white">{item.title}</p>
                                {item.creator && <p className="truncate text-xs text-white/80">{item.creator}</p>}
                            </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
                            <ItemTitle item={item} onOpen={onOpen} className="min-w-0 flex-1 truncate text-sm font-medium text-ink" />
                            <span className="text-xs text-meta">{item.date}</span>
                        </div>
                        <div className="px-1 pb-1">
                            <ItemTags item={item} />
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    );
}
