<?php

use App\Models\Setting;
use App\Models\User;

beforeEach(function () {
    config([
        'llm.provider' => null,
        'llm.base_url' => null,
        'llm.api_key' => null,
        'llm.model' => null,
    ]);
    $this->owner = User::factory()->create(['role' => 'owner']);
});

it('shows the toggle on by default and reports env configuration', function () {
    $this->actingAs($this->owner)->get('/admin/settings')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('settings.llm_enabled', true)
            ->where('llm_configured', false));

    config(['llm.provider' => 'openai', 'llm.api_key' => 'k', 'llm.model' => 'm']);

    $this->actingAs($this->owner)->get('/admin/settings')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('llm_configured', true));
});

it('persists the toggle off as 0', function () {
    $this->actingAs($this->owner)->put('/admin/settings', [
        'settings' => ['site_title' => 'Timadey', 'llm_enabled' => false],
    ])->assertRedirect();

    expect(Setting::get('llm_enabled'))->toBe('0');

    $this->actingAs($this->owner)->get('/admin/settings')
        ->assertInertia(fn ($page) => $page->where('settings.llm_enabled', false));
});

it('persists the toggle back on as 1', function () {
    Setting::set('llm_enabled', '0');

    $this->actingAs($this->owner)->put('/admin/settings', [
        'settings' => ['site_title' => 'Timadey', 'llm_enabled' => true],
    ])->assertRedirect();

    expect(Setting::get('llm_enabled'))->toBe('1');
});
