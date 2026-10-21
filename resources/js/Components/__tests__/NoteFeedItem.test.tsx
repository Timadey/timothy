import { test, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NoteFeedItem } from '../NoteFeedItem';

const TEASER = 'A short teaser for the note.';
const BODY_HTML = '<p>A short teaser for the note. And some more text that was cut off.</p>';

test('renders teaser with a read more button', () => {
    render(<NoteFeedItem teaser={TEASER} bodyHtml={BODY_HTML} date="Oct 20, 2026" tags={['writing']} />);

    expect(screen.getByText(TEASER)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'read more' })).toBeInTheDocument();
});

test('clicking read more expands the full body and hides the button', () => {
    render(<NoteFeedItem teaser={TEASER} bodyHtml={BODY_HTML} date="Oct 20, 2026" tags={['writing']} />);

    fireEvent.click(screen.getByRole('button', { name: 'read more' }));

    expect(screen.getByText(/And some more text that was cut off/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'read more' })).not.toBeInTheDocument();
});

test('renders date and tags in the meta line', () => {
    render(<NoteFeedItem teaser={TEASER} bodyHtml={BODY_HTML} date="Oct 20, 2026" tags={['writing', 'life']} />);

    expect(screen.getByText(/Oct 20, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/writing/)).toBeInTheDocument();
    expect(screen.getByText(/life/)).toBeInTheDocument();
});

test('renders read more even for short teasers with null date', () => {
    render(<NoteFeedItem teaser="Tiny note." bodyHtml="<p>Tiny note.</p>" date={null} tags={[]} />);

    expect(screen.getByText('Tiny note.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'read more' })).toBeInTheDocument();
});
