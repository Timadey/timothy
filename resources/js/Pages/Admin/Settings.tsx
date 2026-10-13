import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/Components/Button';
import { ConfirmDialog } from '@/Components/ConfirmDialog';
import { Flash } from '@/Components/Flash';

type Settings = { site_title: string; tagline: string; footer_text: string };

const fieldClass = 'mt-1 w-full rounded-md border border-hairline px-3 py-2 text-sm focus:border-primary';

export default function SettingsPage({ settings }: { settings: Settings }) {
    const { data, setData, put, processing, errors } = useForm<Settings>(settings);
    const [confirming, setConfirming] = useState(false);

    const save = (e: React.FormEvent) => {
        e.preventDefault();
        put('/admin/settings', { preserveScroll: true });
    };

    return (
        <AdminLayout title="Settings">
            <Flash />
            <form onSubmit={save} className="max-w-xl space-y-4">
                <div>
                    <label className="text-sm font-medium" htmlFor="site-title">
                        Site title
                    </label>
                    <input
                        id="site-title"
                        value={data.site_title}
                        onChange={(e) => setData('site_title', e.target.value)}
                        className={fieldClass}
                        required
                    />
                    {errors.site_title && <p className="mt-1 text-sm text-red-700">{errors.site_title}</p>}
                </div>
                <div>
                    <label className="text-sm font-medium" htmlFor="tagline">
                        Tagline
                    </label>
                    <input id="tagline" value={data.tagline} onChange={(e) => setData('tagline', e.target.value)} className={fieldClass} />
                </div>
                <div>
                    <label className="text-sm font-medium" htmlFor="footer-text">
                        Footer text
                    </label>
                    <input id="footer-text" value={data.footer_text} onChange={(e) => setData('footer_text', e.target.value)} className={fieldClass} />
                </div>
                <Button type="submit" disabled={processing}>
                    {processing ? 'Saving…' : 'Save settings'}
                </Button>
            </form>

            <div className="mt-10 max-w-xl rounded-md border border-red-300 bg-white p-4">
                <h2 className="font-semibold">Danger zone</h2>
                <p className="mt-1 text-sm text-meta">
                    Remove all demo content (posts, projects, collected items flagged as demo). This cannot be undone.
                </p>
                <Button variant="secondary" type="button" onClick={() => setConfirming(true)}>
                    Remove all demo content
                </Button>
            </div>

            <ConfirmDialog
                open={confirming}
                title="Remove demo content?"
                message="Every row with is_demo = true will be permanently deleted."
                confirmLabel="Remove"
                onConfirm={() => {
                    setConfirming(false);
                    router.delete('/admin/settings/demo-content', { preserveScroll: true });
                }}
                onCancel={() => setConfirming(false)}
            />
        </AdminLayout>
    );
}
