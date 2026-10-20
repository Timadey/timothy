import AdminLayout from '@/Layouts/AdminLayout';
import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/Components/Button';
import { Flash } from '@/Components/Flash';
import { RichEditor } from '@/Components/RichEditor';
import { PreviewPane } from '@/Components/PreviewPane';

export default function About({ body }: { body: string }) {
    const { data, setData, put, processing, errors } = useForm<{ body: string }>({ body });
    const [preview, setPreview] = useState(false);

    const save = (e: React.FormEvent) => {
        e.preventDefault();
        put('/admin/about', { preserveScroll: true });
    };

    return (
        <AdminLayout title="About page">
            <Flash />
            <form onSubmit={save} className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-medium">About</span>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant={preview ? 'secondary' : 'primary'}
                            onClick={() => setPreview(!preview)}
                        >
                            {preview ? 'Edit' : 'Preview'}
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Saving…' : 'Save about page'}
                        </Button>
                    </div>
                </div>

                {preview ? (
                    <PreviewPane body={data.body} format="html" title="" excerpt="" />
                ) : (
                    <div>
                        <div className="mt-1">
                            <RichEditor value={data.body} onChange={(html) => setData('body', html)} />
                        </div>
                        {errors.body && <p className="mt-1 text-sm text-red-700">{errors.body}</p>}
                    </div>
                )}
            </form>
        </AdminLayout>
    );
}
