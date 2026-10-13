<?php

namespace Database\Factories;

use App\Models\CollectedItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CollectedItem>
 */
class CollectedItemFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title' => fake()->unique()->words(4, true),
            'url' => fake()->optional()->url(),
            'creator' => fake()->name(),
            'item_type' => 'book',
            'annotation' => fake()->sentence(),
            'visibility' => 'public',
            'is_demo' => false,
        ];
    }
}
