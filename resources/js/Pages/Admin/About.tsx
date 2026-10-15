import AdminLayout from '@/Layouts/AdminLayout';
import { useForm } from '@inertiajs/react';
import { Button } from '@/Components/Button';
import { Flash } from '@/Components/Flash';
import { RichEditor } from '@/Components/RichEditor';

export default function About({ body }: { body: string }) {
    const { data, setData, put, processing, errors } = useForm<{ body: string }>({ body });

    const save = (e: React.FormEvent) => {
        e.preventDefault();
        put('/admin/about', { preserveScroll: true });
    };

    return (
        <AdminLayout title="About page">
            <Flash />
            <form onSubmit={save} className="space-y-4">
                <div>
                    <span className="text-sm font-medium">About</span>
                    <div className="mt-1">
                        <RichEditor value={data.body} onChange={(html) => setData('body', html)} />
                    </div>
                    {errors.body && <p className="mt-1 text-sm text-red-700">{errors.body}</p>}
                </div>

                <Button type="submit" disabled={processing}>
                    {processing ? 'Saving…' : 'Save about page'}
                </Button>
            </form>
        </AdminLayout>
    );
}
