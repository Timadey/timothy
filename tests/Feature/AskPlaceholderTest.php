<?php

it('shows ask placeholder page', function () {
    $this->get('/ask')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Ask'));
});

it('includes ask in the sitemap once the route exists', function () {
    $xml = $this->get('/sitemap.xml')->assertOk()->getContent();
    expect($xml)->toContain('/ask');
});
