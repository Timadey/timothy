import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WebsiteCards } from '@/Pages/Collected/views/WebsiteCards';
import { makeItem } from './collectedFixtures';

const sites = [
    makeItem({ id: 1, title: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/', item_type: 'website', creator: 'Mozilla', annotation: null }),
    makeItem({ id: 2, title: 'Annotated Site', url: 'https://www.example.com/path', item_type: 'website', annotation: 'Great reference.' }),
];

test('frames each site in a browser card with the bare hostname', () => {
    render(<WebsiteCards items={sites} onOpen={() => {}} />);
    expect(screen.getByText('developer.mozilla.org')).toBeInTheDocument();
    expect(screen.getByText('example.com')).toBeInTheDocument();
    expect(screen.getByText('Great reference.')).toBeInTheDocument();
});

test('annotated sites open the modal, plain sites link out', () => {
    const onOpen = vi.fn();
    render(<WebsiteCards items={sites} onOpen={onOpen} />);

    fireEvent.click(screen.getByRole('button', { name: 'Annotated Site' }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));

    const link = screen.getByRole('link', { name: /MDN Web Docs/ });
    expect(link).toHaveAttribute('href', 'https://developer.mozilla.org/en-US/');
    expect(link).toHaveAttribute('target', '_blank');
});
