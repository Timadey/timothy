import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, router } from '@inertiajs/react';
import { Button } from '@/Components/Button';
import { Flash } from '@/Components/Flash';

type Term = { id: number; name: string; slug: string; posts_count: number };

function TermList({ kind, terms }: { kind: 'tag' | 'topic'; terms: Term[] }) {
    const create = useForm({ kind, name: '' });

    const add = (e: React.FormEvent) => {
        e.preventDefault();
        create.post('/admin/tags', { preserveScroll: true, onSuccess: () => create.reset('name') });
    };

    return (
        <div className="rounded-md border border-hairline bg-white p-4">
            <h2 className="font-semibold">{kind === 'tag' ? 'Tags' : 'Topics'}</h2>
            <form onSubmit={add} className="mt-3 flex gap-2">
                <input
                    value={create.data.name}
                    onChange={(e) => create.setData('name', e.target.value)}
                    placeholder={`New ${kind}…`}
                    className="flex-1 rounded-md border border-hairline px-3 py-2 text-sm"
                    required
                />
                <Button type="submit" disabled={create.processing}>
                    Add
                </Button>
            </form>
            {create.errors.name && <p className="mt-1 text-sm text-red-700">{create.errors.name}</p>}

            <ul className="mt-4 divide-y divide-hairline">
                {terms.map((t) => (
                    <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                        <span>
                            {t.name} <span className="text-meta">({t.posts_count})</span>
                        </span>
                        <Button variant="ghost" type="button" onClick={() => router.delete(`/admin/tags/${kind}/${t.id}`, { preserveScroll: true })}>
                            Delete
                        </Button>
                    </li>
                ))}
                {terms.length === 0 && <li className="py-2 text-sm text-meta">None yet.</li>}
            </ul>
        </div>
    );
}

export default function Tags({ tags, topics }: { tags: Term[]; topics: Term[] }) {
    return (
        <AdminLayout title="Tags & topics">
            <Flash />
            <div className="grid gap-6 md:grid-cols-2">
                <TermList kind="tag" terms={tags} />
                <TermList kind="topic" terms={topics} />
            </div>
        </AdminLayout>
    );
}
