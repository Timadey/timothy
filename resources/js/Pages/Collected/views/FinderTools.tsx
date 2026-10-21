import { useRef, useState } from 'react';
import { CoverImage } from '@/Components/collected/CoverImage';
import { TYPE_GLYPHS, type CollectedItem } from '@/collectedTypes';

export type FinderToolsProps = {
    items: CollectedItem[];
    onOpen: (item: CollectedItem) => void;
};

export function FinderTools({ items, onOpen }: FinderToolsProps) {
    const listRef = useRef<HTMLDivElement>(null);
    const cellRefs = useRef<Array<HTMLDivElement | null>>([]);
    const pan = useRef({ active: false, x: 0, y: 0, sx: 0, sy: 0, moved: false });
    const [selected, setSelected] = useState<number | null>(null);

    const columnCount = (): number => {
        const el = listRef.current;
        if (!el) return 1;
        const columns = getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean);
        return Math.max(columns.length, 1);
    };

    const activate = (index: number) => {
        const item = items[index];
        if (item) onOpen(item);
    };

    const focusCell = (index: number) => {
        cellRefs.current[index]?.scrollIntoView({ block: 'nearest' });
        listRef.current?.focus();
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (items.length === 0) return;
        const columns = columnCount();

        if (selected === null) {
            if (['ArrowRight', 'ArrowDown'].includes(event.key)) {
                event.preventDefault();
                setSelected(0);
                focusCell(0);
            } else if (event.key === 'End') {
                event.preventDefault();
                setSelected(items.length - 1);
                focusCell(items.length - 1);
            } else if (event.key === 'Home') {
                event.preventDefault();
                setSelected(0);
                focusCell(0);
            }
            return;
        }

        let next = selected;
        switch (event.key) {
            case 'ArrowRight':
                next = Math.min(selected + 1, items.length - 1);
                break;
            case 'ArrowLeft':
                next = Math.max(selected - 1, 0);
                break;
            case 'ArrowDown':
                next = Math.min(selected + columns, items.length - 1);
                break;
            case 'ArrowUp':
                next = Math.max(selected - columns, 0);
                break;
            case 'Home':
                next = 0;
                break;
            case 'End':
                next = items.length - 1;
                break;
            case 'Enter':
                event.preventDefault();
                activate(selected);
                return;
            case 'Escape':
                event.preventDefault();
                setSelected(null);
                return;
            default:
                return;
        }

        event.preventDefault();
        setSelected(next);
        focusCell(next);
    };

    const onCellClick = (index: number) => {
        if (pan.current.moved) {
            pan.current.moved = false;
            return;
        }
        setSelected(index);
        activate(index);
    };

    const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.pointerType !== 'mouse') return;
        const el = listRef.current;
        if (!el) return;
        pan.current = { active: true, x: event.clientX, y: event.clientY, sx: el.scrollLeft, sy: el.scrollTop, moved: false };
    };

    const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const el = listRef.current;
        if (!pan.current.active || !el) return;
        const dx = event.clientX - pan.current.x;
        const dy = event.clientY - pan.current.y;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) pan.current.moved = true;
        el.scrollLeft = pan.current.sx - dx;
        el.scrollTop = pan.current.sy - dy;
    };

    const endPan = () => {
        pan.current.active = false;
    };

    return (
        <div>
            <div
                ref={listRef}
                role="listbox"
                aria-label="Tools"
                aria-activedescendant={selected !== null && items[selected] ? `tool-opt-${items[selected].id}` : undefined}
                tabIndex={0}
                onKeyDown={onKeyDown}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endPan}
                onPointerLeave={endPan}
                className="max-h-[70vh] cursor-grab overflow-auto p-4 active:cursor-grabbing focus-visible:outline-2"
            >
                <div
                    className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) setSelected(null);
                    }}
                >
                    {items.map((item, index) => (
                        <div
                            key={item.id}
                            id={`tool-opt-${item.id}`}
                            role="option"
                            aria-selected={selected === index}
                            ref={(el) => {
                                cellRefs.current[index] = el;
                            }}
                            onClick={() => onCellClick(index)}
                            className={`flex cursor-pointer select-none flex-col items-center gap-1.5 rounded-md border p-2 text-center transition ${
                                selected === index ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-surface'
                            }`}
                        >
                            <CoverImage
                                src={item.cover_image}
                                title={item.title}
                                kind="other"
                                fit="contain"
                                glyph={TYPE_GLYPHS[item.item_type]}
                                glyphClassName="h-7 w-7 text-ink"
                                className="h-14 w-14 rounded-xl"
                            />
                            <span className="w-full truncate text-xs text-ink">{item.title}</span>
                        </div>
                    ))}
                </div>
            </div>
            <p className="mt-2 text-xs text-meta">Click or Enter to open · Drag or arrow keys to move</p>
        </div>
    );
}
