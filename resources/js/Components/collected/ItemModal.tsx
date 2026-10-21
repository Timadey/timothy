import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { ExternalLink, X } from 'lucide-react';
import { Badge } from '@/Components/Badge';
import { Button } from '@/Components/Button';
import { CoverImage } from '@/Components/collected/CoverImage';
import { TYPE_SEGMENTS, VISIT_VERBS, coverKind, type CollectedItem } from '@/collectedTypes';

const FOCUSABLE = 'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])';
const SERIF_TYPES = new Set(['article', 'book', 'quote']);

export function ItemModal({ item, onClose }: { item: CollectedItem | null; onClose: () => void }) {
    const [visible, setVisible] = useState<CollectedItem | null>(item);
    const [closing, setClosing] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (item) {
            setClosing(false);
            setVisible(item);
            return;
        }
        if (!visible) return;
        setClosing(true);
        const timer = window.setTimeout(() => setVisible(null), 200);
        return () => window.clearTimeout(timer);
    }, [item, visible]);

    useEffect(() => {
        if (!visible) return;
        const previous = document.activeElement as HTMLElement | null;
        panelRef.current?.focus();

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onCloseRef.current();
                return;
            }
            if (event.key !== 'Tab' || !panelRef.current) return;
            const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
            if (nodes.length === 0) return;
            const first = nodes[0];
            const last = nodes[nodes.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', onKeyDown);
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = overflow;
            previous?.focus();
        };
    }, [visible]);

    if (!visible) return null;

    const coverBox = visible.item_type === 'video' ? 'w-full max-w-xs' : visible.item_type === 'book' ? 'w-28' : 'w-32';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-md animate-backdrop-in"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onCloseRef.current();
            }}
        >
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="item-modal-title"
                tabIndex={-1}
                className={`relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-hairline bg-white p-6 shadow-2xl focus:outline-none ${
                    closing ? 'animate-modal-out' : 'animate-modal-in'
                }`}
            >
                <button
                    type="button"
                    onClick={() => onCloseRef.current()}
                    aria-label="Close"
                    className="absolute right-4 top-4 rounded-md p-1 text-meta hover:bg-surface hover:text-ink"
                >
                    <X className="h-4 w-4" aria-hidden="true" />
                </button>

                <div className={`mx-auto mb-5 ${coverBox}`}>
                    <CoverImage src={visible.cover_image} title={visible.title} kind={coverKind(visible.item_type)} />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Badge>{visible.item_type}</Badge>
                    <span className="text-xs text-meta">{visible.date}</span>
                </div>
                <h2
                    id="item-modal-title"
                    className={`mt-2 text-2xl font-semibold tracking-tight ${SERIF_TYPES.has(visible.item_type) ? 'font-serif' : ''}`}
                >
                    {visible.title}
                </h2>
                {visible.creator && <p className="mt-1 text-sm text-meta">{visible.creator}</p>}
                {visible.annotation && (
                    <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{visible.annotation}</p>
                )}

                {visible.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                        {visible.tags.map((tag) => (
                            <button
                                key={tag.slug}
                                type="button"
                                className="cursor-pointer"
                                onClick={() => {
                                    router.get(`/collected/${TYPE_SEGMENTS[visible.item_type]}`, { tag: tag.slug });
                                    onCloseRef.current();
                                }}
                            >
                                <span className="inline-block rounded-sm border border-hairline px-2 py-0.5 text-xs text-meta hover:border-primary hover:text-ink">
                                    {tag.name}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {visible.url && (
                    <div className="mt-6 border-t border-hairline pt-4">
                        <Button external href={visible.url}>
                            {VISIT_VERBS[visible.item_type]}
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
