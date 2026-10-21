import { test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const post = vi.fn();
const state = vi.fn();

vi.mock('@inertiajs/react', () => ({
    Head: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useForm: () => ({
        data: { from: '', subject: 'Draft subject', message: 'Draft body', website: '' },
        errors: {},
        processing: false,
        setData: state,
        post,
        reset: vi.fn(),
        clearErrors: vi.fn(),
    }),
}));
vi.mock('@/Layouts/PublicLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import Ask from '@/Pages/Ask';

beforeEach(() => {
    post.mockClear();
    state.mockClear();
});

test('renders the compose window with recipient, mailto fallback and contact note', () => {
    render(<Ask recipient="hi@timothyadeleke.com" flash={null} />);

    expect(screen.getByRole('group', { name: 'New Message' })).toBeInTheDocument();
    expect(screen.getByLabelText('From')).toBeInTheDocument();

    const mailto = screen.getByRole('link', { name: /Open in email client/ });
    expect(mailto).toHaveAttribute(
        'href',
        'mailto:hi@timothyadeleke.com?subject=Draft%20subject&body=Draft%20body',
    );

    expect(screen.getByRole('link', { name: 'hi@timothyadeleke.com' })).toBeInTheDocument();
});

test('submitting the compose form posts to /ask and wires the toolbar Send button', () => {
    render(<Ask recipient="hi@timothyadeleke.com" flash={null} />);

    fireEvent.submit(document.getElementById('ask-compose')!);
    expect(post).toHaveBeenCalledWith('/ask', expect.anything());
    expect(screen.getByRole('button', { name: 'Send' })).toHaveAttribute('form', 'ask-compose');
});

test('sent flash swaps the window into the Sent view and write another resets', () => {
    render(<Ask recipient="hi@timothyadeleke.com" flash={{ sent: true, error: null }} />);

    expect(screen.getByRole('group', { name: 'Sent' })).toBeInTheDocument();
    expect(screen.getByText('Your message is on its way.')).toBeInTheDocument();
    expect(() => fireEvent.click(screen.getByRole('button', { name: 'Write another' }))).not.toThrow();
});

test('error flash keeps the compose window and shows the fallback banner', () => {
    render(
        <Ask
            recipient="hi@timothyadeleke.com"
            flash={{ sent: false, error: 'Couldn’t send right now — email me directly at hi@timothyadeleke.com' }}
        />,
    );

    expect(screen.getByRole('group', { name: 'New Message' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t send right now');
    expect(screen.getAllByRole('link', { name: 'hi@timothyadeleke.com' }).length).toBeGreaterThan(0);
});
