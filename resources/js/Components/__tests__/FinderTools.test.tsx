import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FinderTools } from '@/Pages/Collected/views/FinderTools';
import { makeItem } from './collectedFixtures';

const tools = Array.from({ length: 12 }, (_, index) =>
    makeItem({
        id: index + 1,
        title: `Tool ${index + 1}`,
        item_type: 'tool',
        url: `https://tool${index + 1}.example.com`,
        annotation: `What it does: ${index + 1}`,
    }),
);

test('renders a labelled listbox of options with the finder hint', () => {
    render(<FinderTools items={tools} onOpen={() => {}} />);

    const listbox = screen.getByRole('listbox', { name: 'Tools' });
    expect(listbox).toHaveAttribute('tabindex', '0');
    expect(screen.getAllByRole('option')).toHaveLength(12);
    expect(screen.getByText(/Enter to open/)).toBeInTheDocument();
    expect(listbox.getAttribute('aria-activedescendant')).toBeNull();
});

test('arrow keys move the selection and Enter opens the selected tool', () => {
    const onOpen = vi.fn();
    render(<FinderTools items={tools} onOpen={onOpen} />);
    const listbox = screen.getByRole('listbox', { name: 'Tools' });
    const options = screen.getAllByRole('option');

    fireEvent.keyDown(listbox, { key: 'ArrowRight' });
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(listbox).toHaveAttribute('aria-activedescendant', 'tool-opt-1');

    fireEvent.keyDown(listbox, { key: 'ArrowRight' });
    expect(options[1]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(listbox, { key: 'Enter' });
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ title: 'Tool 2' }));
});

test('a single click opens the modal; keyboard selection still works', () => {
    const onOpen = vi.fn();
    render(<FinderTools items={tools} onOpen={onOpen} />);
    const listbox = screen.getByRole('listbox', { name: 'Tools' });
    const options = screen.getAllByRole('option');

    fireEvent.click(options[3]);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ title: 'Tool 4' }));

    fireEvent.keyDown(listbox, { key: 'ArrowRight' });
    expect(options[4]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(listbox, { key: 'Escape' });
    expect(options[4]).toHaveAttribute('aria-selected', 'false');
});

test('tools always open the modal, even without an annotation', () => {
    const onOpen = vi.fn();
    const bare = [{ ...tools[0], annotation: null }];
    render(<FinderTools items={bare} onOpen={onOpen} />);

    const options = screen.getAllByRole('option');
    fireEvent.click(options[0]);
    fireEvent.click(options[0]);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ annotation: null }));
});
