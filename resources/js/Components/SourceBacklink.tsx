type Props = { url: string | null | undefined };

export default function SourceBacklink({ url }: Props) {
    if (!url) {
        return null;
    }

    let host: string;
    try {
        host = new URL(url).hostname.replace(/^www\./, '');
    } catch {
        host = 'the original site';
    }

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1 text-[13px] text-meta underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
            Originally published on {host}
            <span aria-hidden="true">↗</span>
        </a>
    );
}
