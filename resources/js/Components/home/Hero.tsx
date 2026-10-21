import { Link } from '@inertiajs/react';
import { Button } from '@/Components/Button';

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
            <div className="flex items-center gap-4">
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
                {(hero.role || hero.company) && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 py-1 text-sm text-meta">
                        {hero.logo_url && (
                            <img src={hero.logo_url} alt="" className="h-4 w-4 rounded-sm object-contain" />
                        )}
                        {hero.role && <span>{hero.role}</span>}
                        {hero.role && hero.company && <span aria-hidden="true">@</span>}
                        {hero.company &&
                            (hero.company_url ? (
                                <a
                                    href={hero.company_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-ink hover:text-link"
                                >
                                    {hero.company}
                                </a>
                            ) : (
                                <span className="font-medium text-ink">{hero.company}</span>
                            ))}
                    </span>
                )}
            </div>
            <h1 id="hero-heading" className="mt-6 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
                {hero.headline}
            </h1>
            {hero.status && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-meta">{hero.status}</p>}
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Button href="/ask" size="lg" variant="brand">
                    Ask me anything
                </Button>
                <Link href="/writing" className="text-sm font-medium text-link hover:underline">
                    Read what I’ve written
                </Link>
            </div>
        </section>
    );
}
