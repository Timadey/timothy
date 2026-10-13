import { createInertiaApp, type ResolvedComponent } from '@inertiajs/react';
import type { Page } from '@inertiajs/core';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';

export default function render(page: Page) {
    return createInertiaApp({
        page,
        render: renderToString,
        resolve: (name) =>
            resolvePageComponent(`./Pages/${name}.tsx`, import.meta.glob('./Pages/**/*.tsx')) as Promise<ResolvedComponent>,
        setup: ({ App, props }) => createElement(App, props),
    });
}
