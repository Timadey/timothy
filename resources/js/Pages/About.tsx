import PublicLayout from '@/Layouts/PublicLayout';
import { Head } from '@inertiajs/react';
import { Prose } from '@/Components/Prose';

type SocialLink = { platform: string; url: string; label: string | null };

export default function About({ body_html, social_links, contact_email }: { body_html: string; social_links: SocialLink[]; contact_email: string | null }) {
    return (
        <PublicLayout>
            <Head>
                <title>About — Timadey</title>
                <meta name="description" content="Who I am, what I do, and how to reach me." />
                <meta property="og:type" content="website" />
                <meta property="og:title" content="About — Timadey" />
                <meta property="og:description" content="Who I am, what I do, and how to reach me." />
                <meta property="og:url" content="/about" />
                <link rel="canonical" href="/about" />
                <meta name="twitter:card" content="summary" />
            </Head>

            <div className="mx-auto max-w-3xl px-6 pt-12 pb-16">
                <h1 className="text-3xl font-semibold tracking-tight">About</h1>

                <div className="mt-8 space-y-10">
                    {body_html ? <Prose html={body_html} /> : <p className="text-meta">Nothing here yet.</p>}
                </div>

                {(social_links.length > 0 || contact_email) && (
                    <section className="mt-12 border-t border-hairline pt-8" aria-labelledby="contact-heading">
                        <h2 id="contact-heading" className="text-sm font-semibold uppercase tracking-wider text-meta">
                            Find me
                        </h2>
                        <ul className="mt-4 flex flex-wrap gap-4">
                            {social_links.map((l) => (
                                <li key={l.url}>
                                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
                                        {l.label || l.platform}
                                    </a>
                                </li>
                            ))}
                            {contact_email && (
                                <li>
                                    <a href={`mailto:${contact_email}`} className="text-link hover:underline">
                                        {contact_email}
                                    </a>
                                </li>
                            )}
                        </ul>
                    </section>
                )}
            </div>
        </PublicLayout>
    );
}
