import { test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ post: vi.fn(), put: vi.fn() }));

vi.mock('@inertiajs/react', async () => {
    const react = await vi.importActual<typeof import('react')>('react');
    return {
        Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
            <a href={href}>{children}</a>
        ),
        useForm: (initial: Record<string, unknown>) => {
            const [data, setDataRaw] = react.useState(initial);
            const transformRef = { fn: (d: unknown) => d };
            const setData = (key: unknown, value?: unknown) => {
                setDataRaw((prev: Record<string, unknown>) =>
                    typeof key === 'string' && value !== undefined ? { ...prev, [key]: value } : (key as Record<string, unknown>),
                );
            };
            return {
                data,
                setData,
                errors: {} as Record<string, string>,
                processing: false,
                transform: (fn: (d: unknown) => unknown) => {
                    transformRef.fn = fn;
                },
                post: (url: string, opts?: unknown) => mocks.post(url, transformRef.fn(data), opts),
                put: (url: string, opts?: unknown) => mocks.put(url, transformRef.fn(data), opts),
            };
        },
    };
});

import { QuickComposer } from '../QuickComposer';

beforeEach(() => {
    mocks.post.mockReset();
    mocks.put.mockReset();
});

test('renders optional title, body, tags, and action buttons', () => {
    render(<QuickComposer note={null} />);
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/what's on your mind/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tags/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
});

test('publish is disabled while the body is empty', () => {
    render(<QuickComposer note={null} />);
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
});

test('typing a body enables publish', () => {
    render(<QuickComposer note={null} />);
    fireEvent.change(screen.getByPlaceholderText(/what's on your mind/i), {
        target: { value: 'A quick thought' },
    });
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
});

test('Cmd+Enter publishes a new note', () => {
    render(<QuickComposer note={null} />);
    const textarea = screen.getByPlaceholderText(/what's on your mind/i);
    fireEvent.change(textarea, { target: { value: 'Ship it today' } });
    fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });

    expect(mocks.post).toHaveBeenCalledTimes(1);
    const [url, payload] = mocks.post.mock.calls[0];
    expect(url).toBe('/admin/notes');
    expect(payload).toMatchObject({ body: 'Ship it today', status: 'published', post_type: 'note' });
});

test('Save draft submits draft status', () => {
    render(<QuickComposer note={null} />);
    fireEvent.change(screen.getByPlaceholderText(/what's on your mind/i), {
        target: { value: 'unfinished thought' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(mocks.post.mock.calls[0][1]).toMatchObject({ status: 'draft', body: 'unfinished thought' });
});

test('editing an existing note submits a put to its url', () => {
    render(
        <QuickComposer
            note={{ id: 7, title: null, body: 'Existing body', status: 'draft', visibility: 'public', tags: [] }}
        />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(mocks.put).toHaveBeenCalledTimes(1);
    expect(mocks.put.mock.calls[0][0]).toBe('/admin/notes/7');
});
