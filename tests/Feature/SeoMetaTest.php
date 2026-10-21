<?php

use App\Models\{Post, Project, Setting, SocialLink, User};

function seoLdJsonBlocks(string $html): array
{
    preg_match_all('/<script type="application\/ld\+json">(.*?)<\/script>/s', $html, $matches);

    return array_map(function (string $json) {
        $decoded = json_decode($json, true);
        expect(json_last_error())->toBe(JSON_ERROR_NONE);

        return $decoded;
    }, $matches[1]);
}

function seoMakeArticle(array $attrs = []): Post
{
    $author = User::factory()->create(['display_name' => 'Ada Author']);

    return Post::factory()->create(array_merge([
        'post_type' => 'article', 'status' => 'published', 'visibility' => 'public',
        'published_at' => now()->subDay(), 'author_id' => $author->id,
        'body' => '## Heading

Some content for the article body used in SEO tests.',
    ], $attrs));
}

it('renders home seo meta with canonical og twitter and person json-ld', function () {
    SocialLink::create(['platform' => 'GitHub', 'url' => 'https://github.com/timadey', 'label' => 'GitHub', 'sort_order' => 1, 'visible' => true]);

    $html = $this->get('/')->assertOk()->getContent();

    expect($html)
        ->toContain('rel="canonical"')
        ->toContain('property="og:title"')
        ->toContain('property="og:type" content="website"')
        ->toContain('name="twitter:card"')
        ->toContain('name="twitter:title"');

    $blocks = seoLdJsonBlocks($html);
    expect($blocks)->not->toBeEmpty();

    $person = collect($blocks)->firstWhere('@type', 'Person');
    expect($person)->not->toBeNull()
        ->and($person['sameAs'])->toContain('https://github.com/timadey')
        ->and($person['url'])->toContain('http');
});

it('reflects site_title setting on home title', function () {
    Setting::set('site_title', 'My Corner');
    Setting::set('tagline', 'Notes from the edge');

    $this->get('/')->assertOk()
        ->assertSee('<title>My Corner — Notes from the edge</title>', false);
});

it('renders article json-ld with headline and datePublished matching db', function () {
    $publishedAt = now()->subDays(3)->startOfSecond();
    $post = seoMakeArticle([
        'title' => 'Quantum Gardening',
        'slug' => 'quantum-gardening',
        'excerpt' => 'A summary about gardens and qubits.',
        'published_at' => $publishedAt,
    ]);

    $html = $this->get('/writing/quantum-gardening')->assertOk()->getContent();

    expect($html)
        ->toContain('rel="canonical"')
        ->toContain('property="og:type" content="article"')
        ->toContain('name="twitter:card"');

    $article = collect(seoLdJsonBlocks($html))->firstWhere('@type', 'Article');
    expect($article)->not->toBeNull()
        ->and($article['headline'])->toBe('Quantum Gardening')
        ->and($article['description'])->toBe('A summary about gardens and qubits.')
        ->and($article['datePublished'])->toBe($publishedAt->toIso8601String())
        ->and($article['author']['name'])->toBe('Ada Author')
        ->and($article['mainEntityOfPage']['@id'])->toContain('/writing/quantum-gardening');
});

it('emits cover image when set and brand card otherwise', function () {
    seoMakeArticle(['title' => 'No Cover', 'slug' => 'no-cover', 'cover_image' => null]);
    seoMakeArticle(['title' => 'With Cover', 'slug' => 'with-cover', 'cover_image' => 'covers/hero.jpg']);

    $without = $this->get('/writing/no-cover')->assertOk()->getContent();
    $cardUrl = url('/images/og-card.png');
    expect($without)
        ->toContain('property="og:image" content="'.$cardUrl.'"')
        ->toContain('name="twitter:image" content="'.$cardUrl.'"')
        ->toContain('name="twitter:card" content="summary_large_image"');

    $with = $this->get('/writing/with-cover')->assertOk()->getContent();
    $coverUrl = url('/covers/hero.jpg');
    expect($with)
        ->toContain('property="og:image" content="'.$coverUrl.'"')
        ->toContain('name="twitter:image" content="'.$coverUrl.'"')
        ->toContain('name="twitter:card" content="summary_large_image"');
});

it('404s draft article for guests', function () {
    seoMakeArticle(['title' => 'Secret Draft', 'slug' => 'secret-draft', 'status' => 'draft']);

    $this->get('/writing/secret-draft')->assertNotFound();
});

it('renders project detail canonical and twitter card', function () {
    Project::factory()->create([
        'name' => 'Lighthouse',
        'slug' => 'lighthouse',
        'summary' => 'A beacon for ships.',
        'status' => 'active',
        'visibility' => 'public',
    ]);

    $html = $this->get('/projects/lighthouse')->assertOk()->getContent();

    expect($html)
        ->toContain('rel="canonical" href="'.url('/projects/lighthouse').'"')
        ->toContain('name="twitter:card"')
        ->toContain('property="og:title" content="Lighthouse — '.config('app.name').'"');

    $work = collect(seoLdJsonBlocks($html))->firstWhere('@type', 'CreativeWork');
    expect($work)->not->toBeNull()
        ->and($work['name'])->toBe('Lighthouse')
        ->and($work['url'])->toContain('/projects/lighthouse');
});

it('renders noindex and proper title on 404', function () {
    $html = $this->get('/definitely-missing-page')->assertNotFound()->getContent();

    expect($html)
        ->toContain('name="robots" content="noindex"')
        ->toContain('Page not found');
});

it('noindexes search and ask pages', function () {
    $search = $this->get('/search')->assertOk()->getContent();
    expect($search)
        ->toContain('name="robots" content="noindex,follow"')
        ->toContain('<title>Search —');

    $ask = $this->get('/ask')->assertOk()->getContent();
    expect($ask)
        ->toContain('name="robots" content="noindex,follow"')
        ->toContain('<title>Ask —');
});

it('emits parseable json-ld on writing index and about', function () {
    $writing = $this->get('/writing')->assertOk()->getContent();
    $blocks = seoLdJsonBlocks($writing);
    expect($writing)->toContain('rel="canonical"')
        ->toContain('property="og:type" content="website"');

    $about = $this->get('/about')->assertOk()->getContent();
    $aboutBlocks = seoLdJsonBlocks($about);
    expect($aboutBlocks)->not->toBeEmpty();
    expect(collect($aboutBlocks)->firstWhere('@type', 'Person'))->not->toBeNull();
});

it('advertises the rss feed for autodiscovery on public pages', function () {
    $html = $this->get('/')->assertOk()->getContent();

    expect($html)->toContain('rel="alternate"')
        ->toContain('type="application/rss+xml"')
        ->toContain('href="/rss.xml"');
});

it('emits favicon, touch icon, and theme-color in the head', function () {
    $html = $this->get('/')->assertOk()->getContent();

    expect($html)
        ->toContain('<link rel="icon" href="/favicon.ico">')
        ->toContain('<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">')
        ->toContain('<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">')
        ->toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png">')
        ->toContain('<meta name="theme-color" content="#ffffff">');
});
