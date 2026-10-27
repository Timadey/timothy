import { Link } from '@inertiajs/react';
import { Button } from '@/Components/Button';
import { prefetchOnVisibleRef } from '@/prefetchOnVisible';

export type HeroData = {
    headline: string;
    role: string | null;
    company: string | null;
    company_url: string | null;
    status: string | null;
    avatar_url: string | null;
    logo_url: string | null;
    initials: string;
};

export function Hero({ hero }: { hero: HeroData }) {
    return (
        <section className="mx-auto max-w-5xl px-6 pt-14 pb-10" aria-labelledby="hero-heading">
            {hero.avatar_url ? (
                <img
                    src={hero.avatar_url}
                    alt=""
                    className="h-14 w-14 rounded-full border border-hairline object-cover"
                />
            ) : (
                <span
                    aria-hidden="true"
                    className="flex h-14 w-14 items-center justify-center rounded-full border border-hairline bg-surface text-lg font-semibold text-meta"
                >
                    {hero.initials}
                </span>
            )}
            <h1 id="hero-heading" className="mt-6 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
                {hero.headline}
            </h1>
            {(hero.role || hero.company) && (
                <p className="mt-3 text-sm text-meta">
                    {hero.role && <span>{hero.role}</span>}
                    {hero.role && hero.company && ' at '}
                    {hero.logo_url && hero.company && (
                        <img src={hero.logo_url} alt="" className="mr-1.5 inline-block h-4 w-4 rounded-sm object-contain align-middle" />
                    )}
                    {hero.company &&
                        (hero.company_url ? (
                            <a
                                href={hero.company_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-link hover:underline"
                            >
                                {hero.company}
                            </a>
                        ) : (
                            <span>{hero.company}</span>
                        ))}
                </p>
            )}
            {hero.status && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-meta">{hero.status}</p>}
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Button href="/ask" size="lg" variant="brand">
                    Ask me anything
                </Button>
                <Link href="/writing" ref={prefetchOnVisibleRef('/writing')} className="text-sm font-medium text-link hover:underline">
                    Read what I’ve written
                </Link>
            </div>
        </section>
    );
}
