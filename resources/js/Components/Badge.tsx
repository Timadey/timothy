import type { ReactNode } from 'react';

export function Badge({ children }: { children: ReactNode }) {
    return (
        <span className="inline-block rounded-sm border border-hairline bg-surface px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-meta">
            {children}
        </span>
    );
}
