import { Button } from '@/Components/Button';
import { suggestSeo } from '@/seoSuggest';

const FIELDS = ['excerpt', 'meta_title', 'meta_description'] as const;

export type SeoField = (typeof FIELDS)[number];

type Props = {
    body: string;
    title: string;
    values: Record<SeoField, string>;
    onFill: (field: SeoField, value: string) => void;
};

export function SeoSuggestButton({ body, title, values, onFill }: Props) {
    const empty = FIELDS.filter((field) => !values[field].trim());

    const suggest = () => {
        const suggestion = suggestSeo(body, title);
        empty.forEach((field) => {
            if (suggestion[field]) onFill(field, suggestion[field]);
        });
    };

    return (
        <Button variant="secondary" type="button" onClick={suggest} disabled={empty.length === 0}>
            Suggest from content
        </Button>
    );
}
