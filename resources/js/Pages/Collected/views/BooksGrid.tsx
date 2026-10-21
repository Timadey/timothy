import { CoverImage } from '@/Components/collected/CoverImage';
import { ItemTitle } from '@/Components/collected/ItemTitle';
import type { CollectedItem } from '@/collectedTypes';

export type BooksGridProps = {
    items: CollectedItem[];
    onOpen: (item: CollectedItem) => void;
};

function BookCell({ item, onOpen }: { item: CollectedItem; onOpen: BooksGridProps['onOpen'] }) {
    return (
        <div className="animate-row-in">
            <CoverImage src={item.cover_image} title={item.title} kind="book" className="rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.12)]" />
            <ItemTitle item={item} onOpen={onOpen} className="mt-2.5 block line-clamp-2 text-sm font-medium text-ink" />
            {item.creator && <p className="truncate text-xs text-meta">{item.creator}</p>}
        </div>
    );
}

export function BooksGrid({ items, onOpen }: BooksGridProps) {
    const rail = items.slice(0, 8);

    return (
        <div className="space-y-10">
            <section aria-label="Library">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-meta">Library</h2>
                <ul className="mt-3 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-3">
                    {rail.map((item, index) => (
                        <li
                            key={item.id}
                            className="w-36 shrink-0 snap-start animate-rail-in sm:w-44"
                            style={{ animationDelay: `${index * 30}ms` }}
                        >
                            <BookCell item={item} onOpen={onOpen} />
                        </li>
                    ))}
                </ul>
            </section>

            <section aria-label="All books">
                <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                    {items.map((item) => (
                        <BookCell key={item.id} item={item} onOpen={onOpen} />
                    ))}
                </div>
            </section>
        </div>
    );
}
