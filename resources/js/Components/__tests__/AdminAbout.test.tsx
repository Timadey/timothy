import { test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

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
