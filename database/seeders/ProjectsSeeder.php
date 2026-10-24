<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\Tag;
use Illuminate\Database\Seeder;

class ProjectsSeeder extends Seeder
{
    public function run(): void
    {
        $tags = collect([
            'building', 'systems', 'writing', 'design', 'tools', 'reading',
        ])->map(fn ($name) => Tag::firstOrCreate(['slug' => $name], ['name' => ucfirst($name)]))->keyBy('slug');

        $projects = [
            [
                'name' => 'Timadey',
                'slug' => 'timadey',
                'summary' => 'This personal platform — writing, things I collect, and projects I keep coming back to.',
                'description' => "This website is my corner of the internet: a place for writing, collected things, and projects I keep returning to.\n\nIt's built with Laravel, Inertia, React, and Tailwind, and it runs on a small VPS. Owning the platform means I control the design, the data, and the cadence — no algorithm decides what you see here.\n\nTech: Laravel, Inertia.js, React, Tailwind CSS, PostgreSQL, Vitest, Playwright.",
                'status' => 'active',
                'visibility' => 'public',
                'cover_image' => 'https://picsum.photos/seed/timadey-1/1200/800',
                'live_url' => 'https://timothyadeleke.com',
                'repository_url' => null,
                'started_at' => '2025-06-01',
                'completed_at' => null,
                'featured' => true,
            ],
            [
                'name' => 'Dotfiles',
                'slug' => 'dotfiles',
                'summary' => 'Shell configuration, editor setup, and small scripts that make my terminal feel like home.',
                'description' => "A collection of shell configuration, editor setup, and small scripts that make my terminal feel like home.\n\nIt covers shell aliases and functions, editor configuration, and a handful of one-off scripts for repetitive tasks. Nothing clever — just boring, reliable tooling that I use every day.\n\nTech: Zsh, tmux, Neovim, Bash.",
                'status' => 'completed',
                'visibility' => 'public',
                'cover_image' => 'https://picsum.photos/seed/timadey-2/1200/800',
                'live_url' => null,
                'repository_url' => null,
                'started_at' => '2025-01-10',
                'completed_at' => '2025-04-03',
                'featured' => false,
            ],
            [
                'name' => 'Systems reader',
                'slug' => 'systems-reader',
                'summary' => 'A place to keep highlights and thoughts from the systems-thinking books I read.',
                'description' => "A place to keep highlights and thoughts from the systems-thinking books I read.\n\nInstead of highlighting and forgetting, this captures the ideas worth returning to — feedback loops, constraints, leverage points — with short notes on how each one shows up in daily work.\n\nTech: Laravel, Inertia, PostgreSQL.",
                'status' => 'exploring',
                'visibility' => 'public',
                'cover_image' => 'https://picsum.photos/seed/timadey-3/1200/800',
                'live_url' => null,
                'repository_url' => null,
                'started_at' => '2025-09-12',
                'completed_at' => null,
                'featured' => false,
            ],
            [
                'name' => 'Terminal theme kit',
                'slug' => 'terminal-theme-kit',
                'summary' => 'A small collection of dotfiles and color themes for terminal tools.',
                'description' => "A small collection of dotfiles and color themes for terminal tools.\n\nIt groups together terminal color schemes, prompt configuration, and editor themes so a new machine can be set up in minutes rather than hours.\n\nTech: Shell, Lua, JSON.",
                'status' => 'completed',
                'visibility' => 'public',
                'cover_image' => 'https://picsum.photos/seed/timadey-4/1200/800',
                'live_url' => null,
                'repository_url' => null,
                'started_at' => '2025-02-20',
                'completed_at' => '2025-03-15',
                'featured' => true,
            ],
            [
                'name' => 'API scratchpad',
                'slug' => 'api-scratchpad',
                'summary' => 'An interactive page for testing API endpoints without leaving the browser.',
                'description' => "An interactive page for testing API endpoints without leaving the browser.\n\nIt lets you set headers, tweak the body, and see responses immediately — useful for debugging integrations while they're being built.\n\nTech: React, TypeScript, Vite.",
                'status' => 'idea',
                'visibility' => 'public',
                'cover_image' => 'https://picsum.photos/seed/timadey-5/1200/800',
                'live_url' => null,
                'repository_url' => null,
                'started_at' => null,
                'completed_at' => null,
                'featured' => false,
            ],
        ];

        foreach ($projects as $p) {
            $project = Project::updateOrCreate(
                ['slug' => $p['slug']],
                $p
            );

            $assigned = match ($p['slug']) {
                'timadey' => ['building', 'writing', 'tools'],
                'dotfiles' => ['tools', 'building'],
                'systems-reader' => ['systems', 'reading', 'writing'],
                'terminal-theme-kit' => ['design', 'tools'],
                'api-scratchpad' => ['building', 'tools'],
                default => [],
            };

            $project->tags()->sync(
                collect($assigned)->map(fn ($name) => $tags[$name]->id)->all()
            );
        }
    }
}
