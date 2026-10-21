import { Tag } from '@/Components/Tag';
import { TYPE_SEGMENTS, type CollectedItem } from '@/collectedTypes';

export function ItemTags({ item }: { item: CollectedItem }) {
    if (item.tags.length === 0) return null;

    return (
        <span className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
                <Tag
                    key={tag.slug}
                    label={tag.name}
                    href={`/collected/${TYPE_SEGMENTS[item.item_type]}?tag=${tag.slug}`}
                />
            ))}
        </span>
    );
}
