import PublicLayout from '@/Layouts/PublicLayout';
import { Head } from '@inertiajs/react';
import { MessageCircle } from 'lucide-react';

const suggested = [
    'What kinds of problems is Timadey most interested in solving?',
    'What is Timadey currently building?',
    'Which articles should I read to understand the worldview?',
];

export default function Ask() {
    return (
        <PublicLayout>
            <Head>
                <title>Ask Timadey</title>
                <meta
                    name="description"
                    content="An AI guide to the published writing, projects, and ideas on this site — arriving in Phase 3."
                />
            </Head>
            <div className="mx-auto max-w-3xl px-6 pt-12 pb-16">
                <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    <h1 className="text-3xl font-semibold tracking-tight">Ask Timadey</h1>
                </div>
                <p className="mt-4 max-w-2xl text-lg text-ink">
                    An AI guide to the published writing, projects, and ideas on this site.
                </p>
                <div className="mt-6 rounded-md border border-hairline bg-surface px-5 py-4 text-sm text-meta">
                    Arriving in Phase 3. This page will answer questions using only published material on this site,
                    with links back to the sources — never invented facts.
                </div>
                <h2 className="mt-10 text-sm font-semibold uppercase tracking-wider text-meta">Questions it will answer</h2>
                <ul className="mt-4 divide-y divide-hairline">
                    {suggested.map((q) => (
                        <li key={q} className="py-3 text-ink opacity-60">
                            {q}
                        </li>
                    ))}
                </ul>
            </div>
        </PublicLayout>
    );
}
