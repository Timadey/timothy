import { test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NoteFeedItem } from '../NoteFeedItem';

const TEASER = 'A short teaser for the note.';
const BODY_HTML = '<p>A short teaser for the note. And some more text that was cut off.</p>';

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

function mockFetchOk(body: string) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ body_html: body }),
    }));
}

test('renders teaser with a read more button', () => {
    render(<NoteFeedItem slug="quiet" teaser={TEASER} date="Oct 20, 2026" tags={['writing']} />);

    expect(screen.getByText(TEASER)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'read more' })).toBeInTheDocument();
});

test('clicking read more fetches the body and expands', async () => {
    mockFetchOk(BODY_HTML);
    render(<NoteFeedItem slug="quiet" teaser={TEASER} date="Oct 20, 2026" tags={['writing']} />);

    fireEvent.click(screen.getByRole('button', { name: 'read more' }));

    expect(await screen.findByText(/And some more text that was cut off/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'read more' })).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('/notes/quiet/body');
});

test('shows a loading state while fetching, then the body', async () => {
    let resolve!: (v: unknown) => void;
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise((r) => { resolve = r; })));
    render(<NoteFeedItem slug="quiet" teaser={TEASER} date={null} tags={[]} />);

    fireEvent.click(screen.getByRole('button', { name: 'read more' }));

    expect(screen.getByText('Loading…')).toBeInTheDocument();

    resolve({ ok: true, json: async () => ({ body_html: '<p>done</p>' }) });

    expect(await screen.findByText('done')).toBeInTheDocument();
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
});

test('shows a retry affordance when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    render(<NoteFeedItem slug="quiet" teaser={TEASER} date={null} tags={[]} />);

    fireEvent.click(screen.getByRole('button', { name: 'read more' }));

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
});

test('renders date and tags in the meta line', () => {
    render(<NoteFeedItem slug="quiet" teaser={TEASER} date="Oct 20, 2026" tags={['writing', 'life']} />);

    expect(screen.getByText(/Oct 20, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/writing/)).toBeInTheDocument();
    expect(screen.getByText(/life/)).toBeInTheDocument();
});
