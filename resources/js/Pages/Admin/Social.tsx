import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, router } from '@inertiajs/react';
import { Button } from '@/Components/Button';
import { Flash } from '@/Components/Flash';

type SocialLink = { id: number; platform: string; url: string; label: string | null; sort_order: number; visible: boolean };

const fieldClass = 'rounded-md border border-hairline px-3 py-2 text-sm focus:border-primary';

export default function Social({ social_links }: { social_links: SocialLink[] }) {
    const create = useForm({ platform: '', url: '', label: '', visible: true });

    const add = (e: React.FormEvent) => {
        e.preventDefault();
        create.post('/admin/social', { preserveScroll: true, onSuccess: () => create.reset() });
    };

    const save = (link: SocialLink, patch: Partial<SocialLink>) =>
        router.put(
            `/admin/social/${link.id}`,
            { ...link, label: link.label ?? '', ...patch },
            { preserveScroll: true },
        );

    return (
        <AdminLayout title="Social links">
            <Flash />

            <div className="mb-6 space-y-3 rounded-md border border-hairline bg-white p-4">
                <h2 className="text-sm font-semibold">Add a link</h2>
                <form onSubmit={add} className="flex flex-wrap items-end gap-3">
                    <label className="text-sm">
                        Platform
                        <input
                            value={create.data.platform}
                            onChange={(e) => create.setData('platform', e.target.value)}
                            className={`${fieldClass} mt-1 block`}
                            required
                        />
                    </label>
                    <label className="text-sm">
                        URL
                        <input
                            type="url"
                            value={create.data.url}
                            onChange={(e) => create.setData('url', e.target.value)}
                            className={`${fieldClass} mt-1 block w-72`}
                            required
                        />
                    </label>
                    <label className="text-sm">
                        Label
                        <input
                            value={create.data.label}
                            onChange={(e) => create.setData('label', e.target.value)}
                            className={`${fieldClass} mt-1 block`}
                        />
                    </label>
                    <Button type="submit" disabled={create.processing}>
                        Add
                    </Button>
                </form>
                {create.errors.url && <p className="text-sm text-red-700">{create.errors.url}</p>}
            </div>

            <div className="space-y-3">
                {social_links.map((link) => (
                    <div key={link.id} className="flex flex-wrap items-center gap-3 rounded-md border border-hairline bg-white p-3">
                        <input
                            defaultValue={link.platform}
                            onBlur={(e) => save(link, { platform: e.target.value })}
                            className={`${fieldClass} w-32`}
                            aria-label="Platform"
                        />
                        <input
                            defaultValue={link.url}
                            onBlur={(e) => save(link, { url: e.target.value })}
                            className={`${fieldClass} flex-1`}
                            aria-label="URL"
                        />
                        <input
                            defaultValue={link.label ?? ''}
                            onBlur={(e) => save(link, { label: e.target.value })}
                            className={`${fieldClass} w-32`}
                            aria-label="Label"
                        />
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                defaultChecked={link.visible}
                                onChange={(e) => save(link, { visible: e.target.checked })}
                            />
                            Visible
                        </label>
                        <Button
                            variant="secondary"
                            type="button"
                            onClick={() => router.delete(`/admin/social/${link.id}`, { preserveScroll: true })}
                        >
                            Delete
                        </Button>
                    </div>
                ))}
                {social_links.length === 0 && <p className="text-sm text-meta">No social links yet.</p>}
            </div>
        </AdminLayout>
    );
}
