import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, router } from '@inertiajs/react';
import type { FormDataValues } from '@inertiajs/core';
import { useState } from 'react';
import { Button } from '@/Components/Button';
import { ConfirmDialog } from '@/Components/ConfirmDialog';
import { Flash } from '@/Components/Flash';
import { ITEM_TYPES, TYPE_LABELS } from '@/collectedTypes';

type ItemData = {
    id?: number;
    title: string;
    url: string;
    creator: string;
    item_type: string;
    annotation: string;
    visibility: string;
    tags: string[];
    cover_image: string | null;
};

type ItemForm = Omit<ItemData, 'tags' | 'cover_image'> & {
    tags: string;
    cover_image: string;
    cover_image_file: File | null;
    cover_image_clear: boolean;
};

const empty: ItemForm = {
    title: '',
    url: '',
    creator: '',
    item_type: 'book',
    annotation: '',
    visibility: 'public',
    tags: '',
    cover_image: '',
    cover_image_file: null,
    cover_image_clear: false,
};

const commaList = (value: string): string[] => value.split(',').map((s) => s.trim()).filter(Boolean);

const fieldClass = 'mt-1 w-full rounded-md border border-hairline px-3 py-2 text-sm focus:border-primary';

export default function CollectedEdit({ item }: { item: ItemData | null }) {
    const { data, setData, put, post: submitCreate, processing, errors, transform } = useForm<ItemForm>({
        ...(item ?? empty),
        cover_image: item?.cover_image ?? '',
        cover_image_file: null,
        cover_image_clear: false,
        tags: (item?.tags ?? []).join(', '),
    });
    const [confirming, setConfirming] = useState(false);
    const isNew = !item?.id;

    const update = <K extends keyof ItemForm>(key: K, value: FormDataValues<ItemForm, K>) => setData(key, value);

    const save = (e: React.FormEvent) => {
        e.preventDefault();
        transform((d) => ({ ...d, tags: commaList(d.tags) }));
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
                            {ITEM_TYPES.map((t) => (
                                <option key={t} value={t}>
                                    {TYPE_LABELS[t]}
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
                    <label className="text-sm font-medium" htmlFor="item-cover-url">
                        Cover image URL
                    </label>
                    <input
                        id="item-cover-url"
                        value={data.cover_image}
                        onChange={(e) => {
                            update('cover_image', e.target.value);
                            setData('cover_image_clear', false);
                        }}
                        className={fieldClass}
                        placeholder="https://…"
                    />
                    <p className="mt-1 text-xs text-meta">JPG, PNG or WebP · 2:3 for books, 1:1 for music, 16:9 for video · or paste an image URL</p>
                    {errors.cover_image && <p className="mt-1 text-sm text-red-700">{errors.cover_image}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <div>
                        <label className="text-sm font-medium" htmlFor="item-cover-file">
                            Upload cover
                        </label>
                        <input
                            id="item-cover-file"
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                setData('cover_image_file', e.target.files?.[0] ?? null);
                                setData('cover_image_clear', false);
                            }}
                            className="mt-1 block w-full text-sm text-meta file:mr-3 file:rounded-md file:border file:border-hairline file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-surface"
                        />
                        {errors.cover_image_file && <p className="mt-1 text-sm text-red-700">{errors.cover_image_file}</p>}
                    </div>
                    {(data.cover_image || data.cover_image_file) && (
                        <label className="flex items-center gap-2 text-sm text-meta">
                            <input
                                type="checkbox"
                                checked={data.cover_image_clear}
                                onChange={(e) => setData('cover_image_clear', e.target.checked)}
                            />
                            Remove cover
                        </label>
                    )}
                    {(data.cover_image || data.cover_image_file) && !data.cover_image_clear && (
                        <img
                            src={
                                data.cover_image_file
                                    ? URL.createObjectURL(data.cover_image_file)
                                    : data.cover_image.startsWith('http')
                                      ? data.cover_image
                                      : `/storage/${data.cover_image}`
                            }
                            alt=""
                            className="h-20 rounded-md border border-hairline object-cover"
                        />
                    )}
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
                            value={data.tags}
                            onChange={(e) => update('tags', e.target.value)}
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
