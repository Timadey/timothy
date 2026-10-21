import { ItemTags } from '@/Components/collected/ItemTags';
import { ItemTitle } from '@/Components/collected/ItemTitle';
import type { CollectedItem } from '@/collectedTypes';

export type EditorialListProps = {
    items: CollectedItem[];
    onOpen: (item: CollectedItem) => void;
    lead?: boolean;
};

export function EditorialList({ items, onOpen, lead = true }: EditorialListProps) {
    if (items.length === 0) return null;

    const leadItem = lead ? items[0] : null;
    const rows = leadItem ? items.slice(1) : items;

    return (
        <div>
            {leadItem && (
                <article className="animate-row-in border-b border-hairline pb-8">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                        <span className="text-xs font-semibold uppercase tracking-wide text-meta">{leadItem.item_type}</span>
                        <span className="text-xs text-meta">{leadItem.date}</span>
                    </div>
                    <ItemTitle
                        item={leadItem}
                        onOpen={onOpen}
                        className="mt-2 block font-serif text-3xl font-semibold leading-tight tracking-tight text-ink"
                    />
                    {leadItem.creator && <p className="mt-2 text-sm text-meta">{leadItem.creator}</p>}
                    {leadItem.annotation && (
                        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink">{leadItem.annotation}</p>
                    )}
                    {leadItem.tags.length > 0 && (
                        <div className="mt-3">
                            <ItemTags item={leadItem} />
                        </div>
                    )}
                </article>
            )}
            <div className="divide-y divide-hairline">
                {rows.map((item) => (
                    <article key={item.id} className="animate-row-in py-5 transition hover:bg-surface/60 sm:px-2">
                        <div className="flex flex-wrap items-baseline gap-x-3">
                            <span className="text-xs font-semibold uppercase tracking-wide text-meta">{item.item_type}</span>
                            <span className="text-xs text-meta">{item.date}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                            <div className="min-w-0 flex-1">
                                <ItemTitle item={item} onOpen={onOpen} className="block text-xl font-medium text-ink" />
                                {item.creator && <p className="mt-0.5 text-sm text-meta">{item.creator}</p>}
                                {item.annotation && (
                                    <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-ink">{item.annotation}</p>
                                )}
                            </div>
                            <div className="shrink-0 pt-1">
                                <ItemTags item={item} />
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}
