import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { RichEditor } from '../RichEditor';

const fetchMock = vi.fn();

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

test('renders the style C toolbar with heading, link, and image controls', async () => {
    render(<RichEditor value="<p>Hello</p>" onChange={() => {}} />);

    expect(await screen.findByLabelText('Text style')).toBeInTheDocument();
    expect(screen.getByLabelText('Link')).toBeInTheDocument();
    expect(screen.getByLabelText('Insert image')).toBeInTheDocument();
    expect(await screen.findByText('Hello')).toBeInTheDocument();
});

test('reports editor html through onChange when the heading style changes', async () => {
    const onChange = vi.fn();
    render(<RichEditor value="<p>Hello there</p>" onChange={onChange} />);

    const select = await screen.findByLabelText('Text style');
    await waitFor(() => expect(screen.getByText('Hello there')).toBeInTheDocument());
    fireEvent.change(select, { target: { value: 'h2' } });

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange.mock.calls.at(-1)?.[0]).toContain('<h2');
});

test('uploads a chosen image and inserts it into the document', async () => {
    fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ url: '/storage/uploads/photos/abc123.png' }),
    });
    const onChange = vi.fn();
    render(<RichEditor value="<p>Hi</p>" onChange={onChange} />);

    const input = await screen.findByLabelText('Image file');
    const file = new File(['fake'], 'photo.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/admin/uploads');
    expect(options.method).toBe('POST');
    expect(options.body).toBeInstanceOf(FormData);

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange.mock.calls.at(-1)?.[0]).toContain('src="/storage/uploads/photos/abc123.png"');
});

test('inserts a code block from the top bar button', async () => {
    const onChange = vi.fn();
    render(<RichEditor value="<p>Code time</p>" onChange={onChange} />);

    const button = await screen.findByLabelText('Code block');
    fireEvent.click(button);

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange.mock.calls.at(-1)?.[0]).toContain('<pre');
});

test('keeps the inline Code control in the bubble menu separate from the block button', async () => {
    render(<RichEditor value="<p>Inline</p>" onChange={() => {}} />);

    const paragraph = await screen.findByText('Inline');
    const prosemirror = paragraph.closest('.ProseMirror') as HTMLElement;
    prosemirror.focus();

    const range = document.createRange();
    range.selectNodeContents(paragraph);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));

    expect(await screen.findByLabelText('Code')).toBeInTheDocument();
    expect(screen.getByLabelText('Code block')).toBeInTheDocument();
});
