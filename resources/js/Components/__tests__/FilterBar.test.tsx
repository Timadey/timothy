import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterBar } from '../FilterBar';

const options = [
    { label: 'Articles', value: 'article' },
    { label: 'Notes', value: 'note' },
];

test('renders the all option and each filter option', () => {
    render(<FilterBar options={options} active="" onSelect={() => {}} allLabel="Everything" />);
    expect(screen.getByRole('button', { name: 'Everything' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Articles' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notes' })).toBeInTheDocument();
});

test('marks the active filter', () => {
    render(<FilterBar options={options} active="article" onSelect={() => {}} allLabel="Everything" />);
    expect(screen.getByRole('button', { name: 'Articles' }).firstElementChild?.className).toContain('bg-primary');
    expect(screen.getByRole('button', { name: 'Notes' }).firstElementChild?.className).not.toContain('bg-primary');
    expect(screen.getByRole('button', { name: 'Everything' }).firstElementChild?.className).not.toContain('bg-primary');
});

test('calls onSelect with the option value on click', () => {
    const onSelect = vi.fn();
    render(<FilterBar options={options} active="" onSelect={onSelect} allLabel="Everything" />);
    fireEvent.click(screen.getByRole('button', { name: 'Notes' }));
    expect(onSelect).toHaveBeenCalledWith('note');
});

test('calls onSelect with an empty value for the all option', () => {
    const onSelect = vi.fn();
    render(<FilterBar options={options} active="note" onSelect={onSelect} allLabel="Everything" />);
    fireEvent.click(screen.getByRole('button', { name: 'Everything' }));
    expect(onSelect).toHaveBeenCalledWith('');
});

test('renders nothing when there is a single option or fewer', () => {
    const { container: single } = render(
        <FilterBar options={[{ label: 'Only', value: 'only' }]} active="" onSelect={() => {}} />,
    );
    expect(single).toBeEmptyDOMElement();

    const { container: none } = render(<FilterBar options={[]} active="" onSelect={() => {}} />);
    expect(none).toBeEmptyDOMElement();
});
