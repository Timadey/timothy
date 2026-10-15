import AdminLayout from '@/Layouts/AdminLayout';
import { useForm } from '@inertiajs/react';
import { Button } from '@/Components/Button';
import { Flash } from '@/Components/Flash';

type Section = { id: number; key: string; title: string; body: string | null; visible: boolean; sort_order: number };

const fieldClass = 'mt-1 w-full rounded-md border border-hairline px-3 py-2 text-sm focus:border-primary';

export default function About({ sections }: { sections: Section[] }) {
    const { data, setData, put, processing, errors } = useForm<{ sections: Section[] }>({ sections });

    const setSection = (i: number, patch: Partial<Section>) =>
        setData('sections', data.sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

    const save = (e: React.FormEvent) => {
        e.preventDefault();
        put('/admin/about', { preserveScroll: true });
    };

    return (
        <AdminLayout title="About page">
            <Flash />
            <form onSubmit={save} className="space-y-6">
                {data.sections.map((s, i) => (
                    <div key={s.id} className="rounded-md border border-hairline bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <input
                                    value={s.title}
                                    onChange={(e) => setSection(i, { title: e.target.value })}
                                    className="font-semibold"
                                    aria-label="Section title"
                                />
                                <span className="text-xs uppercase text-meta">{s.key}</span>
                                {errors[`sections.${i}.title`] && (
                                    <span className="text-sm text-red-700">{errors[`sections.${i}.title`]}</span>
                                )}
                            </div>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={s.visible}
                                    onChange={(e) => setSection(i, { visible: e.target.checked })}
                                />
                                Visible
                            </label>
                        </div>
                        <textarea
                            value={s.body ?? ''}
                            onChange={(e) => setSection(i, { body: e.target.value })}
                            rows={8}
                            className={`${fieldClass} mt-3`}
                            placeholder="Markdown welcome…"
                        />
                        {errors[`sections.${i}.body`] && (
                            <p className="mt-1 text-sm text-red-700">{errors[`sections.${i}.body`]}</p>
                        )}
                    </div>
                ))}

                <Button type="submit" disabled={processing}>
                    {processing ? 'Saving…' : 'Save about page'}
                </Button>
            </form>
        </AdminLayout>
    );
}
