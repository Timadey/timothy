<?php

use App\Models\Post;
use App\Models\Project;
use App\Services\MarkdownService;
use App\Models\User;

it('converts article markdown bodies to html', function () {
    $author = User::factory()->create(['role' => 'owner']);
    $post = Post::factory()->create([
        'post_type' => 'article',
        'status' => 'published',
        'visibility' => 'public',
        'published_at' => now(),
        'author_id' => $author->id,
        'title' => 'Hello',
        'body' => "## Section\n\nSome **bold** text with a [link](https://example.com).",
    ]);

    Post::convertMarkdownBodiesToHtml();

    $post->refresh();
    expect($post->body)->toContain('<h2>Section</h2>')
        ->and($post->body)->toContain('<strong>bold</strong>')
        ->and($post->body)->toContain('<a href="https://example.com">');
});

it('leaves note markdown bodies untouched', function () {
    $author = User::factory()->create(['role' => 'owner']);
    $note = Post::factory()->create([
        'post_type' => 'note',
        'status' => 'published',
        'visibility' => 'public',
        'published_at' => now(),
        'author_id' => $author->id,
        'title' => null,
        'body' => 'Notes stay **markdown**.',
    ]);

    Post::convertMarkdownBodiesToHtml();

    expect($note->fresh()->body)->toBe('Notes stay **markdown**.');
});

it('converts project descriptions to html', function () {
    $project = Project::factory()->create([
        'name' => 'Orbit',
        'slug' => 'orbit',
        'summary' => 'A thing',
        'description' => "What it *does*\n\n- Fast\n- Small",
    ]);

    Project::convertDescriptionsToHtml();

    $project->refresh();
    expect($project->description)->toContain('<em>does</em>')
        ->and($project->description)->toContain('<li>Fast</li>');
});
