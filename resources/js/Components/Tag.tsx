import { Link } from '@inertiajs/react';

export function Tag({ label, active = false, href }: { label: string; active?: boolean; href?: string }) {
    const cls = `inline-block rounded-sm border px-2 py-0.5 text-xs ${
        active
            ? 'border-primary bg-primary text-white'
            : 'border-hairline text-meta hover:border-primary hover:text-ink'
    }`;
    if (href) {
        return (
            <Link href={href} className={cls}>
                {label}
            </Link>
        );
    }
    return <span className={cls}>{label}</span>;
}
