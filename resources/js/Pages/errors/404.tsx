import PublicLayout from '@/Layouts/PublicLayout';
import { Head, Link } from '@inertiajs/react';

export default function NotFound() {
    return (
        <PublicLayout>
            <Head>
                <title>Page not found — Timadey</title>
                <meta name="robots" content="noindex" />
            </Head>
            <div className="mx-auto max-w-3xl px-6 py-24 text-center">
                <p className="text-sm font-semibold uppercase tracking-wider text-meta">404</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">This page doesn&rsquo;t exist</h1>
                <p className="mt-3 text-meta">It may have moved, or it was never here.</p>
                <div className="mt-6 flex justify-center gap-3">
                    <Link href="/" className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:opacity-80">
                        Back home
                    </Link>
                    <Link href="/search" className="rounded-md border border-hairline px-4 py-2 text-sm hover:bg-surface">
                        Search the site
                    </Link>
                </div>
            </div>
        </PublicLayout>
    );
}
