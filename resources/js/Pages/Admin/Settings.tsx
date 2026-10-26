import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/Components/Button';
import { ConfirmDialog } from '@/Components/ConfirmDialog';
import { Flash } from '@/Components/Flash';

type Settings = { site_title: string; tagline: string; footer_text: string; llm_enabled: boolean };

type Hero = {
    headline: string;
    role: string | null;
    company: string | null;
    company_url: string | null;
    status: string | null;
    avatar_path: string | null;
    logo_path: string | null;
    avatar_url: string | null;
    logo_url: string | null;
    initials: string;
};

const fieldClass = 'mt-1 w-full rounded-md border border-hairline px-3 py-2 text-sm focus:border-primary';

export default function SettingsPage({ settings, hero, llm_configured }: { settings: Settings; hero: Hero; llm_configured: boolean }) {
    const { data, setData, put, processing, errors } = useForm<{ settings: Settings }>({ settings });
    const heroForm = useForm({
        headline: hero.headline,
        role: hero.role ?? '',
        company: hero.company ?? '',
        company_url: hero.company_url ?? '',
        status: hero.status ?? '',
        hero_avatar: null as File | null,
        hero_logo: null as File | null,
        hero_avatar_clear: false,
        hero_logo_clear: false,
    });
    const [confirming, setConfirming] = useState(false);

    const allErrors = errors as Record<string, string | undefined>;
    const fieldError = (field: keyof Settings) => allErrors[`settings.${field}`] ?? allErrors[field];
    const heroErrors = heroForm.errors as Record<string, string | undefined>;
    const heroError = (field: string) => heroErrors[`hero.${field}`] ?? heroErrors[field];

    const save = (e: React.FormEvent) => {
        e.preventDefault();
        put('/admin/settings', { preserveScroll: true });
    };

    const saveHero = (e: React.FormEvent) => {
        e.preventDefault();
        heroForm.transform((h) => ({
            hero: {
                headline: h.headline,
                role: h.role || null,
                company: h.company || null,
                company_url: h.company_url || null,
                status: h.status || null,
            },
            hero_avatar: h.hero_avatar_clear ? undefined : h.hero_avatar,
            hero_logo: h.hero_logo_clear ? undefined : h.hero_logo,
            hero_avatar_clear: h.hero_avatar_clear,
            hero_logo_clear: h.hero_logo_clear,
        }));
        heroForm.put('/admin/settings', {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => heroForm.transform((h) => h),
        });
    };

    const setImage = (key: 'hero_avatar' | 'hero_logo', file: File | null) => {
        heroForm.setData(key, file);
        heroForm.clearErrors(key);
        if (file) {
            heroForm.setData(key === 'hero_avatar' ? 'hero_avatar_clear' : 'hero_logo_clear', false);
        }
    };

    return (
        <AdminLayout title="Settings">
            <Flash />
            <form onSubmit={save} className="max-w-xl space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-meta">Site</h2>
                <div>
                    <label className="text-sm font-medium" htmlFor="site-title">
                        Site title
                    </label>
                    <input
                        id="site-title"
                        value={data.settings.site_title}
                        onChange={(e) => setData('settings.site_title', e.target.value)}
                        className={fieldClass}
                        required
                    />
                    {fieldError('site_title') && <p className="mt-1 text-sm text-red-700">{fieldError('site_title')}</p>}
                </div>
                <div>
                    <label className="text-sm font-medium" htmlFor="tagline">
                        Tagline
                    </label>
                    <input id="tagline" value={data.settings.tagline} onChange={(e) => setData('settings.tagline', e.target.value)} className={fieldClass} />
                    {fieldError('tagline') && <p className="mt-1 text-sm text-red-700">{fieldError('tagline')}</p>}
                </div>
                <div>
                    <label className="text-sm font-medium" htmlFor="footer-text">
                        Footer text
                    </label>
                    <input id="footer-text" value={data.settings.footer_text} onChange={(e) => setData('settings.footer_text', e.target.value)} className={fieldClass} />
                    {fieldError('footer_text') && <p className="mt-1 text-sm text-red-700">{fieldError('footer_text')}</p>}
                </div>
                <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-meta">AI suggestions</h2>
                    <p className="text-sm text-meta">
                        Let &quot;Suggest from content&quot; write SEO fields with AI instead of plain truncation.
                    </p>
                </div>
                <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                        type="checkbox"
                        checked={data.settings.llm_enabled}
                        onChange={(e) => setData('settings.llm_enabled', e.target.checked)}
                        disabled={!llm_configured}
                    />
                    Enable AI-generated SEO suggestions
                </label>
                {!llm_configured && (
                    <p className="text-sm text-meta">Set LLM_API_KEY and LLM_MODEL in your environment to use this.</p>
                )}
                <Button type="submit" disabled={processing}>
                    {processing ? 'Saving…' : 'Save settings'}
                </Button>
            </form>

            <form onSubmit={saveHero} className="mt-12 max-w-xl space-y-4">
                <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-meta">Home</h2>
                    <p className="mt-1 text-sm text-meta">Statement hero, default tab, and identity images for the home page.</p>
                </div>

                <div className="flex items-center gap-4">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-hairline bg-surface text-lg font-semibold text-meta">
                        {heroForm.data.hero_avatar ? (
                            <img src={URL.createObjectURL(heroForm.data.hero_avatar)} alt="" className="h-full w-full object-cover" />
                        ) : heroForm.data.hero_avatar_clear || !hero.avatar_url ? (
                            hero.initials
                        ) : (
                            <img src={hero.avatar_url} alt="" className="h-full w-full object-cover" />
                        )}
                    </span>
                    <div className="flex-1">
                        <label className="text-sm font-medium" htmlFor="hero-avatar">
                            Avatar
                        </label>
                        <input
                            id="hero-avatar"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={(e) => setImage('hero_avatar', e.target.files?.[0] ?? null)}
                            className="mt-1 block w-full text-sm"
                        />
                        <label className="mt-1 flex items-center gap-2 text-sm text-meta">
                            <input
                                type="checkbox"
                                checked={heroForm.data.hero_avatar_clear}
                                onChange={(e) => heroForm.setData('hero_avatar_clear', e.target.checked)}
                            />
                            Remove current avatar
                        </label>
                        {heroError('hero_avatar') && <p className="mt-1 text-sm text-red-700">{heroError('hero_avatar')}</p>}
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium" htmlFor="hero-headline">
                        Headline
                    </label>
                    <input
                        id="hero-headline"
                        value={heroForm.data.headline}
                        onChange={(e) => heroForm.setData('headline', e.target.value)}
                        className={fieldClass}
                        maxLength={120}
                    />
                    {heroError('headline') && <p className="mt-1 text-sm text-red-700">{heroError('headline')}</p>}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="text-sm font-medium" htmlFor="hero-role">
                            Role
                        </label>
                        <input
                            id="hero-role"
                            value={heroForm.data.role}
                            onChange={(e) => heroForm.setData('role', e.target.value)}
                            className={fieldClass}
                            placeholder="Design Engineer"
                            maxLength={80}
                        />
                        {heroError('role') && <p className="mt-1 text-sm text-red-700">{heroError('role')}</p>}
                    </div>
                    <div>
                        <label className="text-sm font-medium" htmlFor="hero-company">
                            Company
                        </label>
                        <input
                            id="hero-company"
                            value={heroForm.data.company}
                            onChange={(e) => heroForm.setData('company', e.target.value)}
                            className={fieldClass}
                            placeholder="Striped"
                            maxLength={80}
                        />
                        {heroError('company') && <p className="mt-1 text-sm text-red-700">{heroError('company')}</p>}
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium" htmlFor="hero-company-url">
                        Company URL
                    </label>
                    <input
                        id="hero-company-url"
                        type="url"
                        value={heroForm.data.company_url}
                        onChange={(e) => heroForm.setData('company_url', e.target.value)}
                        className={fieldClass}
                        placeholder="https://example.com"
                        maxLength={200}
                    />
                    {heroError('company_url') && <p className="mt-1 text-sm text-red-700">{heroError('company_url')}</p>}
                </div>

                <div>
                    <label className="text-sm font-medium" htmlFor="hero-status">
                        Status line
                    </label>
                    <input
                        id="hero-status"
                        value={heroForm.data.status}
                        onChange={(e) => heroForm.setData('status', e.target.value)}
                        className={fieldClass}
                        placeholder="Rebuilding billing"
                        maxLength={200}
                    />
                    {heroError('status') && <p className="mt-1 text-sm text-red-700">{heroError('status')}</p>}
                </div>

                <div className="flex items-center gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-hairline bg-surface">
                        {heroForm.data.hero_logo ? (
                            <img src={URL.createObjectURL(heroForm.data.hero_logo)} alt="" className="h-full w-full object-contain" />
                        ) : (
                            hero.logo_url && !heroForm.data.hero_logo_clear && (
                                <img src={hero.logo_url} alt="" className="h-full w-full object-contain" />
                            )
                        )}
                    </span>
                    <div className="flex-1">
                        <label className="text-sm font-medium" htmlFor="hero-logo">
                            Company logo
                        </label>
                        <input
                            id="hero-logo"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={(e) => setImage('hero_logo', e.target.files?.[0] ?? null)}
                            className="mt-1 block w-full text-sm"
                        />
                        <label className="mt-1 flex items-center gap-2 text-sm text-meta">
                            <input
                                type="checkbox"
                                checked={heroForm.data.hero_logo_clear}
                                onChange={(e) => heroForm.setData('hero_logo_clear', e.target.checked)}
                            />
                            Remove current logo
                        </label>
                        {heroError('hero_logo') && <p className="mt-1 text-sm text-red-700">{heroError('hero_logo')}</p>}
                    </div>
                </div>

                <Button type="submit" disabled={heroForm.processing}>
                    {heroForm.processing ? 'Saving…' : 'Save home'}
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
