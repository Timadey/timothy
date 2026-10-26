export type SeoSuggestion = {
    excerpt: string;
    meta_title: string;
    meta_description: string;
};

const EXCERPT_MAX = 280;
const DESCRIPTION_MAX = 160;

function normalize(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}

function bodyText(html: string): string {
    if (!html.trim()) return '';

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const paragraphs = Array.from(doc.body.querySelectorAll('p'))
        .map((p) => normalize(p.textContent ?? ''))
        .filter(Boolean);

    if (paragraphs.length > 0) return paragraphs.join(' ');

    return normalize(doc.body.textContent ?? '');
}

function clamp(text: string, max: number): string {
    const trimmed = text.trim();
    if (trimmed.length <= max) return trimmed;

    const slice = trimmed.slice(0, max);
    const boundaries = [slice.lastIndexOf('.'), slice.lastIndexOf('!'), slice.lastIndexOf('?')];
    const sentenceEnd = Math.max(...boundaries);

    if (sentenceEnd >= Math.floor(max / 2)) {
        return slice.slice(0, sentenceEnd + 1).trim();
    }

    const wordCut = trimmed.slice(0, max - 1);
    const lastSpace = wordCut.lastIndexOf(' ');

    return `${(lastSpace > 0 ? wordCut.slice(0, lastSpace) : wordCut).trim()}…`;
}

export function suggestSeo(body: string, title: string): SeoSuggestion {
    const text = bodyText(body);

    return {
        excerpt: clamp(text, EXCERPT_MAX),
        meta_title: title.trim(),
        meta_description: clamp(text, DESCRIPTION_MAX),
    };
}
