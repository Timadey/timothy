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
                className="w-full rounded-md border border-hairline bg-white py-2 pl-9 pr-3 text-sm text-ink placeholder:text-meta focus:border-primary"
            />
        </label>
    );
}
