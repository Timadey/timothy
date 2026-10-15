import '../css/app.css';
import '@vitejs/plugin-react/preamble';
import { createInertiaApp, type ResolvedComponent } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';

createInertiaApp({
    resolve: (name) =>
        resolvePageComponent(`./Pages/${name}.tsx`, import.meta.glob('./Pages/**/*.tsx')) as Promise<ResolvedComponent>,
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
});
