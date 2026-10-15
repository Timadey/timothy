import { useForm } from '@inertiajs/react';
import { Button } from '@/Components/Button';
import { PreviewPane } from '@/Components/PreviewPane';

export type NoteFormData = {
    id?: number;
    title: string | null;
    body: string;
    status: string;
    visibility: string;
    tags: string[];
    slug?: string;
};

type Props = {
    note: NoteFormData | null;
    showPreview?: boolean;
    onSaved?: () => void;
};

const fieldClass = 'mt-1 w-full rounded-md border border-hairline px-3 py-2 text-sm focus:border-primary';

function commaList(value: string): string[] {
    return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

export function QuickComposer({ note, showPreview = true, onSaved }: Props) {
    const { data, setData, errors, processing, transform, post, put } = useForm({
        title: note?.title ?? '',
        body: note?.body ?? '',
        status: note?.status ?? 'draft',
        visibility: note?.visibility ?? 'public',
        tags: note?.tags ?? [],
        post_type: 'note',
    });

    const canPublish = data.body.trim().length > 0;

    const submit = (status: 'draft' | 'published') => {
        if (status === 'published' && !canPublish) return;
        transform((d: typeof data) => ({
            ...d,
            status,
            title: (d.title ?? '').trim() ? (d.title ?? '').trim() : null,
        }));
        const opts = { preserveScroll: true, onSuccess: () => onSaved?.() };
        if (note?.id) put(`/admin/notes/${note.id}`, opts);
        else post('/admin/notes', opts);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit('published');
        }
    };

    const editor = (
        <div className="space-y-4">
            <div>
                <label className="text-sm font-medium" htmlFor="note-title">
                    Title <span className="font-normal text-meta">(optional)</span>
                </label>
                <input
                    id="note-title"
                    value={data.title}
                    onChange={(e) => setData('title', e.target.value)}
                    className={fieldClass}
                    placeholder="Add a title (optional)"
                />
                {errors.title && <p className="mt-1 text-sm text-red-700">{errors.title}</p>}
            </div>
            <div>
                <label className="text-sm font-medium" htmlFor="note-body">
                    Note
                </label>
                <textarea
                    id="note-body"
                    value={data.body}
                    onChange={(e) => setData('body', e.target.value)}
                    onKeyDown={onKeyDown}
                    rows={showPreview ? 16 : 12}
                    className={`${fieldClass} font-mono text-sm`}
                    placeholder="What's on your mind?"
                    autoFocus={!note?.id}
                />
                {errors.body && <p className="mt-1 text-sm text-red-700">{errors.body}</p>}
            </div>
            <div>
                <label className="text-sm font-medium" htmlFor="note-tags">
                    Tags <span className="font-normal text-meta">(comma-separated)</span>
                </label>
                <input
                    id="note-tags"
                    value={data.tags.join(', ')}
                    onChange={(e) => setData('tags', commaList(e.target.value))}
                    className={fieldClass}
                />
                {errors.tags && <p className="mt-1 text-sm text-red-700">{errors.tags}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="secondary" onClick={() => submit('draft')} disabled={processing}>
                    {processing ? 'Saving…' : 'Save draft'}
                </Button>
                <Button type="button" onClick={() => submit('published')} disabled={processing || !canPublish}>
                    Publish
                </Button>
                <span className="text-xs text-meta">⌘↵ to publish</span>
            </div>
        </div>
    );

    if (!showPreview) {
        return editor;
    }

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            {editor}
            <PreviewPane body={data.body} title={data.title ?? ''} excerpt="" />
        </div>
    );
}
