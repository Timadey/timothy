import type { ReactNode } from 'react';

const LIGHTS = ['bg-[#ff5f57]', 'bg-[#febc2e]', 'bg-[#28c840]'];

export function MailWindow({ title, toolbar, children }: { title: string; toolbar?: ReactNode; children: ReactNode }) {
    return (
        <div
            className="animate-page-launch overflow-hidden rounded-xl border border-hairline bg-white"
            role="group"
            aria-label={title}
        >
            <div className="relative flex h-10 items-center border-b border-hairline bg-[#f6f6f6] px-4">
                <div className="flex gap-2" aria-hidden="true">
                    {LIGHTS.map((color) => (
                        <span key={color} className={`h-3 w-3 rounded-full ${color} ring-1 ring-black/5`} />
                    ))}
                </div>
                <span className="pointer-events-none absolute inset-x-0 text-center text-sm font-medium text-ink">{title}</span>
            </div>
            {toolbar && (
                <div className="flex flex-wrap items-center gap-3 border-b border-hairline bg-[#f6f6f6]/60 px-4 py-2">{toolbar}</div>
            )}
            {children}
        </div>
    );
}
