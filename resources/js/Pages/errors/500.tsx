import PublicLayout from '@/Layouts/PublicLayout';
import { Head, Link } from '@inertiajs/react';

export default function ServerError() {
    return (
        <PublicLayout>
            <Head>
                <title>Something went wrong — Timadey</title>
                <meta name="robots" content="noindex" />
            </Head>
            <div className="mx-auto max-w-3xl px-6 py-24 text-center">
                <p className="text-sm font-semibold uppercase tracking-wider text-meta">500</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Something went wrong</h1>
                <p className="mt-3 text-meta">The error has been logged. Please try again later.</p>
                <div className="mt-6 flex justify-center gap-3">
                    <Link href="/" className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:opacity-80">
                        Back home
                    </Link>
                </div>
            </div>
        </PublicLayout>
    );
}
