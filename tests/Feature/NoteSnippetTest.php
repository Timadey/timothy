<?php

use App\Models\{Post, User};

const NOTE_BODY = 'Shipping the quick notes feature today, finally the way microblogging should feel.';

function makeTitlelessNote(array $overrides = []): Post
{
    $author = User::factory()->create();

    return Post::factory()->create(array_merge([
        'post_type' => 'note',
        'status' => 'published',
        'visibility' => 'public',
        'published_at' => now(),
        'author_id' => $author->id,
        'title' => null,
        'slug' => 'quiet-note',
        'body' => NOTE_BODY,
    ], $overrides));
}

it('falls back to a stripped body snippet when a note has no title', function () {
    $note = makeTitlelessNote(['body' => "## Hello there\n\nThis is **bold** and `code`, a fairly long body that will need truncating for the snippet."]);

    $snippet = $note->titleOrSnippet();

    expect($snippet)->not->toStartWith('#')
        ->and($snippet)->toContain('Hello there')
        ->and($snippet)->not->toContain('**')
        ->and(mb_strlen($snippet))->toBeLessThanOrEqual(61);
});

it('uses the snippet as the title in the activity feed', function () {
    makeTitlelessNote();

    $this->get('/activity')->assertInertia(fn ($page) => $page
        ->where('feed.0.title', mb_substr(NOTE_BODY, 0, 60).'…'));
});

it('uses the snippet as the RSS item title', function () {
    makeTitlelessNote();

    $xml = $this->get('/rss.xml')->assertOk()->getContent();

    expect($xml)->toContain('Shipping the quick notes feature today');
});

it('exposes headline, teaser, and body_html in the notes stream payload', function () {
    $long = 'Why does there seem to be such an intense, adversarial divide between genders today? '
        .'Living in the West, it often feels as though both men and women are intent on mutual destruction rather than finding common ground. '
        .str_repeat('More observations to push this past the teaser limit. ', 8);
    makeTitlelessNote(['body' => $long, 'slug' => 'long-note']);

    $this->get('/notes')->assertInertia(fn ($page) => $page
        ->component('Notes/Index')
        ->where('notes.data.0', function ($note) {
            if (! isset($note['headline'], $note['teaser'], $note['body_html'])) {
                return false;
            }
            $base = rtrim($note['headline'], '…');

            return str_ends_with($note['headline'], '…')
                && mb_strlen($note['headline']) <= 91
                && str_starts_with($note['headline'], 'Why does there seem')
                && $note['teaser'] !== ''
                && mb_strlen($note['teaser']) <= 281
                && ! str_starts_with($note['teaser'], $base)
                && $note['body_html'] !== ''
                && str_contains($note['body_html'], '<p>');
        })
        ->missing('notes.data.0.excerpt_text'));
});

it('uses the exact title as the headline for titled notes', function () {
    makeTitlelessNote(['title' => 'Gender Wars', 'slug' => 'gender-wars']);

    $this->get('/notes')->assertInertia(fn ($page) => $page
        ->where('notes.data.0.headline', 'Gender Wars')
        ->where('notes.data.0.teaser', fn ($t) => str_starts_with($t, 'Shipping the quick notes')));
});

it('provides a headline on the note permalink for seo and the h1 fallback', function () {
    makeTitlelessNote();

    $this->get('/notes/quiet-note')->assertOk()->assertInertia(fn ($page) => $page
        ->component('Notes/Show')
        ->where('note.title', null)
        ->where('note.headline', NOTE_BODY));

    $html = $this->get('/notes/quiet-note')->getContent();
    expect($html)->toMatch('/<title>[^<]*Shipping the quick notes feature today/');
});
