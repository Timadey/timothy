import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

test('renders title and hint', () => {
    render(<EmptyState title="No published writing yet" hint="Check back soon" />);
    expect(screen.getByText('No published writing yet')).toBeInTheDocument();
    expect(screen.getByText('Check back soon')).toBeInTheDocument();
});
