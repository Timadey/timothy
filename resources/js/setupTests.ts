import '@testing-library/jest-dom/vitest';

// ProseMirror asks the DOM for layout rects; jsdom has no layout engine.
if (typeof Range !== 'undefined' && typeof Range.prototype.getClientRects !== 'function') {
    Object.defineProperty(Range.prototype, 'getClientRects', {
        configurable: true,
        writable: true,
        value: () => Object.assign([], { item: () => null }) as unknown as DOMRectList,
    });
}
if (typeof Range !== 'undefined' && typeof Range.prototype.getBoundingClientRect !== 'function') {
    Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
        configurable: true,
        writable: true,
        value: () => new DOMRect(),
    });
}
