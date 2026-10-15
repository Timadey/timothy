<?php

use App\Models\{Tag, Topic, User};

beforeEach(fn () => $this->owner = User::factory()->create(['role' => 'owner']));

it('rejects duplicate tag names', function () {
    $this->actingAs($this->owner)->post('/admin/tags', ['kind' => 'tag', 'name' => 'Neurotech'])->assertRedirect();

    $this->actingAs($this->owner)->post('/admin/tags', ['kind' => 'tag', 'name' => 'Neurotech'])
        ->assertRedirect()
        ->assertSessionHasErrors('name');

    expect(Tag::where('slug', 'neurotech')->count())->toBe(1);
});

it('rejects tag names that slug collide with an existing tag', function () {
    $this->actingAs($this->owner)->post('/admin/tags', ['kind' => 'tag', 'name' => 'Neuro Tech'])->assertRedirect();

    $this->actingAs($this->owner)->post('/admin/tags', ['kind' => 'tag', 'name' => 'neuro tech'])
        ->assertRedirect()
        ->assertSessionHasErrors('name');

    expect(Tag::count())->toBe(1);
});

it('rejects duplicate topic names', function () {
    $this->actingAs($this->owner)->post('/admin/tags', ['kind' => 'topic', 'name' => 'BCI'])->assertRedirect();

    $this->actingAs($this->owner)->post('/admin/tags', ['kind' => 'topic', 'name' => 'BCI'])
        ->assertRedirect()
        ->assertSessionHasErrors('name');

    expect(Topic::where('slug', 'bci')->count())->toBe(1);
});

it('allows the same name as both a tag and a topic', function () {
    $this->actingAs($this->owner)->post('/admin/tags', ['kind' => 'tag', 'name' => 'AI'])->assertRedirect();
    $this->actingAs($this->owner)->post('/admin/tags', ['kind' => 'topic', 'name' => 'AI'])->assertRedirect();

    expect(Tag::count())->toBe(1)->and(Topic::count())->toBe(1);
});
