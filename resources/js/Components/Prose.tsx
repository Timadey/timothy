export function Prose({ html, className = '' }: { html: string; className?: string }) {
    return (
        <div
            className={`prose-custom max-w-[65ch] text-[1.0625rem] leading-[1.7] ${className}`}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
