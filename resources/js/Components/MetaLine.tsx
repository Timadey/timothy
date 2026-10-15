export function MetaLine({
    type,
    date,
    readingTime,
    items,
}: {
    type?: string;
    date?: string;
    readingTime?: number;
    items?: string[];
}) {
    const parts = [type, date, readingTime ? `${readingTime} min read` : null, ...(items ?? [])].filter(Boolean);
    return <p className="text-xs text-meta tracking-wide uppercase">{parts.join(' · ')}</p>;
}
