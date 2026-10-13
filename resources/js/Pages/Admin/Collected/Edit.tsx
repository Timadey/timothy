import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, router } from '@inertiajs/react';
import type { FormDataValues } from '@inertiajs/core';
import { useState } from 'react';
import { Button } from '@/Components/Button';
import { ConfirmDialog } from '@/Components/ConfirmDialog';
import { Flash } from '@/Components/Flash';

type ItemData = {
    id?: number;
    title: string;
    url: string;
    creator: string;
    item_type: string;
    annotation: string;
    visibility: string;
    tags: string[];
};

const empty: ItemData = {
    title: '',
    url: '',
    creator: '',
    item_type: 'book',
    annotation: '',
    visibility: 'public',
    tags: [],
};

const fieldClass = 'mt-1 w-full rounded-md border border-hairline px-3 py-2 text-sm focus:border-primary';

const types = ['book', 'article', 'video', 'podcast', 'music', 'tool', 'quote', 'website', 'other'];

export default function CollectedEdit({ item }: { item: ItemData | null }) {
    const { data, setData, put, post: submitCreate, processing, errors } = useForm<ItemData>(item ?? empty);
    const [confirming, setConfirming] = useState(false);
    const isNew = !item?.id;

    const update = <K extends keyof ItemData>(key: K, value: FormDataValues<ItemData, K>) => setData(key, value);

    const save = (e: React.FormEvent) => {
        e.preventDefault();
        const opts = { preserveScroll: true };
        if (item?.id) put(`/admin/collected/${item.id}`, opts);
        else submitCreate('/admin/collected', opts);
    };

    const destroy = () => {
        if (!item?.id) return;
        router.delete(`/admin/collected/${item.id}`, { onSuccess: () => setConfirming(false) });
    };

    return (
        <AdminLayout title={item ? `Edit: ${item.title}` : 'Add to collection'}>
            <Flash />
            <form onSubmit={save} className="max-w-2xl space-y-4">
                <div>
                    <label className="text-sm font-medium" htmlFor="item-title">
                        Title
                    </label>
                    <input id="item-title" value={data.title} onChange={(e) => update('title', e.target.value)} className={fieldClass} required />
                    {errors.title && <p className="mt-1 text-sm text-red-700">{errors.title}</p>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="text-sm font-medium" htmlFor="item-type">
                            Type
                        </label>
                        <select id="item-type" value={data.item_type} onChange={(e) => update('item_type', e.target.value)} className={fieldClass}>
                            {types.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium" htmlFor="item-creator">
                            Creator / author
                        </label>
                        <input id="item-creator" value={data.creator} onChange={(e) => update('creator', e.target.value)} className={fieldClass} />
                    </div>
                </div>
                <div>
                    <label className="text-sm font-medium" htmlFor="item-url">
                        URL
                    </label>
                    <input
                        id="item-url"
                        type="url"
                        value={data.url}
                        onChange={(e) => update('url', e.target.value)}
                        className={fieldClass}
                        placeholder="https://…"
                    />
                    {errors.url && <p className="mt-1 text-sm text-red-700">{errors.url}</p>}
                </div>
                <div>
                    <label className="text-sm font-medium" htmlFor="item-annotation">
                        Why it matters (personal annotation)
                    </label>
                    <textarea
                        id="item-annotation"
                        value={data.annotation}
                        onChange={(e) => update('annotation', e.target.value)}
                        rows={4}
                        className={fieldClass}
                    />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="text-sm font-medium" htmlFor="item-visibility">
                            Visibility
                        </label>
                        <select
                            id="item-visibility"
                            value={data.visibility}
                            onChange={(e) => update('visibility', e.target.value)}
                            className={fieldClass}
                        >
                            <option value="public">Public</option>
                            <option value="private">Private</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium" htmlFor="item-tags">
                            Tags (comma-separated)
                        </label>
                        <input
                            id="item-tags"
                            value={data.tags.join(', ')}
                            onChange={(e) =>
                                update(
                                    'tags',
                                    e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                                )
                            }
                            className={fieldClass}
                        />
                    </div>
                </div>

                <div className="flex gap-2 border-t border-hairline pt-4">
                    <Button type="submit" disabled={processing}>
                        {processing ? 'Saving…' : 'Save'}
                    </Button>
                    {item?.id && (
                        <Button variant="secondary" type="button" onClick={() => setConfirming(true)}>
                            Delete
                        </Button>
                    )}
                    <Button variant="ghost" href="/admin/collected" type="button">
                        Back to list
                    </Button>
                </div>
            </form>

            <ConfirmDialog
                open={confirming}
                title="Remove item?"
                message={`“${item?.title}” will be removed from your collection.`}
                onConfirm={destroy}
                onCancel={() => setConfirming(false)}
            />
        </AdminLayout>
    );
}
