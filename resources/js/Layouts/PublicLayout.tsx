import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { MobileDrawer } from '@/Components/MobileDrawer';
import { navItems } from '@/nav';
import { useScrollAwareVisibility } from '@/scrollVisibility';

type SocialLink = { platform: string; url: string; label: string | null };

export default function PublicLayout({ children }: { children: ReactNode }) {
    const { url, props } = usePage();
    const current = url.split('?')[0];
    const socialLinks = ((props as { social_links?: SocialLink[] }).social_links ?? []);
    const headerVisible = useScrollAwareVisibility();

    return (
        <div className="flex min-h-screen flex-col">
            <a
                href="#main"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
            >
                Skip to content
            </a>
            <header
                className={`sticky top-0 z-30 bg-white/90 backdrop-blur transition-transform duration-300 md:border-b md:border-hairline ${
                    headerVisible ? 'translate-y-0' : '-translate-y-full'
                }`}
            >
                <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 md:py-3">
                    <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-primary md:text-lg">
                        <img src="/images/logo-mark.png" alt="Timadey" width={28} height={28} className="rounded-lg" />
                        Timadey
                    </Link>
                    <nav className="hidden gap-5 md:flex" aria-label="Primary">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`text-sm font-medium ${
                                    current === item.href ? 'text-primary' : 'text-meta hover:text-ink'
                                }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </header>
            <main id="main" className="flex-1">
                {children}
            </main>
            <footer className="md:border-t md:border-hairline">
                <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-8 text-xs text-meta sm:flex-row sm:justify-between">
                    <span>© {new Date().getFullYear()} Timadey</span>
                    <div className="flex flex-wrap gap-4">
                        <Link href="/activity" className="hover:text-ink">
                            Activity
                        </Link>
                        <Link href="/writing" className="hover:text-ink">
                            Writing
                        </Link>
                        <Link href="/ask" className="hover:text-ink">
                            Ask me anything
                        </Link>
                        <a href="/rss.xml" className="hover:text-ink">
                            RSS
                        </a>
                        {socialLinks.map((l) => (
                            <a
                                key={l.url}
                                href={l.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-ink"
                            >
                                {l.label || l.platform}
                            </a>
                        ))}
                    </div>
                </div>
            </footer>
            <MobileDrawer current={current} />
        </div>
    );
}
