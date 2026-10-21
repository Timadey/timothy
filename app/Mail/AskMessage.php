<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AskMessage extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $fromAddress,
        public string $subjectLine,
        public string $body,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            replyTo: $this->fromAddress,
            subject: $this->subjectLine,
        );
    }

    public function content(): Content
    {
        return new Content(
            text: 'mail.ask-message',
            with: [
                'body' => $this->body,
                'fromAddress' => $this->fromAddress,
            ],
        );
    }
}
