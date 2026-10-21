import { useEffect, useRef } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/Components/Button';

export function SentView({ recipient, onWriteAnother }: { recipient: string; onWriteAnother: () => void }) {
    const headingRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        headingRef.current?.focus();
    }, []);

    return (
        <div className="px-6 py-12 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-[#28c840]" aria-hidden="true" />
            <h2 ref={headingRef} className="mt-3 text-lg font-semibold text-ink" tabIndex={-1}>
                Your message is on its way.
            </h2>
            <p className="mt-2 text-sm text-meta">
                You can also reach me directly at{' '}
                <a href={`mailto:${recipient}`} className="text-[#007aff] underline-offset-2 hover:underline">
                    {recipient}
                </a>
            </p>
            <Button variant="secondary" type="button" onClick={onWriteAnother} className="mt-6">
                Write another
            </Button>
        </div>
    );
}
