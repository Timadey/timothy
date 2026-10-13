<?php

use App\Models\{AboutSection, NowSection, SocialLink};

it('shows visible about sections rendered', function () {
    AboutSection::create(['key' => 'intro', 'title' => 'Intro', 'body' => 'I build **things**.', 'visible' => true, 'sort_order' => 0]);
    AboutSection::create(['key' => 'hidden', 'title' => 'Hidden', 'body' => 'secret', 'visible' => false, 'sort_order' => 1]);

    $this->get('/about')->assertOk()
        ->assertInertia(fn ($p) => $p->component('About')->has('sections', 1)
            ->where('sections.0.body_html', fn ($h) => str_contains($h, '<strong>things</strong>')));
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
