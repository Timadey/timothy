<?php

use App\Models\{NowSection, Setting, SocialLink};

it('renders the stored about body html', function () {
    Setting::set('about_body', '<p>Hello <strong>world</strong></p>');

    $this->get('/about')->assertOk()
        ->assertInertia(fn ($p) => $p->component('About')
            ->where('body_html', '<p>Hello <strong>world</strong></p>'));
});

it('shows empty state when about body is missing', function () {
    $this->get('/about')->assertOk()
        ->assertInertia(fn ($p) => $p->component('About')->where('body_html', ''));
});

it('shows social links on about', function () {
    SocialLink::create(['platform' => 'GitHub', 'url' => 'https://github.com/x', 'visible' => true]);
    SocialLink::create(['platform' => 'Hidden', 'url' => 'https://x.test', 'visible' => false]);

    $this->get('/about')->assertInertia(fn ($p) => $p->has('social_links', 1));
});

it('shows now page with last-updated timestamp', function () {
    $s = NowSection::create(['key' => 'building', 'label' => 'Currently building', 'body' => 'A thing', 'visible' => true, 'sort_order' => 0]);
    $s->updates()->create(['text' => 'Shipped a feature', 'occurred_at' => now()->subDays(2), 'visible' => true]);
    NowSection::create(['key' => 'hidden', 'label' => 'Hidden', 'body' => 'x', 'visible' => false]);

    $this->get('/now')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Now')->has('sections', 1)->whereNotNull('last_updated_at'));
});

it('hides empty now sections', function () {
    NowSection::create(['key' => 'empty', 'label' => 'Empty', 'body' => null, 'visible' => true, 'sort_order' => 0]);
    $s = NowSection::create(['key' => 'reading', 'label' => 'Reading', 'body' => 'A book', 'visible' => true, 'sort_order' => 1]);

    $this->get('/now')->assertInertia(fn ($p) => $p->has('sections', 1)->where('sections.0.key', 'reading'));
});
