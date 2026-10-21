import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MailWindow } from '@/Components/ask/MailWindow';
import { ComposeBody } from '@/Components/ask/ComposeBody';

test('mail window shows traffic lights, centered title and toolbar', () => {
    render(
        <MailWindow title="New Message" toolbar={<button type="button">Send</button>}>
            <p>body content</p>
        </MailWindow>,
    );

    expect(screen.getByRole('group', { name: 'New Message' })).toBeInTheDocument();
    expect(screen.getByText('New Message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
    expect(screen.getByText('body content')).toBeInTheDocument();
});

test('compose body renders the recipient chip, fields and mailto note target', () => {
    render(
        <ComposeBody
            recipient="hi@timothyadeleke.com"
            from=""
            subject=""
            message=""
            errors={{}}
            disabled={false}
            honeypot={{ value: '', onChange: vi.fn() }}
            onChange={vi.fn()}
            onSubmit={vi.fn()}
        />,
    );

    expect(screen.getByText('hi@timothyadeleke.com')).toBeInTheDocument();
    expect(screen.getByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('Subject')).toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toBeInTheDocument();
});

test('compose body reports changes, hides the honeypot and submits', () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    const onHoneypot = vi.fn();
    render(
        <ComposeBody
            recipient="hi@timothyadeleke.com"
            from=""
            subject=""
            message=""
            errors={{}}
            disabled={false}
            honeypot={{ value: '', onChange: onHoneypot }}
            onChange={onChange}
            onSubmit={onSubmit}
        />,
    );

    fireEvent.change(screen.getByLabelText('From'), { target: { value: 'a@b.com' } });
    expect(onChange).toHaveBeenCalledWith('from', 'a@b.com');

    const honeypot = screen.getByLabelText('Website');
    expect(honeypot.closest('div')).toHaveAttribute('aria-hidden', 'true');
    expect(honeypot).toHaveAttribute('tabindex', '-1');
    fireEvent.change(honeypot, { target: { value: 'spam' } });
    expect(onHoneypot).toHaveBeenCalledWith('spam');

    fireEvent.submit(screen.getByRole('button', { name: 'Compose message' }));
    expect(onSubmit).toHaveBeenCalled();
});

test('compose body shows inline errors and disables while sending', () => {
    render(
        <ComposeBody
            recipient="hi@timothyadeleke.com"
            from="bad"
            subject=""
            message=""
            errors={{ from: 'Enter a valid email.', subject: 'Required.' }}
            disabled
            honeypot={{ value: '', onChange: vi.fn() }}
            onChange={vi.fn()}
            onSubmit={vi.fn()}
        />,
    );

    expect(screen.getByText('Enter a valid email.')).toBeInTheDocument();
    expect(screen.getByText('Required.')).toBeInTheDocument();
    expect(screen.getByLabelText('From')).toBeDisabled();
});
