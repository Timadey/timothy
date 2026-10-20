import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Link } from '@inertiajs/react';
import type { FormDataValues } from '@inertiajs/core';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/Components/Button';
import { PreviewPane } from '@/Components/PreviewPane';
import { RichEditor } from '@/Components/RichEditor';
import { Flash } from '@/Components/Flash';

type PostData = {
    id?: number;
    title: string;
    slug: string;
    excerpt: string;
    body: string;
    post_type: string;
    status: string;
    visibility: string;
    featured: boolean;
    cover_image: string;
    meta_title: string;
    meta_description: string;
    tags: string[];
    topics: string[];
    reading_time?: number;
    published_at?: string | null;
};

type PostForm = Omit<PostData, 'tags' | 'topics'> & { tags: string; topics: string };

const empty: PostForm = {
    title: '',
    slug: '',
    excerpt: '',
    body: '',
    post_type: 'article',
    status: 'draft',
    visibility: 'public',
    featured: false,
    cover_image: '',
    meta_title: '',
    meta_description: '',
    tags: '',
    topics: '',
};

const fieldClass = 'mt-1 w-full rounded-md border border-hairline px-3 py-2 text-sm focus:border-primary';

function commaList(value: string): string[] {
    return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

export default function PostEdit({ post }: { post: PostData | null }) {
    const { data, setData, put, post: submitCreate, processing, errors, transform } = useForm<PostForm>({
        ...(post ?? empty),
        tags: (post?.tags ?? []).join(', '),
        topics: (post?.topics ?? []).join(', '),
    });
    const [preview, setPreview] = useState(false);
    const [savedAt, setSavedAt] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);
    const interval = useRef<ReturnType<typeof setInterval> | null>(null);
    const inFlight = useRef(false);
    const isNew = !post?.id;

    const save = () => {
        transform((d) => ({ ...d, tags: commaList(d.tags), topics: commaList(d.topics) }));
        const opts = {
            preserveScroll: true,
            onStart: () => {
                inFlight.current = true;
            },
            onFinish: () => {
                inFlight.current = false;
            },
            onSuccess: () => {
                setDirty(false);
                setSavedAt(new Date().toLocaleTimeString());
            },
        };
        if (post?.id) put(`/admin/posts/${post.id}`, opts);
        else submitCreate('/admin/posts', opts);
    };

    const autosave = () => {
        if (isNew || inFlight.current || processing || !dirty) return;
        save();
    };

    useEffect(() => {
        if (!dirty) return;
        interval.current = setInterval(autosave, 30000);
        return () => {
            if (interval.current) clearInterval(interval.current);
        };
    }, [dirty]);

    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (dirty) e.preventDefault();
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [dirty]);

    const update = <K extends keyof PostForm>(key: K, value: FormDataValues<PostForm, K>) => {
        setData(key, value);
        setDirty(true);
    };

    const saveOnBlur = () => {
        if (!isNew && dirty && !inFlight.current && !processing) save();
    };

    return (
        <AdminLayout title={post ? `Edit: ${post.title}` : 'New post'}>
            <Flash />

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                    <Button variant={preview ? 'secondary' : 'primary'} onClick={() => setPreview(!preview)} type="button">
                        {preview ? 'Edit' : 'Preview'}
                    </Button>
                    <Button variant="secondary" onClick={save} type="button" disabled={processing || (!dirty && !isNew)}>
                        {processing ? 'Saving…' : dirty || isNew ? 'Save' : 'Saved'}
                    </Button>
                    {post?.id && (
                        <Link
                            href={`/admin/posts/${post.id}/preview`}
                            className="inline-flex items-center rounded-md border border-hairline px-4 py-2 text-sm hover:bg-surface"
                            target="_blank"
                        >
                            Open page
                        </Link>
                    )}
                </div>
                <p className="text-xs text-meta" aria-live="polite">
                    {dirty ? 'Unsaved changes' : savedAt ? `Saved ${savedAt}` : 'All changes saved'}
                </p>
            </div>

            {preview ? (
                <PreviewPane body={data.body} format="html" title={data.title} excerpt={data.excerpt} />
            ) : (
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-4 lg:col-span-2">
                        <div>
                            <label className="text-sm font-medium" htmlFor="post-title">
                                Title
                            </label>
                            <input
                                id="post-title"
                                value={data.title}
                                onChange={(e) => update('title', e.target.value)}
                                onBlur={saveOnBlur}
                                className={fieldClass}
                            />
                            {errors.title && <p className="mt-1 text-sm text-red-700">{errors.title}</p>}
                        </div>
                        <div>
                            <label className="text-sm font-medium" htmlFor="post-slug">
                                Slug
                            </label>
                            <input
                                id="post-slug"
                                value={data.slug}
                                onChange={(e) => update('slug', e.target.value)}
                                className={fieldClass}
                                placeholder="auto-generated from title"
                            />
                            {errors.slug && <p className="mt-1 text-sm text-red-700">{errors.slug}</p>}
                        </div>
                        <div>
                            <label className="text-sm font-medium" htmlFor="post-excerpt">
                                Excerpt
                            </label>
                            <textarea
                                id="post-excerpt"
                                value={data.excerpt}
                                onChange={(e) => update('excerpt', e.target.value)}
                                rows={2}
                                className={fieldClass}
                            />
                        </div>
                        <div>
                            <span className="text-sm font-medium" id="post-body-label">
                                Body
                            </span>
                            <div className="mt-1">
                                <RichEditor value={data.body} onChange={(html) => update('body', html)} />
                            </div>
                            {errors.body && <p className="mt-1 text-sm text-red-700">{errors.body}</p>}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium" htmlFor="post-type">
                                Type
                            </label>
                            <select
                                id="post-type"
                                value={data.post_type}
                                onChange={(e) => update('post_type', e.target.value)}
                                className={fieldClass}
                            >
                                <option value="article">Article</option>
                                <option value="note">Note</option>
                                <option value="question">Question</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium" htmlFor="post-status">
                                Status
                            </label>
                            <select
                                id="post-status"
                                value={data.status}
                                onChange={(e) => update('status', e.target.value)}
                                className={fieldClass}
                            >
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                                <option value="archived">Archived</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium" htmlFor="post-visibility">
                                Visibility
                            </label>
                            <select
                                id="post-visibility"
                                value={data.visibility}
                                onChange={(e) => update('visibility', e.target.value)}
                                className={fieldClass}
                            >
                                <option value="public">Public</option>
                                <option value="private">Private</option>
                            </select>
                        </div>
                        <label className="flex items-center gap-2 text-sm font-medium">
                            <input
                                type="checkbox"
                                checked={data.featured}
                                onChange={(e) => update('featured', e.target.checked)}
                            />
                            Featured
                        </label>
                        <div>
                            <label className="text-sm font-medium" htmlFor="post-tags">
                                Tags (comma-separated)
                            </label>
                            <input
                                id="post-tags"
                                value={data.tags}
                                onChange={(e) => update('tags', e.target.value)}
                                className={fieldClass}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium" htmlFor="post-topics">
                                Topics (comma-separated)
                            </label>
                            <input
                                id="post-topics"
                                value={data.topics}
                                onChange={(e) => update('topics', e.target.value)}
                                className={fieldClass}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium" htmlFor="post-meta-title">
                                Meta title
                            </label>
                            <input
                                id="post-meta-title"
                                value={data.meta_title}
                                onChange={(e) => update('meta_title', e.target.value)}
                                className={fieldClass}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium" htmlFor="post-meta-desc">
                                Meta description
                            </label>
                            <textarea
                                id="post-meta-desc"
                                value={data.meta_description}
                                onChange={(e) => update('meta_description', e.target.value)}
                                rows={3}
                                className={fieldClass}
                            />
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
