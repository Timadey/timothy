import { test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@inertiajs/react', () => ({
    useForm: (initial: Record<string, unknown>) => ({
        data: initial,
        setData: vi.fn(),
        errors: {} as Record<string, string>,
        processing: false,
        put: vi.fn(),
        post: vi.fn(),
        transform: vi.fn(),
    }),
    router: { delete: vi.fn() },
    Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/Layouts/AdminLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/Components/Flash', () => ({ Flash: () => null }));

import CollectedEdit from '@/Pages/Admin/Collected/Edit';

test('shows the cover url field, file picker, remove toggle and ratio hint for an existing cover', () => {
    render(
        <CollectedEdit
            item={{
                id: 1,
                title: 'Covered',
                url: '',
                creator: '',
                item_type: 'book',
                annotation: '',
                visibility: 'public',
                tags: [],
                cover_image: 'covers/old.jpg',
            }}
        />,
    );

    expect(screen.getByLabelText('Cover image URL')).toHaveValue('covers/old.jpg');
    expect(screen.getByLabelText('Remove cover')).toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).not.toBeNull();
    expect(screen.getByText(/2:3 for books/)).toBeInTheDocument();
});

test('renders type options with display labels', () => {
    render(<CollectedEdit item={null} />);
    const select = screen.getByLabelText('Type');
    expect(select).toHaveTextContent('Books');
    expect(select).toHaveTextContent('Tools');
});
