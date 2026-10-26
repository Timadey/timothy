import { test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
    put: vi.fn(),
    post: vi.fn(),
    transformFn: { fn: (d: unknown) => d },
}));

vi.mock('@inertiajs/react', async () => {
    const react = await vi.importActual<typeof import('react')>('react');
    return {
        Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
        useForm: (initial: Record<string, unknown>) => {
            const [data, setDataRaw] = react.useState(initial);
            const setData = (key: unknown, value?: unknown) => {
                setDataRaw((prev: Record<string, unknown>) =>
                    typeof key === 'string' && value !== undefined
                        ? { ...prev, [key]: value }
                        : (key as Record<string, unknown>),
                );
            };
            return {
                data,
                setData,
                errors: {} as Record<string, string>,
                processing: false,
                transform: (fn: (d: unknown) => unknown) => {
                    mocks.transformFn.fn = fn;
                },
                put: (url: string, opts?: unknown) => mocks.put(url, mocks.transformFn.fn(data), opts),
                post: (url: string, opts?: unknown) => mocks.post(url, mocks.transformFn.fn(data), opts),
            };
        },
        usePage: () => ({ props: { llm_enabled: false } }),
    };
});
vi.mock('@/Layouts/AdminLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/Components/Flash', () => ({ Flash: () => null }));
vi.mock('@/Components/RichEditor', () => ({ RichEditor: () => <div data-testid="rich-editor" /> }));
vi.mock('@/Components/PreviewPane', () => ({ PreviewPane: () => null }));
vi.mock('@/Components/ConfirmDialog', () => ({ ConfirmDialog: () => null }));

import PostEdit from '@/Pages/Admin/Posts/Edit';
import ProjectEdit from '@/Pages/Admin/Projects/Edit';
import CollectedEdit from '@/Pages/Admin/Collected/Edit';

beforeEach(() => {
    mocks.put.mockReset();
    mocks.post.mockReset();
    mocks.transformFn.fn = (d: unknown) => d;
});

test('posts: a typed comma stays in the tags field while editing', () => {
    render(<PostEdit post={null} />);
    const input = screen.getByLabelText(/tags \(comma-separated\)/i);

    fireEvent.change(input, { target: { value: 'neurotech,' } });

    expect(input).toHaveValue('neurotech,');
});

test('posts: a typed comma stays in the topics field while editing', () => {
    render(<PostEdit post={null} />);
    const input = screen.getByLabelText(/topics \(comma-separated\)/i);

    fireEvent.change(input, { target: { value: 'ai,' } });

    expect(input).toHaveValue('ai,');
});

test('posts: submit sends parsed tag and topic arrays', () => {
    render(<PostEdit post={null} />);
    fireEvent.change(screen.getByLabelText(/tags \(comma-separated\)/i), {
        target: { value: 'neurotech, bci' },
    });
    fireEvent.change(screen.getByLabelText(/topics \(comma-separated\)/i), {
        target: { value: 'ai, ux' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(mocks.post).toHaveBeenCalledTimes(1);
    const payload = mocks.post.mock.calls[0][1] as { tags: string[]; topics: string[] };
    expect(payload.tags).toEqual(['neurotech', 'bci']);
    expect(payload.topics).toEqual(['ai', 'ux']);
});

test('projects: a typed comma stays in the tags field while editing', () => {
    render(<ProjectEdit project={null} />);
    const input = screen.getByLabelText(/technologies \(comma-separated\)/i);

    fireEvent.change(input, { target: { value: 'web,' } });

    expect(input).toHaveValue('web,');
});

test('collected: a typed comma stays in the tags field while editing', () => {
    render(<CollectedEdit item={null} />);
    const input = screen.getByLabelText(/tags/i);

    fireEvent.change(input, { target: { value: 'tools,' } });

    expect(input).toHaveValue('tools,');
});
