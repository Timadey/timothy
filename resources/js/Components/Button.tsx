import { Link } from '@inertiajs/react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost';
    href?: string;
    children: ReactNode;
};

const styles = {
    primary: 'bg-primary text-white hover:opacity-80',
    secondary: 'bg-white text-ink border border-hairline hover:bg-surface',
    ghost: 'text-ink hover:underline',
};

export function Button({ variant = 'primary', href, className = '', children, ...rest }: Props) {
    const cls = `inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${styles[variant]} ${className}`;
    if (href) {
        return (
            <Link href={href} className={cls}>
                {children}
            </Link>
        );
    }
    return (
        <button className={cls} {...rest}>
            {children}
        </button>
    );
}
