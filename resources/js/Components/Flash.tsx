import { usePage } from '@inertiajs/react';

type FlashProps = { status?: string };

export function Flash() {
    const { status } = usePage().props as FlashProps;
    if (!status) return null;
    return (
        <div
            role="status"
            className="mb-4 rounded-md border border-hairline bg-white px-4 py-3 text-sm text-ink"
        >
            {status}
        </div>
    );
}
