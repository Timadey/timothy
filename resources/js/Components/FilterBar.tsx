import { Tag } from './Tag';

export type FilterOption = { label: string; value: string };

export function FilterBar({
    options,
    active,
    onSelect,
    allLabel = 'All',
}: {
    options: FilterOption[];
    active: string;
    onSelect: (value: string) => void;
    allLabel?: string;
}) {
    if (options.length <= 1) {
        return null;
    }

    return (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filters">
            <button type="button" onClick={() => onSelect('')} className="cursor-pointer">
                <Tag label={allLabel} active={active === ''} />
            </button>
            {options.map((o) => (
                <button key={o.value} type="button" onClick={() => onSelect(o.value)} className="cursor-pointer">
                    <Tag label={o.label} active={active === o.value} />
                </button>
            ))}
        </div>
    );
}
