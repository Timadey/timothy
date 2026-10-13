export function MetaLine({ type, date, readingTime }: { type?: string; date?: string; readingTime?: number }) {
    const parts = [type, date, readingTime ? `${readingTime} min read` : null].filter(Boolean);
    return <p className="text-xs text-meta tracking-wide uppercase">{parts.join(' · ')}</p>;
}
