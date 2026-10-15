import { test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Prose } from '../Prose';

test('renders html content through dangerouslySetInnerHTML', () => {
    render(<Prose html="<p>Hello <strong>world</strong> and <a href='/writing/x'>a link</a>.</p>" />);
    const wrapper = screen.getByText('world').closest('div');
    expect(wrapper).toBeInTheDocument();
    expect(screen.getByText('a link')).toHaveAttribute('href', '/writing/x');
    expect(screen.getByText(/Hello/)).toBeInTheDocument();
});

test('applies the prose wrapper classes', () => {
    const { container } = render(<Prose html="<p>Body</p>" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('prose-custom');
    expect(wrapper.className).toContain('max-w-[65ch]');
    expect(wrapper.className).toContain('text-[1.0625rem]');
    expect(wrapper.className).toContain('leading-[1.7]');
});

test('appends custom className', () => {
    const { container } = render(<Prose className="extra-margin" html="<p>Body</p>" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('extra-margin');
});
