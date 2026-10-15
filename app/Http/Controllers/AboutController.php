<?php

namespace App\Http\Controllers;

use App\Models\{Setting, SocialLink};
use Inertia\{Inertia, Response};

class AboutController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('About', [
            'body_html' => (string) Setting::get('about_body'),
            'social_links' => SocialLink::where('visible', true)->orderBy('sort_order')
                ->get(['platform', 'url', 'label']),
            'contact_email' => Setting::get('contact_email'),
        ]);
    }
}
