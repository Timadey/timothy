import { Link } from '@inertiajs/react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'brand' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    href?: string;
    external?: boolean;
    children: ReactNode;
};

const styles = {
    primary: 'bg-[#007aff] text-white hover:bg-[#0056cc]',
    brand: 'bg-primary text-white hover:opacity-80',
    secondary: 'bg-white text-ink border border-hairline hover:bg-surface',
    ghost: 'text-ink hover:underline',
};

const sizes = {
    sm: 'px-4 py-1.5',
    md: 'px-4 py-2',
    lg: 'px-5 py-2.5',
};

export function Button({
    variant = 'primary',
    size = 'md',
    href,
    external = false,
    className = '',
    children,
    ...rest
}: Props) {
    const cls = `inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition disabled:opacity-60 ${sizes[size]} ${styles[variant]} ${className}`;
    if (href && external) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
                {children}
            </a>
        );
    }
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
