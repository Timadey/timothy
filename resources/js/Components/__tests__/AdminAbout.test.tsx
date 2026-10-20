import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@inertiajs/react', () => ({
    useForm: (initial: Record<string, unknown>) => ({
        data: initial,
        setData: vi.fn(),
        errors: {} as Record<string, string>,
        processing: false,
        put: vi.fn(),
    }),
}));
vi.mock('@/Layouts/AdminLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/Components/Flash', () => ({ Flash: () => null }));

import About from '@/Pages/Admin/About';

test('renders the rich editor with the stored body and a save button', async () => {
    render(<About body="<p>Stored intro</p>" />);

    expect(await screen.findByLabelText('Text style')).toBeInTheDocument();
    expect(await screen.findByText('Stored intro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
});

test('toggles between edit and preview while keeping save visible', async () => {
    render(<About body="<p>Draft body</p>" />);

    await screen.findByLabelText('Text style');
    expect(screen.getByRole('button', { name: 'Save about page' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    await waitFor(() => expect(screen.queryByLabelText('Text style')).not.toBeInTheDocument());
    expect(await screen.findByText('Draft body')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save about page' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(await screen.findByLabelText('Text style')).toBeInTheDocument();
});
