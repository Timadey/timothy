import { Search } from 'lucide-react';

export function SearchInput({
    value,
    onChange,
    placeholder = 'Search',
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    return (
        <label className="relative block">
            <span className="sr-only">{placeholder}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-meta" />
            <input
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full appearance-none rounded-lg border-0 bg-surface py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-meta focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
        </label>
    );
}
