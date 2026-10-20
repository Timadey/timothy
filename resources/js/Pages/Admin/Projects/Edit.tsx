import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, router } from '@inertiajs/react';
import type { FormDataValues } from '@inertiajs/core';
import { useState } from 'react';
import { Button } from '@/Components/Button';
import { ConfirmDialog } from '@/Components/ConfirmDialog';
import { RichEditor } from '@/Components/RichEditor';
import { Flash } from '@/Components/Flash';

type ProjectData = {
    id?: number;
    name: string;
    slug: string;
    summary: string;
    description: string;
    status: string;
    visibility: string;
    cover_image: string;
    repository_url: string;
    live_url: string;
    started_at: string;
    completed_at: string;
    featured: boolean;
    tags: string[];
};

type ProjectForm = Omit<ProjectData, 'tags'> & { tags: string };

const empty: ProjectForm = {
    name: '',
    slug: '',
    summary: '',
    description: '',
    status: 'idea',
    visibility: 'public',
    cover_image: '',
    repository_url: '',
    live_url: '',
    started_at: '',
    completed_at: '',
    featured: false,
    tags: '',
};

const commaList = (value: string): string[] => value.split(',').map((s) => s.trim()).filter(Boolean);

const fieldClass = 'mt-1 w-full rounded-md border border-hairline px-3 py-2 text-sm focus:border-primary';

const statuses = ['idea', 'exploring', 'building', 'active', 'paused', 'completed'];

export default function ProjectEdit({ project }: { project: ProjectData | null }) {
    const { data, setData, put, post: submitCreate, processing, errors, transform } = useForm<ProjectForm>({
        ...(project ?? empty),
        tags: (project?.tags ?? []).join(', '),
    });
    const [confirming, setConfirming] = useState(false);
    const isNew = !project?.id;

    const update = <K extends keyof ProjectForm>(key: K, value: FormDataValues<ProjectForm, K>) => setData(key, value);

    const save = (e: React.FormEvent) => {
        e.preventDefault();
        transform((d) => ({ ...d, tags: commaList(d.tags) }));
        const opts = { preserveScroll: true };
        if (project?.id) put(`/admin/projects/${project.id}`, opts);
        else submitCreate('/admin/projects', opts);
    };

    const destroy = () => {
        if (!project?.id) return;
        router.delete(`/admin/projects/${project.id}`, { onSuccess: () => setConfirming(false) });
    };

    return (
        <AdminLayout title={project ? `Edit: ${project.name}` : 'New project'}>
            <Flash />
            <form onSubmit={save} className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                    <div>
                        <label className="text-sm font-medium" htmlFor="project-name">
                            Name
                        </label>
                        <input id="project-name" value={data.name} onChange={(e) => update('name', e.target.value)} className={fieldClass} required />
                        {errors.name && <p className="mt-1 text-sm text-red-700">{errors.name}</p>}
                    </div>
                    <div>
                        <label className="text-sm font-medium" htmlFor="project-slug">
                            Slug
                        </label>
                        <input
                            id="project-slug"
                            value={data.slug}
                            onChange={(e) => update('slug', e.target.value)}
                            className={fieldClass}
                            placeholder="auto-generated from name"
                        />
                        {errors.slug && <p className="mt-1 text-sm text-red-700">{errors.slug}</p>}
                    </div>
                    <div>
                        <label className="text-sm font-medium" htmlFor="project-summary">
                            Short description
                        </label>
                        <textarea id="project-summary" value={data.summary} onChange={(e) => update('summary', e.target.value)} rows={2} className={fieldClass} />
                    </div>
                    <div>
                        <span className="text-sm font-medium" id="project-description-label">
                            Detailed overview
                        </span>
                        <div className="mt-1">
                            <RichEditor value={data.description} onChange={(html) => update('description', html)} />
                        </div>
                        {errors.description && <p className="mt-1 text-sm text-red-700">{errors.description}</p>}
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium" htmlFor="project-status">
                            Status
                        </label>
                        <select id="project-status" value={data.status} onChange={(e) => update('status', e.target.value)} className={fieldClass}>
                            {statuses.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                        {errors.status && <p className="mt-1 text-sm text-red-700">{errors.status}</p>}
                    </div>
                    <div>
                        <label className="text-sm font-medium" htmlFor="project-visibility">
                            Visibility
                        </label>
                        <select
                            id="project-visibility"
                            value={data.visibility}
                            onChange={(e) => update('visibility', e.target.value)}
                            className={fieldClass}
                        >
                            <option value="public">Public</option>
                            <option value="private">Private</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium" htmlFor="project-repo">
                            Repository URL
                        </label>
                        <input
                            id="project-repo"
                            value={data.repository_url}
                            onChange={(e) => update('repository_url', e.target.value)}
                            className={fieldClass}
                            placeholder="https://github.com/…"
                        />
                        {errors.repository_url && <p className="mt-1 text-sm text-red-700">{errors.repository_url}</p>}
                    </div>
                    <div>
                        <label className="text-sm font-medium" htmlFor="project-live">
                            Live URL
                        </label>
                        <input id="project-live" value={data.live_url} onChange={(e) => update('live_url', e.target.value)} className={fieldClass} />
                        {errors.live_url && <p className="mt-1 text-sm text-red-700">{errors.live_url}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm font-medium" htmlFor="project-started">
                                Started
                            </label>
                            <input
                                id="project-started"
                                type="date"
                                value={data.started_at}
                                onChange={(e) => update('started_at', e.target.value)}
                                className={fieldClass}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium" htmlFor="project-completed">
                                Completed
                            </label>
                            <input
                                id="project-completed"
                                type="date"
                                value={data.completed_at}
                                onChange={(e) => update('completed_at', e.target.value)}
                                className={fieldClass}
                            />
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium">
                        <input type="checkbox" checked={data.featured} onChange={(e) => update('featured', e.target.checked)} />
                        Featured
                    </label>
                    <div>
                        <label className="text-sm font-medium" htmlFor="project-tags">
                            Technologies (comma-separated)
                        </label>
                        <input
                            id="project-tags"
                            value={data.tags}
                            onChange={(e) => update('tags', e.target.value)}
                            className={fieldClass}
                        />
                    </div>

                    <div className="flex flex-wrap gap-2 border-t border-hairline pt-4">
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Saving…' : 'Save'}
                        </Button>
                        {project?.id && (
                            <Button variant="secondary" type="button" onClick={() => setConfirming(true)}>
                                Delete
                            </Button>
                        )}
                    </div>
                </div>
            </form>

            <ConfirmDialog
                open={confirming}
                title="Delete project?"
                message={`“${project?.name}” will be removed. This cannot be undone.`}
                onConfirm={destroy}
                onCancel={() => setConfirming(false)}
            />
        </AdminLayout>
    );
}
