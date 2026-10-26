import { Button } from '@/Components/Button';
import { suggestSeo, type SeoSuggestion } from '@/seoSuggest';
import { useRef, useState } from 'react';

const FIELDS = ['excerpt', 'meta_title', 'meta_description'] as const;

export type SeoField = (typeof FIELDS)[number];

type Props = {
    body: string;
    title: string;
    values: Record<SeoField, string | null>;
    onFill: (field: SeoField, value: string) => void;
    llmEnabled?: boolean;
};

export function SeoSuggestButton({ body, title, values, onFill, llmEnabled = false }: Props) {
    const [busy, setBusy] = useState(false);
    const valuesRef = useRef(values);
    valuesRef.current = values;

    const empty = FIELDS.filter((field) => !(values[field] ?? '').trim());

    const apply = (suggestion: SeoSuggestion) => {
        FIELDS.filter((field) => !(valuesRef.current[field] ?? '').trim()).forEach((field) => {
            if (suggestion[field]) onFill(field, suggestion[field]);
        });
    };

    const suggest = async () => {
        if (!llmEnabled) {
            apply(suggestSeo(body, title));
            return;
        }

        setBusy(true);
        try {
            const xsrf = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '';
            const response = await fetch('/admin/posts/suggest-seo', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': decodeURIComponent(xsrf),
                },
                credentials: 'same-origin',
                body: JSON.stringify({ title, body }),
            });
            if (!response.ok) throw new Error(`suggest-seo failed with ${response.status}`);
            const data = (await response.json()) as Partial<SeoSuggestion>;
            if (
                typeof data.excerpt !== 'string' ||
                typeof data.meta_title !== 'string' ||
                typeof data.meta_description !== 'string'
            ) {
                throw new Error('suggest-seo returned an unexpected shape');
            }
            apply({ excerpt: data.excerpt, meta_title: data.meta_title, meta_description: data.meta_description });
        } catch (error) {
            console.warn('AI suggest failed; falling back to local rules', error);
            apply(suggestSeo(body, title));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Button variant="secondary" type="button" onClick={suggest} disabled={busy || empty.length === 0}>
            {busy ? 'Suggesting…' : 'Suggest from content'}
        </Button>
    );
}
