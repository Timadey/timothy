import { useState } from 'react';
import { Button } from './Button';

export function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = 'Delete',
    onConfirm,
    onCancel,
}: {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
        >
            <div className="w-full max-w-sm rounded-md border border-hairline bg-white p-6">
                <h2 id="confirm-title" className="font-semibold tracking-tight">
                    {title}
                </h2>
                <p className="mt-2 text-sm text-meta">{message}</p>
                <div className="mt-5 flex justify-end gap-2">
                    <Button variant="secondary" onClick={onCancel} type="button">
                        Cancel
                    </Button>
                    <Button onClick={onConfirm} type="button">
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
