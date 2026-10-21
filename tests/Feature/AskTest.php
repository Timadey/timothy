<?php

use App\Mail\AskMessage;
use Illuminate\Support\Facades\Mail;

it('renders the ask page with the configured recipient', function () {
    $this->get('/ask')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Ask')
            ->where('recipient', 'hi@timothyadeleke.com'));
});

it('sends a message and flashes sent', function () {
    Mail::fake();

    $this->from('/ask')->post('/ask', [
        'from' => 'visitor@example.com',
        'subject' => 'Hello there',
        'message' => 'This is my message.',
    ])->assertRedirect('/ask')
        ->assertSessionHas('flash.sent', true);

    Mail::assertSent(AskMessage::class, function (AskMessage $mail) {
        return $mail->hasTo('hi@timothyadeleke.com')
            && $mail->envelope()->replyTo[0]->address === 'visitor@example.com'
            && $mail->envelope()->subject === 'Hello there'
            && $mail->content()->text === 'mail.ask-message'
            && $mail->content()->with['body'] === 'This is my message.';
    });
});

it('redirects back with field errors and sends nothing', function () {
    Mail::fake();

    $this->from('/ask')->post('/ask', [
        'from' => 'not-an-email',
        'subject' => '',
        'message' => '',
    ])->assertRedirect('/ask')
        ->assertSessionHasErrors(['from', 'subject', 'message']);

    Mail::assertNothingSent();
});

it('treats a filled honeypot as a silent success', function () {
    Mail::fake();

    $this->from('/ask')->post('/ask', [
        'from' => 'bot@example.com',
        'subject' => 'Buy things',
        'message' => 'spam spam',
        'website' => 'http://spam.example',
    ])->assertRedirect('/ask')
        ->assertSessionHas('flash.sent', true);

    Mail::assertNothingSent();
});

it('rate limits the send endpoint to five per minute', function () {
    Mail::fake();

    $payload = [
        'from' => 'visitor@example.com',
        'subject' => 'Hi',
        'message' => 'Hello.',
    ];

    foreach (range(1, 5) as $i) {
        $this->from('/ask')->post('/ask', $payload)->assertRedirect('/ask');
    }

    $this->from('/ask')->post('/ask', $payload)->assertStatus(429);
});

it('flashes an error instead of 500ing when the mailer fails', function () {
    Mail::shouldReceive('to')->once()->andThrow(new RuntimeException('SMTP down'));

    $this->from('/ask')->post('/ask', [
        'from' => 'visitor@example.com',
        'subject' => 'Hello',
        'message' => 'Are you there?',
    ])->assertRedirect('/ask')
        ->assertSessionHas('flash.sent', false)
        ->assertSessionHas('flash.error');
});
