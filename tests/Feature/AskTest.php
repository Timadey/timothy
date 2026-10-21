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
