<?php

namespace App\Http\Controllers;

use App\Mail\AskAutoReply;
use App\Mail\AskMessage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Inertia\Response;

class AskController extends Controller
{
    public function index(): Response
    {
        return inertia('Ask', [
            'recipient' => config('ask.to'),
        ]);
    }

    public function send(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'from' => ['required', 'email', 'max:254'],
            'subject' => ['required', 'string', 'max:120'],
            'message' => ['required', 'string', 'max:5000'],
            'website' => ['nullable', 'string'],
        ]);

        if ($request->filled('website')) {
            return back()->with('flash', ['sent' => true, 'error' => null]);
        }

        try {
            Mail::to(config('ask.to'))->send(new AskMessage(
                fromAddress: $data['from'],
                subjectLine: $data['subject'],
                body: $data['message'],
            ));
        } catch (\Throwable $e) {
            report($e);

            return back()->with('flash', [
                'sent' => false,
                'error' => 'Couldn’t send right now — email me directly at '.config('ask.to'),
            ]);
        }

        try {
            Mail::to($data['from'])->send(new AskAutoReply(
                subjectLine: $data['subject'],
            ));
        } catch (\Throwable $e) {
            report($e);
        }

        return back()->with('flash', ['sent' => true, 'error' => null]);
    }
}
