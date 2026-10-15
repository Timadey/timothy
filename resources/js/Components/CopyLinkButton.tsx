import { useState } from 'react';

export function CopyLinkButton({ slug }: { slug: string }) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(`${window.location.origin}/notes/${slug}`);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            /* clipboard unavailable */
        }
    };

    return (
        <button
            type="button"
            onClick={copy}
            aria-label={copied ? 'Copied' : 'Copy link'}
            className="text-xs text-meta transition-colors hover:text-ink"
        >
            {copied ? 'Copied!' : 'Copy link'}
        </button>
    );
}
