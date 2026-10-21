type Field = 'from' | 'subject' | 'message';

export type ComposeBodyProps = {
    recipient: string;
    from: string;
    subject: string;
    message: string;
    errors: Partial<Record<Field, string>>;
    disabled: boolean;
    honeypot: { value: string; onChange: (value: string) => void };
    onChange: (field: Field, value: string) => void;
    onSubmit: () => void;
};

const rowClass = 'flex items-start gap-4 border-b border-hairline px-6 py-3';
const labelClass = 'w-20 shrink-0 pt-2 text-sm text-meta';
const inputClass = 'w-full bg-transparent text-sm text-ink outline-none placeholder:text-meta disabled:opacity-60';

function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return (
        <p className="mt-1 text-sm text-red-700" role="alert">
            {message}
        </p>
    );
}

export function ComposeBody({ recipient, from, subject, message, errors, disabled, honeypot, onChange, onSubmit }: ComposeBodyProps) {
    return (
        <form
            id="ask-compose"
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
            }}
        >
            <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
                <label>
                    Website
                    <input
                        type="text"
                        name="website"
                        tabIndex={-1}
                        autoComplete="off"
                        value={honeypot.value}
                        onChange={(e) => honeypot.onChange(e.target.value)}
                    />
                </label>
            </div>

            <div className={rowClass}>
                <span className={labelClass}>To</span>
                <span className="mt-0.5 inline-flex items-center rounded-full bg-[#007aff]/10 px-2.5 py-0.5 text-sm text-[#007aff]">
                    {recipient}
                </span>
            </div>

            <div className={rowClass}>
                <label htmlFor="ask-from" className={labelClass}>
                    From
                </label>
                <div className="min-w-0 flex-1">
                    <input
                        id="ask-from"
                        name="from"
                        type="email"
                        required
                        maxLength={254}
                        disabled={disabled}
                        value={from}
                        onChange={(e) => onChange('from', e.target.value)}
                        className={inputClass}
                        placeholder="you@example.com"
                    />
                    <FieldError message={errors.from} />
                </div>
            </div>

            <div className={rowClass}>
                <label htmlFor="ask-subject" className={labelClass}>
                    Subject
                </label>
                <div className="min-w-0 flex-1">
                    <input
                        id="ask-subject"
                        name="subject"
                        type="text"
                        required
                        maxLength={120}
                        disabled={disabled}
                        value={subject}
                        onChange={(e) => onChange('subject', e.target.value)}
                        className={inputClass}
                        placeholder="What’s on your mind"
                    />
                    <FieldError message={errors.subject} />
                </div>
            </div>

            <div className="px-6 py-3">
                <label htmlFor="ask-message" className="sr-only">
                    Message
                </label>
                <textarea
                    id="ask-message"
                    name="message"
                    required
                    maxLength={5000}
                    rows={8}
                    disabled={disabled}
                    value={message}
                    onChange={(e) => onChange('message', e.target.value)}
                    className={`${inputClass} resize-y`}
                    placeholder="Write your note…"
                />
                <FieldError message={errors.message} />
            </div>

            <button type="submit" className="sr-only">
                Compose message
            </button>
        </form>
    );
}
