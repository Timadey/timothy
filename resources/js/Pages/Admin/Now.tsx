import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { Button } from '@/Components/Button';
import { Flash } from '@/Components/Flash';

type Section = { id: number; key: string; label: string; body: string | null; visible: boolean; sort_order: number };
type Update = { id?: number; now_section_id: number; text: string; occurred_at: string | null; visible: boolean };

const fieldClass = 'mt-1 w-full rounded-md border border-hairline px-3 py-2 text-sm focus:border-primary';

export default function Now({ sections, updates }: { sections: Section[]; updates: Update[]; lastUpdatedAt: string | null }) {
    const { data, setData, put, processing, errors } = useForm<{ sections: Section[]; updates: Update[] }>({
        sections,
        updates,
    });

    const setSection = (i: number, patch: Partial<Section>) =>
        setData('sections', data.sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

    const setUpdates = (next: Update[]) => setData('updates', next);

    const addUpdate = (sectionId: number) =>
        setUpdates([...data.updates, { now_section_id: sectionId, text: '', occurred_at: null, visible: true }]);

    const save = (e: React.FormEvent) => {
        e.preventDefault();
        put('/admin/now', { preserveScroll: true });
    };

    return (
        <AdminLayout title="Now page">
            <Flash />
            <form onSubmit={save} className="space-y-6">
                {data.sections.map((s, i) => (
                    <div key={s.id} className="rounded-md border border-hairline bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <span className="font-semibold">{s.label}</span>
                                <span className="text-xs uppercase text-meta">{s.key}</span>
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
                            rows={4}
                            className={`${fieldClass} mt-3`}
                            placeholder={`What are you ${s.label.toLowerCase()}?`}
                        />
                        {errors[`sections.${i}.body`] && (
                            <p className="mt-1 text-sm text-red-700">{errors[`sections.${i}.body`]}</p>
                        )}

                        <div className="mt-4 space-y-2 border-t border-hairline pt-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Updates</span>
                                <Button variant="secondary" type="button" onClick={() => addUpdate(s.id)}>
                                    Add update
                                </Button>
                            </div>
                            {data.updates
                                .filter((u) => u.now_section_id === s.id)
                                .map((u) => {
                                    const idx = data.updates.indexOf(u);
                                    return (
                                        <div key={idx} className="flex items-start gap-2">
                                            <input
                                                type="date"
                                                value={(u.occurred_at ?? '').slice(0, 10)}
                                                onChange={(e) =>
                                                    setUpdates(
                                                        data.updates.map((x, j) =>
                                                            j === idx ? { ...x, occurred_at: e.target.value } : x,
                                                        ),
                                                    )
                                                }
                                                className="w-40 rounded-md border border-hairline px-2 py-2 text-sm"
                                            />
                                            <input
                                                value={u.text}
                                                onChange={(e) =>
                                                    setUpdates(
                                                        data.updates.map((x, j) =>
                                                            j === idx ? { ...x, text: e.target.value } : x,
                                                        ),
                                                    )
                                                }
                                                className="flex-1 rounded-md border border-hairline px-3 py-2 text-sm"
                                                placeholder="Update…"
                                            />
                                            {errors[`updates.${idx}.text`] && (
                                                <p className="w-full text-sm text-red-700">{errors[`updates.${idx}.text`]}</p>
                                            )}
                                            <Button
                                                variant="ghost"
                                                type="button"
                                                onClick={() => setUpdates(data.updates.filter((_, j) => j !== idx))}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                ))}

                <Button type="submit" disabled={processing}>
                    {processing ? 'Saving…' : 'Save now page'}
                </Button>
            </form>
        </AdminLayout>
    );
}
