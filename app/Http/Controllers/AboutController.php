<?php

namespace App\Http\Controllers;

use App\Models\{AboutSection, Setting, SocialLink};
use App\Services\MarkdownService;
use Inertia\{Inertia, Response};

class AboutController extends Controller
{
    public function __invoke(MarkdownService $markdown): Response
    {
        return Inertia::render('About', [
            'sections' => AboutSection::where('visible', true)->orderBy('sort_order')->get()
                ->map(fn ($s) => [
                    'key' => $s->key,
                    'title' => $s->title,
                    'body_html' => $markdown->render((string) $s->body),
                ]),
            'social_links' => SocialLink::where('visible', true)->orderBy('sort_order')
                ->get(['platform', 'url', 'label']),
            'contact_email' => Setting::get('contact_email'),
        ]);
    }
}
