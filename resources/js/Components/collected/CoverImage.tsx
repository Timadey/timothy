import { useState, type ComponentType } from 'react';

type Kind = 'book' | 'music' | 'video' | 'other';
type GlyphComponent = ComponentType<{ className?: string; strokeWidth?: number }>;

const RATIO: Record<Kind, string> = {
    book: 'aspect-[2/3]',
    music: 'aspect-square',
    video: 'aspect-video',
    other: 'aspect-[3/4]',
};

function initials(title: string): string {
    return title
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word.charAt(0))
        .join('')
        .toUpperCase();
}

export function CoverImage({
    src,
    title,
    kind = 'other',
    className = '',
    glyph,
    glyphClassName = 'h-6 w-6 text-meta',
}: {
    src: string | null;
    title: string;
    kind?: Kind;
    className?: string;
    glyph?: GlyphComponent;
    glyphClassName?: string;
}) {
    const [failed, setFailed] = useState(false);
    const shell = `${RATIO[kind]} overflow-hidden ${className}`;

    if (!src || failed) {
        const Glyph = glyph;
        return (
            <div className={`${shell} flex items-center justify-center border border-hairline bg-surface`} aria-hidden="true">
                {Glyph ? (
                    <Glyph className={glyphClassName} strokeWidth={1.5} />
                ) : (
                    <span className="font-serif text-lg text-meta">{initials(title)}</span>
                )}
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={`Cover of ${title}`}
            loading="lazy"
            onError={() => setFailed(true)}
            className={`${shell} object-cover`}
        />
    );
}
