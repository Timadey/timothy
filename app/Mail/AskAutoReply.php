<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AskAutoReply extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $subjectLine,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            replyTo: config('ask.to'),
            subject: 'Re: '.$this->subjectLine,
        );
    }

    public function content(): Content
    {
        return new Content(
            text: 'mail.ask-auto-reply',
            with: [
                'subjectLine' => $this->subjectLine,
            ],
        );
    }
}
