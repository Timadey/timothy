<?php

namespace Database\Seeders;

use App\Models\{CollectedItem, NowSection, Post, Project, Setting, SocialLink, Tag, Topic, User};
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DemoContentSeeder extends Seeder
{
    public function run(): void
    {
        $owner = User::where('role', 'owner')->first() ?? User::first() ?? User::factory()->create();

        Setting::updateOrCreate(['key' => 'site_title'], ['value' => 'Timadey']);
        Setting::updateOrCreate(['key' => 'tagline'], ['value' => 'A personal corner of the internet']);
        Setting::updateOrCreate(['key' => 'footer_text'], ['value' => 'Built with care. Demo content is editable and removable in Settings.']);
        Setting::updateOrCreate(['key' => 'home_intro'], ['value' => 'This is a demonstration introduction. Replace it from Admin → Settings.']);
        Setting::updateOrCreate(['key' => 'home_statement'], ['value' => 'Demo statement: currently exploring ideas about technology and product building.']);

        collect([
            ['name' => 'Technology', 'slug' => 'technology', 'description' => 'How tools shape the way we live and work.'],
            ['name' => 'Product Thinking', 'slug' => 'product-thinking', 'description' => 'Building things people actually use.'],
            ['name' => 'Ideas in Progress', 'slug' => 'ideas-in-progress', 'description' => 'Half-formed thoughts worth developing.'],
        ])->each(fn ($t) => Topic::updateOrCreate(['slug' => $t['slug']], $t));

        collect(['systems', 'writing', 'learning', 'building', 'research', 'notes'])
            ->each(fn ($name) => Tag::updateOrCreate(['slug' => $name], ['name' => $name]));

        $articles = [
            ['title' => 'Demo: How I Approach Hard Problems', 'excerpt' => 'Demonstration article showing how the writing archive looks and behaves.'],
            ['title' => 'Demo: Notes on Building Personal Tools', 'excerpt' => 'Demonstration article about small, personal software.'],
            ['title' => 'Demo: Reading Notes as Thinking Infrastructure', 'excerpt' => 'Demonstration article on keeping a digital garden.'],
            ['title' => 'Demo: The Difference Between Features and Products', 'excerpt' => 'Demonstration article on product judgment.'],
            ['title' => 'Demo: Learning in Public', 'excerpt' => 'Demonstration article on sharing unfinished work.'],
            ['title' => 'Demo: Why Personal Websites Still Matter', 'excerpt' => 'Demonstration article on owning your corner of the internet.'],
        ];
        foreach ($articles as $i => $a) {
            Post::updateOrCreate(
                ['slug' => Str::slug($a['title'])],
                [
                    'author_id' => $owner->id,
                    'title' => $a['title'],
                    'excerpt' => $a['excerpt'],
                    'body' => "## About this demo\n\n{$a['excerpt']}\n\nThis content exists only to demonstrate the interface. Edit or delete it from the admin dashboard.\n\n- Sample list item\n- Another point\n\n```js\nconsole.log('code blocks work');\n```\n\n> A blockquote for flavor.",
                    'post_type' => 'article',
                    'status' => 'published',
                    'visibility' => 'public',
                    'featured' => $i < 2,
                    'is_demo' => true,
                    'published_at' => now()->subDays($i * 3 + 1),
                    'reading_time' => 4,
                ]
            );
        }

        $notes = [
            'Demo note: a half-formed thought about interfaces.',
            'Demo note: question — what makes a tool feel personal?',
            'Demo note: reminder to reread an old essay.',
            'Demo note: small observations beat big plans.',
            'Demo note: friction is information.',
            'Demo note: defaults are opinions.',
            'Demo note: depth beats breadth when learning.',
            'Demo note: ship the boring version first.',
        ];
        foreach ($notes as $i => $body) {
            Post::updateOrCreate(
                ['slug' => Str::slug($body)],
                [
                    'author_id' => $owner->id,
                    'title' => ucfirst($body),
                    'excerpt' => $body,
                    'body' => $body."\n\nDemonstration note — replace me.",
                    'post_type' => 'note',
                    'status' => 'published',
                    'visibility' => 'public',
                    'is_demo' => true,
                    'published_at' => now()->subHours($i * 7 + 2),
                    'reading_time' => 1,
                ]
            );
        }

        $projects = [
            ['name' => 'Demo: Timadey', 'summary' => 'This very website — a personal platform.', 'status' => 'building'],
            ['name' => 'Demo: Idea Scratchpad', 'summary' => 'A tool for capturing and linking raw ideas.', 'status' => 'exploring'],
            ['name' => 'Demo: Reading Tracker', 'summary' => 'Track books with notes and highlights.', 'status' => 'paused'],
            ['name' => 'Demo: Terminal Theme Kit', 'summary' => 'A small collection of dotfiles and scripts.', 'status' => 'completed'],
            ['name' => 'Demo: API Playground', 'summary' => 'An interactive scratchpad for testing endpoints.', 'status' => 'idea'],
        ];
        foreach ($projects as $p) {
            Project::updateOrCreate(
                ['slug' => Str::slug($p['name'])],
                [
                    'name' => $p['name'],
                    'summary' => $p['summary'],
                    'description' => "## Overview\n\n{$p['summary']}\n\nThis is demonstration content for evaluating the projects interface.",
                    'status' => $p['status'],
                    'visibility' => 'public',
                    'is_demo' => true,
                    'featured' => str_contains($p['name'], 'Timadey'),
                    'started_at' => now()->subMonths(2),
                ]
            );
        }

        $collected = [
            ['title' => 'Thinking in Systems', 'creator' => 'Donella Meadows', 'item_type' => 'book', 'annotation' => 'Demo annotation: a classic introduction to systems thinking.'],
            ['title' => 'The Design of Everyday Things', 'creator' => 'Don Norman', 'item_type' => 'book', 'annotation' => 'Demo annotation: why affordances matter.'],
            ['title' => 'Demo: Article on personal knowledge management', 'creator' => 'Example Author', 'item_type' => 'article', 'annotation' => 'Demo annotation: useful framing for digital gardens.', 'url' => 'https://example.com'],
            ['title' => 'Demo: Podcast episode on neurotech', 'creator' => 'Example Podcast', 'item_type' => 'podcast', 'annotation' => 'Demo annotation: broad overview of the field.'],
            ['title' => 'Demo: Talk on product craft', 'creator' => 'Example Speaker', 'item_type' => 'video', 'annotation' => 'Demo annotation: good primer on product judgment.'],
            ['title' => 'Figma', 'creator' => 'Example', 'item_type' => 'tool', 'annotation' => 'Demo annotation: everyday design tool.'],
            ['title' => 'Demo quote about curiosity', 'creator' => 'Example', 'item_type' => 'quote', 'annotation' => 'Demo annotation: stands in for a real saved quote.'],
            ['title' => 'Demo: Favorite album this month', 'creator' => 'Example Artist', 'item_type' => 'music', 'annotation' => 'Demo annotation: listening on repeat.'],
            ['title' => 'Demo: Reference website', 'creator' => 'Example', 'item_type' => 'website', 'annotation' => 'Demo annotation: handy reference.', 'url' => 'https://example.com'],
            ['title' => 'Demo: Open source utility', 'creator' => 'Example Org', 'item_type' => 'tool', 'annotation' => 'Demo annotation: small quality-of-life tool.', 'url' => 'https://example.com'],
        ];
        foreach ($collected as $c) {
            CollectedItem::updateOrCreate(
                ['title' => $c['title']],
                $c + ['visibility' => 'public', 'is_demo' => true]
            );
        }

        $nowSections = [
            ['key' => 'building', 'label' => 'Currently building', 'body' => 'Demo: refining this website.'],
            ['key' => 'learning', 'label' => 'Currently learning', 'body' => 'Demo: exploring how personal software should work.'],
            ['key' => 'reading', 'label' => 'Reading', 'body' => 'Demo: a book about systems thinking.'],
            ['key' => 'listening', 'label' => 'Listening to', 'body' => 'Demo: an instrumental playlist.'],
            ['key' => 'playing', 'label' => 'Playing', 'body' => null],
            ['key' => 'exploring', 'label' => 'Exploring', 'body' => 'Demo: ideas around digital gardens.'],
            ['key' => 'questions', 'label' => 'Current questions', 'body' => 'Demo: what makes an interface feel personal?'],
            ['key' => 'milestones', 'label' => 'Recent milestones', 'body' => 'Demo: launched the first version.'],
        ];
        foreach ($nowSections as $i => $s) {
            NowSection::updateOrCreate(['key' => $s['key']], $s + ['sort_order' => $i, 'visible' => true]);
        }

        SocialLink::updateOrCreate(
            ['platform' => 'GitHub'],
            ['url' => 'https://github.com', 'label' => 'GitHub', 'sort_order' => 0, 'visible' => true]
        );
    }
}
