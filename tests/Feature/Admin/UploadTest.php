<?php

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('public');
    $this->owner = User::factory()->create(['role' => 'owner']);
});

it('rejects unauthenticated uploads', function () {
    $this->postJson('/admin/uploads', ['image' => UploadedFile::fake()->create('a.png', 10, 'image/png')])
        ->assertStatus(401);
});

it('stores a valid image and returns a storage url', function () {
    $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
    $file = UploadedFile::fake()->createWithContent('photo.png', $png);

    $response = $this->actingAs($this->owner)->postJson('/admin/uploads', ['image' => $file]);

    $response->assertOk();
    $url = $response->json('url');
    expect($url)->toStartWith('/storage/uploads/')
        ->and(Storage::disk('public')->exists(str_replace('/storage/', '', $url)))->toBeTrue();
});

it('rejects oversized images', function () {
    $file = UploadedFile::fake()->create('big.jpg', 6000, 'image/jpeg');

    $this->actingAs($this->owner)
        ->postJson('/admin/uploads', ['image' => $file])
        ->assertStatus(422);
});

it('rejects non-image files', function () {
    $file = UploadedFile::fake()->createWithContent('shell.php', '<?php echo 1;');

    $this->actingAs($this->owner)
        ->postJson('/admin/uploads', ['image' => $file])
        ->assertStatus(422);
});

it('rejects svg files', function () {
    $svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
    $file = UploadedFile::fake()->createWithContent('img.svg', $svg);

    $this->actingAs($this->owner)
        ->postJson('/admin/uploads', ['image' => $file])
        ->assertStatus(422);
});
