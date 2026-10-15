<?php

use App\Models\{CollectedItem, NowSection, Post, Project, Setting, SocialLink, Tag, User};

beforeEach(fn () => $this->owner = User::factory()->create(['role' => 'owner']));

it('updates now page sections', function () {
    $section = NowSection::create(['key' => 'reading', 'label' => 'Reading', 'body' => 'Old', 'sort_order' => 3]);

    $this->actingAs($this->owner)->put('/admin/now', [
        'sections' => [['id' => $section->id, 'key' => 'reading', 'label' => 'Reading', 'body' => 'New body', 'visible' => true, 'sort_order' => 3]],
        'updates' => [],
    ])->assertRedirect();

    expect($section->fresh()->body)->toBe('New body');
});

it('shows the now page editor', function () {
    NowSection::create(['key' => 'building', 'label' => 'Building', 'sort_order' => 0]);

    $this->actingAs($this->owner)->get('/admin/now')->assertOk()
        ->assertInertia(fn ($p) => $p->component('Admin/Now')->has('sections'));
});

it('updates the about body', function () {
    $this->actingAs($this->owner)->put('/admin/about', [
        'body' => '<p>New <strong>intro</strong></p>',
    ])->assertRedirect();

    expect(Setting::get('about_body'))->toBe('<p>New <strong>intro</strong></p>');
});

it('rejects unsafe about markup', function () {
    $this->actingAs($this->owner)->put('/admin/about', [
        'body' => '<p>ok</p><script>alert(1)</script><img src="https://evil.test/x.png">',
    ])->assertSessionHasErrors('body');
});

it('creates and deletes social links', function () {
    $this->actingAs($this->owner)->post('/admin/social', [
        'platform' => 'GitHub', 'url' => 'https://github.com/x', 'label' => 'GitHub', 'visible' => true,
    ])->assertRedirect();

    $link = SocialLink::first();
    expect($link->url)->toBe('https://github.com/x');

    $this->actingAs($this->owner)->delete("/admin/social/{$link->id}")->assertRedirect();
    expect(SocialLink::count())->toBe(0);
});

it('validates social link urls', function () {
    $this->actingAs($this->owner)->post('/admin/social', ['platform' => 'X', 'url' => 'nope'])
        ->assertSessionHasErrors('url');
});

it('creates tags and topics', function () {
    $this->actingAs($this->owner)->post('/admin/tags', ['kind' => 'tag', 'name' => 'Neurotech'])->assertRedirect();
    $this->actingAs($this->owner)->post('/admin/tags', ['kind' => 'topic', 'name' => 'BCI'])->assertRedirect();

    expect(\App\Models\Tag::where('slug', 'neurotech')->exists())->toBeTrue()
        ->and(\App\Models\Topic::where('slug', 'bci')->exists())->toBeTrue();
});

it('deletes tags', function () {
    $tag = \App\Models\Tag::create(['name' => 'Old', 'slug' => 'old']);

    $this->actingAs($this->owner)->delete("/admin/tags/tag/{$tag->id}")->assertRedirect();

    expect(\App\Models\Tag::find($tag->id))->toBeNull();
});

it('validates taxonomy kind', function () {
    $this->actingAs($this->owner)->post('/admin/tags', ['kind' => 'bogus', 'name' => 'X'])
        ->assertSessionHasErrors('kind');
});

it('saves settings', function () {
    $this->actingAs($this->owner)->put('/admin/settings', [
        'settings' => ['site_title' => 'Timadey', 'tagline' => 'Notes', 'footer_text' => '©'],
    ])->assertRedirect();

    expect(Setting::get('site_title'))->toBe('Timadey');
});

it('deletes demo content from settings', function () {
    $author = User::factory()->create();
    Post::factory()->create(['author_id' => $author->id, 'is_demo' => true]);
    Post::factory()->create(['author_id' => $author->id, 'is_demo' => false]);
    Project::factory()->create(['is_demo' => true]);
    CollectedItem::factory()->create(['is_demo' => true]);

    $this->actingAs($this->owner)->delete('/admin/settings/demo-content')->assertRedirect();

    expect(Post::count())->toBe(1)->and(Project::count())->toBe(0)->and(CollectedItem::count())->toBe(0);
});

it('requires owner for site content routes', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)->get('/admin/settings')->assertForbidden();
});
