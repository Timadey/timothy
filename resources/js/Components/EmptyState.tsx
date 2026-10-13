export function EmptyState({ title, hint }: { title: string; hint?: string }) {
    return (
        <div className="border border-hairline rounded-md px-6 py-12 text-center">
            <p className="text-ink font-medium">{title}</p>
            {hint && <p className="mt-1 text-sm text-meta">{hint}</p>}
        </div>
    );
}
