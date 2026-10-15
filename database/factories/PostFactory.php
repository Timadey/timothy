<?php

namespace Database\Factories;

use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Post>
 */
class PostFactory extends Factory
{
    public function definition(): array
    {
        $title = fake()->unique()->sentence(4);

        return [
            'author_id' => User::factory(),
            'title' => $title,
            'excerpt' => fake()->paragraph(),
            'body' => '<h2>Section</h2><p>'.fake()->paragraph().'</p><p>'.fake()->paragraph().'</p>',
            'post_type' => 'article',
            'status' => 'published',
            'visibility' => 'public',
            'featured' => false,
            'is_demo' => false,
            'published_at' => now()->subDays(fake()->numberBetween(1, 90)),
            'reading_time' => 3,
        ];
    }
}
