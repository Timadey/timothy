<?php

namespace Database\Factories;

use App\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->unique()->words(3, true);

        return [
            'name' => ucfirst($name),
            'summary' => fake()->sentence(),
            'description' => '<h2>Overview</h2><p>'.fake()->paragraph().'</p>',
            'status' => 'building',
            'visibility' => 'public',
            'featured' => false,
            'is_demo' => false,
            'started_at' => now()->subMonth(),
        ];
    }
}
