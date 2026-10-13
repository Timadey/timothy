<?php

use App\Models\User;

it('shows login page to guests', function () {
    $this->get('/admin/login')->assertOk();
});

it('redirects guests from admin dashboard', function () {
    $this->get('/admin')->assertRedirect('/admin/login');
});

it('allows owner to log in', function () {
    User::factory()->create(['email' => 'owner@test.dev', 'password' => 'secret-123', 'role' => 'owner']);

    $this->post('/admin/login', ['email' => 'owner@test.dev', 'password' => 'secret-123'])
        ->assertRedirect('/admin');
});

it('lets owner see the admin dashboard after login', function () {
    $owner = User::factory()->create(['role' => 'owner']);

    $this->actingAs($owner)->get('/admin')->assertOk();
});

it('rejects wrong password with generic error', function () {
    User::factory()->create(['email' => 'owner@test.dev', 'password' => 'secret-123', 'role' => 'owner']);

    $this->from('/admin/login')
        ->post('/admin/login', ['email' => 'owner@test.dev', 'password' => 'wrong'])
        ->assertRedirect('/admin/login')
        ->assertSessionHasErrors('email');
});

it('rate limits login attempts', function () {
    User::factory()->create(['email' => 'owner@test.dev', 'password' => 'secret-123', 'role' => 'owner']);

    foreach (range(1, 6) as $i) {
        $this->post('/admin/login', ['email' => 'owner@test.dev', 'password' => 'wrong']);
    }

    $this->post('/admin/login', ['email' => 'owner@test.dev', 'password' => 'secret-123'])
        ->assertStatus(429);
});

it('blocks non-owner from admin even when authenticated', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)->get('/admin')->assertForbidden();
});

it('logs the owner out', function () {
    $owner = User::factory()->create(['role' => 'owner']);

    $this->actingAs($owner)->post('/admin/logout')->assertRedirect('/admin/login');
    $this->get('/admin')->assertRedirect('/admin/login');
});
