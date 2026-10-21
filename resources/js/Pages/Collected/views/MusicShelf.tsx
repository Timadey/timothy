import { Disc3 } from 'lucide-react';
import { CoverImage } from '@/Components/collected/CoverImage';
import { ItemTags } from '@/Components/collected/ItemTags';
import { ItemTitle } from '@/Components/collected/ItemTitle';
import type { CollectedItem } from '@/collectedTypes';

export type MusicShelfProps = {
    items: CollectedItem[];
    onOpen: (item: CollectedItem) => void;
};

function AlbumCell({ item, onOpen }: { item: CollectedItem; onOpen: MusicShelfProps['onOpen'] }) {
    return (
        <div className="animate-row-in">
            <CoverImage src={item.cover_image} title={item.title} kind="music" glyph={Disc3} className="rounded-md border border-hairline" />
            <ItemTitle item={item} onOpen={onOpen} className="mt-2 block truncate text-sm font-medium text-ink" />
            {item.creator && <p className="truncate text-xs text-meta">{item.creator}</p>}
            <div className="mt-1">
                <ItemTags item={item} />
            </div>
        </div>
    );
}

export function MusicShelf({ items, onOpen }: MusicShelfProps) {
    const rail = items.slice(0, 8);

    return (
        <div className="space-y-10">
            <section aria-label="Recently added">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-meta">Recently added</h2>
                <ul className="mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
                    {rail.map((item, index) => (
                        <li
                            key={item.id}
                            className="w-36 shrink-0 snap-start animate-rail-in sm:w-44"
                            style={{ animationDelay: `${index * 40}ms` }}
                        >
                            <AlbumCell item={item} onOpen={onOpen} />
                        </li>
                    ))}
                </ul>
            </section>

            <section aria-label="All music">
                <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
                    {items.map((item) => (
                        <AlbumCell key={item.id} item={item} onOpen={onOpen} />
                    ))}
                </div>
            </section>
        </div>
    );
}
