import { Head, useForm } from '@inertiajs/react';
import { ExternalLink, Send } from 'lucide-react';
import PublicLayout from '@/Layouts/PublicLayout';
import { ComposeBody } from '@/Components/ask/ComposeBody';
import { MailWindow } from '@/Components/ask/MailWindow';
import { SentView } from '@/Components/ask/SentView';

type Flash = { sent?: boolean | null; error?: string | null };

export default function Ask({ recipient, flash }: { recipient: string; flash?: Flash | null }) {
    const form = useForm({ from: '', subject: '', message: '', website: '' });
    const sent = flash?.sent === true;

    const mailtoHref = `mailto:${recipient}?subject=${encodeURIComponent(form.data.subject)}&body=${encodeURIComponent(form.data.message)}`;

    const reset = () => {
        form.reset();
        form.clearErrors();
    };

    return (
        <PublicLayout>
            <Head>
                <title>Ask Timadey</title>
                <meta name="description" content="Send Timadey an email straight from this page." />
            </Head>
            <div className="mx-auto max-w-2xl px-6 pt-12 pb-16">
                <h1 className="text-3xl font-semibold tracking-tight">Ask Timadey</h1>
                <p className="mt-2 text-lg text-ink">Send me a note — I read everything.</p>

                <div className="mt-8">
                    {sent ? (
                        <MailWindow title="Sent">
                            <SentView recipient={recipient} onWriteAnother={reset} />
                        </MailWindow>
                    ) : (
                        <MailWindow
                            title="New Message"
                            toolbar={
                                <>
                                    <button
                                        type="submit"
                                        form="ask-compose"
                                        disabled={form.processing}
                                        className="inline-flex items-center gap-1.5 rounded-full bg-[#0a84ff] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#0071e3] disabled:opacity-60"
                                    >
                                        <Send className="h-3.5 w-3.5" aria-hidden="true" />
                                        {form.processing ? 'Sending…' : 'Send'}
                                    </button>
                                    <a
                                        href={mailtoHref}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white px-3.5 py-1.5 text-sm font-medium text-ink hover:bg-surface"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                        Open in email client
                                    </a>
                                </>
                            }
                        >
                            {flash?.error && (
                                <div role="alert" className="border-b border-hairline bg-red-50 px-6 py-3 text-sm text-red-800">
                                    {flash.error}{' '}
                                    <a href={`mailto:${recipient}`} className="underline">
                                        {recipient}
                                    </a>
                                </div>
                            )}
                            <ComposeBody
                                recipient={recipient}
                                from={form.data.from}
                                subject={form.data.subject}
                                message={form.data.message}
                                errors={form.errors}
                                disabled={form.processing}
                                honeypot={{
                                    value: form.data.website,
                                    onChange: (value) => form.setData('website', value),
                                }}
                                onChange={(field, value) => form.setData(field, value)}
                                onSubmit={() => form.post('/ask', { preserveScroll: true })}
                            />
                        </MailWindow>
                    )}
                </div>

                <p className="mt-6 text-sm text-meta">
                    You can also reach me directly at{' '}
                    <a href={`mailto:${recipient}`} className="text-[#0a84ff] underline-offset-2 hover:underline">
                        {recipient}
                    </a>
                </p>
            </div>
        </PublicLayout>
    );
}
