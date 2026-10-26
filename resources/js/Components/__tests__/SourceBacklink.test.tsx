import { test, expect, describe } from 'vitest';
import { render, screen } from '@testing-library/react';
import SourceBacklink from '../SourceBacklink';

describe('SourceBacklink', () => {
    test('renders nothing without a source url', () => {
        const { container } = render(<SourceBacklink url={null} />);

        expect(container.firstChild).toBeNull();
    });

    test('links to the original article and names its host', () => {
        render(<SourceBacklink url="https://dev.to/timadey/my-post-abc1" />);

        const link = screen.getByRole('link');

        expect(link).toHaveAttribute('href', 'https://dev.to/timadey/my-post-abc1');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        expect(link.textContent).toMatch(/originally published/i);
        expect(link.textContent).toContain('dev.to');
    });
});
