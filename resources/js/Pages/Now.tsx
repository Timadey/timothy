import PublicLayout from '@/Layouts/PublicLayout';
import { Head } from '@inertiajs/react';

type Update = { text: string; occurred_at: string | null };
type Section = { key: string; label: string; body: string | null; updates: Update[] };

export default function Now({ sections, last_updated_at }: { sections: Section[]; last_updated_at: string | null }) {
    const updated = last_updated_at
        ? new Date(last_updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : null;

    return (
        <PublicLayout>
            <Head>
                <title>Now — Timadey</title>
                <meta name="description" content="What I am focused on right now." />
            </Head>

            <div className="mx-auto max-w-3xl px-6 pt-12 pb-16">
                <h1 className="text-3xl font-semibold tracking-tight">Now</h1>
                <p className="mt-2 text-meta">What I am up to at the moment — a snapshot, not a live feed.</p>

                <div className="mt-10 space-y-10">
                    {sections.map((s) => (
                        <section key={s.key}>
                            <h2 className="text-sm font-semibold uppercase tracking-wider text-meta">{s.label}</h2>
                            {s.body && <p className="mt-2 text-lg leading-relaxed">{s.body}</p>}
                            {s.updates.length > 0 && (
                                <ul className="mt-4 space-y-3 border-l border-hairline pl-4">
                                    {s.updates.map((u, i) => (
                                        <li key={i}>
                                            <p className="text-sm">{u.text}</p>
                                            {u.occurred_at && <p className="mt-0.5 text-xs text-meta">{u.occurred_at}</p>}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    ))}
                    {sections.length === 0 && <p className="text-meta">Nothing here yet.</p>}
                </div>

                {updated && (
                    <p className="mt-12 border-t border-hairline pt-6 text-xs text-meta">
                        Last updated {updated} — this page is updated manually, not in real time.
                    </p>
                )}
            </div>
        </PublicLayout>
    );
}
