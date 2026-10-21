import { ItemTags } from '@/Components/collected/ItemTags';
import { ItemTitle } from '@/Components/collected/ItemTitle';
import type { CollectedItem } from '@/collectedTypes';

export type WebsiteCardsProps = {
    items: CollectedItem[];
    onOpen: (item: CollectedItem) => void;
};

function hostname(url: string | null): string {
    if (!url) return 'link';
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return 'link';
    }
}

export function WebsiteCards({ items, onOpen }: WebsiteCardsProps) {
    return (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
                <li key={item.id} className="h-full animate-row-in">
                    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-hairline bg-white transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                        <div className="flex items-center gap-2 border-b border-hairline bg-surface px-3 py-2" aria-hidden="true">
                            <span className="h-2.5 w-2.5 rounded-full border border-hairline bg-white" />
                            <span className="h-2.5 w-2.5 rounded-full border border-hairline bg-white" />
                            <span className="h-2.5 w-2.5 rounded-full border border-hairline bg-white" />
                            <span className="ml-1 truncate text-xs text-meta">{hostname(item.url)}</span>
                        </div>
                        <div className="flex flex-1 flex-col gap-2 p-4">
                            <ItemTitle
                                item={item}
                                onOpen={onOpen}
                                className="block font-serif text-lg font-semibold leading-snug text-ink"
                            />
                            {item.creator && <p className="text-sm text-meta">{item.creator}</p>}
                            {item.annotation && <p className="line-clamp-3 text-sm text-ink">{item.annotation}</p>}
                            <div className="mt-auto pt-1">
                                <ItemTags item={item} />
                            </div>
                        </div>
                    </article>
                </li>
            ))}
        </ul>
    );
}
