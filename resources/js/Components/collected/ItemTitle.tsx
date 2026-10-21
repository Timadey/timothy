import type { CollectedItem } from '@/collectedTypes';

export function ItemTitle({
    item,
    onOpen,
    className = '',
}: {
    item: CollectedItem;
    onOpen: (item: CollectedItem) => void;
    className?: string;
}) {
    if (item.annotation) {
        return (
            <button
                type="button"
                onClick={() => onOpen(item)}
                className={`cursor-pointer text-left hover:text-link ${className}`}
            >
                {item.title}
            </button>
        );
    }
    if (item.url) {
        return (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className={`hover:text-link ${className}`}>
                {item.title} <span aria-hidden="true">↗</span>
            </a>
        );
    }
    return <p className={className}>{item.title}</p>;
}
