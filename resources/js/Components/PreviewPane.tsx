import { useEffect, useState } from 'react';
import { Prose } from './Prose';

export function PreviewPane({ markdown, title, excerpt }: { markdown: string; title: string; excerpt: string }) {
    const [html, setHtml] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const id = setTimeout(async () => {
            try {
                const xsrf = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '';
                const res = await fetch('/admin/preview-markdown', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': decodeURIComponent(xsrf),
                    },
                    body: JSON.stringify({ markdown }),
                });
                if (!res.ok) throw new Error('Preview failed');
                const data = await res.json();
                setHtml(data.html);
                setError(null);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Preview failed');
            }
        }, 400);
        return () => clearTimeout(id);
    }, [markdown]);

    return (
        <article className="rounded-md border border-hairline bg-white p-8">
            {title && <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>}
            {excerpt && <p className="mt-2 text-meta">{excerpt}</p>}
            <hr className="my-6 border-hairline" />
            {error && <p className="text-sm text-red-700">{error}</p>}
            <Prose html={html} />
        </article>
    );
}
