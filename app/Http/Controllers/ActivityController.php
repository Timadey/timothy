<?php

namespace App\Http\Controllers;

use App\Services\FeedService;
use Inertia\{Inertia, Response};

class ActivityController extends Controller
{
    public function __invoke(FeedService $feed): Response
    {
        return Inertia::render('Activity/Index', [
            'feed' => $feed->recent(30),
        ]);
    }
}
