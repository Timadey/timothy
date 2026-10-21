<?php

namespace App\Support;

use App\Models\{Post, Setting, User};

class Seo
{
    /**
     * Build SEO meta for an Inertia page (array or JSON string) as passed to the root Blade view.
     *
     * @return array{
     *     title: string,
     *     description: ?string,
     *     canonical: ?string,
     *     robots: ?string,
     *     rss: bool,
     *     og: array<string, string|array<int, string>>,
     *     twitter: array<string, string>,
     *     jsonLd: array<int, array<string, mixed>>
     * }
     */
    public static function forPage(mixed $page): array
    {
        if (is_string($page)) {
            $decoded = json_decode($page, true);
            $page = is_array($decoded) ? $decoded : null;
        }

        $component = is_array($page) ? (string) ($page['component'] ?? '') : '';
        $props = is_array($page) ? (array) ($page['props'] ?? []) : [];

        $base = self::baseResult();

        if ($component === '' || str_starts_with($component, 'Admin/')) {
            $base['robots'] = $component !== '' ? 'noindex,follow' : $base['robots'];

            return $base;
        }

        $base['rss'] = true;

        $result = match ($component) {
            'Home' => self::home($props, $base),
            'Writing/Show' => self::writingShow($props, $base),
            'Writing/Index' => self::collection($base, 'Writing', 'Essays and articles.'),
            'Notes/Show' => self::notesShow($props, $base),
            'Notes/Index' => self::collection($base, 'Notes', 'Short notes and updates.'),
            'Projects/Show' => self::projectsShow($props, $base),
            'Projects/Index' => self::collection($base, 'Projects', 'Projects and things I am building.'),
            'Collected/Index' => self::collection($base, 'Collected', 'Things I have collected and found interesting.'),
            'Activity/Index' => self::collection($base, 'Lately', 'Everything I have been writing, building, and collecting.'),
            'About' => self::about($props, $base),
            'Now' => self::now($props, $base),
            'Search' => self::searchLike($base, 'Search'),
            'Ask' => self::searchLike($base, 'Ask'),
            default => $base,
        };

        if (! isset($result['og']['og:image'])) {
            $result['og']['og:image'] = url('/images/og-card.png');
        }
        if (! isset($result['twitter']['twitter:image'])) {
            $result['twitter']['twitter:image'] = url('/images/og-card.png');
            $result['twitter']['twitter:card'] = 'summary_large_image';
        }

        return $result;
    }

    /** @param array<string, mixed> $props */
    protected static function home(array $props, array $base): array
    {
        $siteTitle = self::siteTitle();
        $tagline = self::nullable(Setting::get('tagline'));
        $heroStatus = self::nullable(is_array($props['hero'] ?? null) ? ($props['hero']['status'] ?? null) : null);
        $description = self::truncate($heroStatus ?? $tagline);
        $canonical = self::canonical('/');
        $image = self::absoluteUrl($props['og_image'] ?? null);

        $result = $base;
        $result['title'] = $tagline !== null ? "{$siteTitle} — {$tagline}" : $siteTitle;
        $result['description'] = $description;
        $result['canonical'] = $canonical;
        $result['og'] = self::ogTags('website', $result['title'], $description, $canonical, $image, $siteTitle);
        $result['twitter'] = self::twitterTags($result['title'], $description, $image);
        $result['jsonLd'] = [self::personJsonLd($props, $description, $canonical, $image)];

        return $result;
    }

    /** @param array<string, mixed> $props */
    protected static function writingShow(array $props, array $base): array
    {
        $post = (array) ($props['post'] ?? []);
        $siteTitle = self::siteTitle();
        $headline = (string) ($post['meta_title'] ?? $post['title'] ?? $siteTitle);
        $title = self::pageTitle($headline, $siteTitle);
        $description = self::truncate($post['meta_description'] ?? $post['excerpt'] ?? null);
        $canonical = self::canonical(
            self::nullable($props['canonical'] ?? null) ?? '/writing/'.($post['slug'] ?? '')
        );
        $image = self::absoluteUrl($post['cover_image'] ?? null);
        $published = self::nullable($post['published_iso'] ?? null);
        $modified = self::nullable($post['updated_iso'] ?? null);
        $tags = array_values(array_filter(array_map('strval', (array) ($post['tags'] ?? []))));

        $result = $base;
        $result['title'] = $title;
        $result['description'] = $description;
        $result['canonical'] = $canonical;
        $result['robots'] = ! empty($props['preview']) ? 'noindex,follow' : $base['robots'];
        $result['og'] = self::ogTags('article', $title, $description, $canonical, $image, $siteTitle);
        if ($published !== null) {
            $result['og']['article:published_time'] = $published;
        }
        if ($tags !== []) {
            $result['og']['article:tag'] = $tags;
        }
        $result['twitter'] = self::twitterTags($title, $description, $image);
        $result['jsonLd'] = [self::articleJsonLd([
            'headline' => (string) ($post['title'] ?? $headline),
            'description' => $description,
            'url' => $canonical,
            'image' => $image,
            'datePublished' => $published,
            'dateModified' => $modified,
            'keywords' => $tags,
            'authorName' => self::authorNameForSlug(self::nullable($post['slug'] ?? null)),
            'publisherName' => $siteTitle,
        ]        )];

        return $result;
    }

    /** @param array<string, mixed> $props */
    protected static function notesShow(array $props, array $base): array
    {
        $note = (array) ($props['note'] ?? []);
        $siteTitle = self::siteTitle();
        $headline = (string) ($note['title'] ?? '') ?: (string) ($note['headline'] ?? '') ?: $siteTitle;
        $title = self::pageTitle($headline, $siteTitle);
        $description = self::truncate($note['excerpt'] ?? $note['headline'] ?? null);
        $canonical = self::canonical(
            self::nullable($props['canonical'] ?? null) ?? '/notes/'.($note['slug'] ?? '')
        );
        $image = null;
        $published = self::nullable($note['published_iso'] ?? null);
        $tags = array_values(array_filter(array_map('strval', (array) ($note['tags'] ?? []))));

        $result = $base;
        $result['title'] = $title;
        $result['description'] = $description;
        $result['canonical'] = $canonical;
        $result['robots'] = ! empty($props['preview']) ? 'noindex,follow' : $base['robots'];
        $result['og'] = self::ogTags('article', $title, $description, $canonical, $image, $siteTitle);
        if ($published !== null) {
            $result['og']['article:published_time'] = $published;
        }
        if ($tags !== []) {
            $result['og']['article:tag'] = $tags;
        }
        $result['twitter'] = self::twitterTags($title, $description, $image);
        $result['jsonLd'] = [self::articleJsonLd([
            'headline' => $headline,
            'description' => $description,
            'url' => $canonical,
            'image' => $image,
            'datePublished' => $published,
            'dateModified' => null,
            'keywords' => $tags,
            'authorName' => self::authorNameForSlug(self::nullable($note['slug'] ?? null)),
            'publisherName' => $siteTitle,
        ])];

        return $result;
    }

    /** @param array<string, mixed> $props */
    protected static function projectsShow(array $props, array $base): array
    {
        $project = (array) ($props['project'] ?? []);
        $siteTitle = self::siteTitle();
        $headline = (string) ($project['name'] ?? $siteTitle);
        $title = self::pageTitle($headline, $siteTitle);
        $description = self::truncate($project['summary'] ?? null);
        $canonical = self::canonical(
            self::nullable($props['canonical'] ?? null) ?? '/projects/'.($project['slug'] ?? '')
        );
        $image = self::absoluteUrl($project['cover_image'] ?? null);
        $tags = array_values(array_filter(array_map('strval', (array) ($project['tags'] ?? []))));

        $result = $base;
        $result['title'] = $title;
        $result['description'] = $description;
        $result['canonical'] = $canonical;
        $result['og'] = self::ogTags('website', $title, $description, $canonical, $image, $siteTitle);
        $result['twitter'] = self::twitterTags($title, $description, $image);

        $sameAs = array_values(array_filter([
            self::nullable($project['live_url'] ?? null),
            self::nullable($project['repository_url'] ?? null),
        ]));

        $jsonLd = [
            '@context' => 'https://schema.org',
            '@type' => 'CreativeWork',
            'name' => $headline,
            'url' => $canonical,
        ];
        if ($description !== null) {
            $jsonLd['description'] = $description;
        }
        if ($image !== null) {
            $jsonLd['image'] = $image;
        }
        if ($tags !== []) {
            $jsonLd['keywords'] = implode(', ', $tags);
        }
        if ($sameAs !== []) {
            $jsonLd['sameAs'] = $sameAs;
        }
        $result['jsonLd'] = [$jsonLd];

        return $result;
    }

    /** @param array<string, mixed> $base */
    protected static function collection(array $base, string $label, string $fallbackDescription): array
    {
        $siteTitle = self::siteTitle();
        $tagline = self::nullable(Setting::get('tagline'));
        $title = self::pageTitle($label, $siteTitle);
        $description = self::truncate($tagline ?? $fallbackDescription);
        $canonical = self::canonicalPath();

        $result = $base;
        $result['title'] = $title;
        $result['description'] = $description;
        $result['canonical'] = $canonical;
        $result['og'] = self::ogTags('website', $title, $description, $canonical, null, $siteTitle);
        $result['twitter'] = self::twitterTags($title, $description, null);

        return $result;
    }

    /** @param array<string, mixed> $props */
    protected static function about(array $props, array $base): array
    {
        $siteTitle = self::siteTitle();
        $title = self::pageTitle('About', $siteTitle);
        $tagline = self::nullable(Setting::get('tagline'));
        $description = self::truncate($tagline ?? 'About '.self::sitePersonName());
        $canonical = self::canonical('/about');

        $result = $base;
        $result['title'] = $title;
        $result['description'] = $description;
        $result['canonical'] = $canonical;
        $result['og'] = self::ogTags('website', $title, $description, $canonical, null, $siteTitle);
        $result['twitter'] = self::twitterTags($title, $description, null);
        $result['jsonLd'] = [self::personJsonLd($props, $description, $canonical)];

        return $result;
    }

    /** @param array<string, mixed> $props */
    protected static function now(array $props, array $base): array
    {
        $siteTitle = self::siteTitle();
        $title = self::pageTitle('Now', $siteTitle);
        $description = self::truncate('What I am focused on right now.');
        $canonical = self::canonical('/now');
        $modified = self::nullable($props['last_updated_at'] ?? null);

        $result = $base;
        $result['title'] = $title;
        $result['description'] = $description;
        $result['canonical'] = $canonical;
        $result['og'] = self::ogTags('website', $title, $description, $canonical, null, $siteTitle);
        $result['twitter'] = self::twitterTags($title, $description, null);

        $jsonLd = [
            '@context' => 'https://schema.org',
            '@type' => 'WebPage',
            'name' => 'Now',
            'url' => $canonical,
        ];
        if ($description !== null) {
            $jsonLd['description'] = $description;
        }
        if ($modified !== null) {
            $jsonLd['dateModified'] = $modified;
        }
        $result['jsonLd'] = [$jsonLd];

        return $result;
    }

    /** @param array<string, mixed> $base */
    protected static function searchLike(array $base, string $label): array
    {
        $siteTitle = self::siteTitle();
        $title = self::pageTitle($label, $siteTitle);
        $path = $label === 'Ask' ? '/ask' : '/search';
        $canonical = self::canonical($path);
        $description = self::truncate(
            $label === 'Ask' ? 'Ask a question.' : 'Search this site.'
        );

        $result = $base;
        $result['title'] = $title;
        $result['description'] = $description;
        $result['canonical'] = $canonical;
        $result['robots'] = 'noindex,follow';
        $result['og'] = self::ogTags('website', $title, $description, $canonical, null, $siteTitle);
        $result['twitter'] = self::twitterTags($title, $description, null);

        return $result;
    }

    /** @return array<string, mixed> */
    protected static function baseResult(): array
    {
        $siteTitle = self::siteTitle();
        $tagline = self::nullable(Setting::get('tagline'));

        return [
            'title' => $tagline !== null ? "{$siteTitle} — {$tagline}" : $siteTitle,
            'description' => $tagline,
            'canonical' => self::canonicalPath(),
            'robots' => null,
            'rss' => false,
            'og' => self::ogTags(
                'website',
                $tagline !== null ? "{$siteTitle} — {$tagline}" : $siteTitle,
                $tagline,
                self::canonicalPath(),
                url('/images/og-card.png'),
                $siteTitle
            ),
            'twitter' => self::twitterTags(
                $tagline !== null ? "{$siteTitle} — {$tagline}" : $siteTitle,
                $tagline,
                url('/images/og-card.png')
            ),
            'jsonLd' => [],
        ];
    }

    /** @param array<string, mixed> $props */
    protected static function personJsonLd(array $props, ?string $description, string $url, ?string $image = null): array
    {
        $name = self::sitePersonName();
        $sameAs = array_values(array_filter(array_map(
            fn ($link) => self::nullable(is_array($link) ? ($link['url'] ?? null) : null),
            (array) ($props['social_links'] ?? [])
        )));

        $jsonLd = [
            '@context' => 'https://schema.org',
            '@type' => 'Person',
            '@id' => $url.'#person',
            'name' => $name,
            'url' => $url,
        ];
        if ($description !== null) {
            $jsonLd['description'] = $description;
        }
        if ($image !== null) {
            $jsonLd['image'] = $image;
        }
        if ($sameAs !== []) {
            $jsonLd['sameAs'] = $sameAs;
        }

        return $jsonLd;
    }

    /**
     * @param array{
     *     headline: string,
     *     description: ?string,
     *     url: string,
     *     image: ?string,
     *     datePublished: ?string,
     *     dateModified: ?string,
     *     keywords: array<int, string>,
     *     authorName: string,
     *     publisherName: string
     * } $data
     * @return array<string, mixed>
     */
    protected static function articleJsonLd(array $data): array
    {
        $jsonLd = [
            '@context' => 'https://schema.org',
            '@type' => 'Article',
            'headline' => $data['headline'],
            'mainEntityOfPage' => [
                '@type' => 'WebPage',
                '@id' => $data['url'],
            ],
            'url' => $data['url'],
            'author' => [
                '@type' => 'Person',
                'name' => $data['authorName'],
            ],
            'publisher' => [
                '@type' => 'Person',
                'name' => $data['publisherName'],
            ],
        ];
        if ($data['description'] !== null) {
            $jsonLd['description'] = $data['description'];
        }
        if ($data['image'] !== null) {
            $jsonLd['image'] = $data['image'];
        }
        if ($data['datePublished'] !== null) {
            $jsonLd['datePublished'] = $data['datePublished'];
        }
        if ($data['dateModified'] !== null) {
            $jsonLd['dateModified'] = $data['dateModified'];
        }
        if ($data['keywords'] !== []) {
            $jsonLd['keywords'] = implode(', ', $data['keywords']);
        }

        return $jsonLd;
    }

    /**
     * @param array<string, string|array<int, string>> $extra
     * @return array<string, string|array<int, string>>
     */
    protected static function ogTags(
        string $type,
        string $title,
        ?string $description,
        ?string $canonical,
        ?string $image,
        string $siteName,
        array $extra = []
    ): array {
        $og = [
            'og:type' => $type,
            'og:title' => $title,
            'og:site_name' => $siteName,
        ];
        if ($description !== null) {
            $og['og:description'] = $description;
        }
        if ($canonical !== null) {
            $og['og:url'] = $canonical;
        }
        if ($image !== null) {
            $og['og:image'] = $image;
        }

        return array_merge($og, $extra);
    }

    /** @return array<string, string> */
    protected static function twitterTags(string $title, ?string $description, ?string $image): array
    {
        $twitter = [
            'twitter:card' => $image !== null ? 'summary_large_image' : 'summary',
            'twitter:title' => $title,
        ];
        if ($description !== null) {
            $twitter['twitter:description'] = $description;
        }
        if ($image !== null) {
            $twitter['twitter:image'] = $image;
        }

        return $twitter;
    }

    protected static function siteTitle(): string
    {
        return Setting::get('site_title')
            ?? self::nullable(config('app.name'))
            ?? 'Timadey';
    }

    protected static function sitePersonName(): string
    {
        return User::where('role', 'owner')->value('display_name')
            ?? User::query()->value('display_name')
            ?? self::siteTitle();
    }

    protected static function authorNameForSlug(?string $slug): string
    {
        if ($slug !== null && $slug !== '') {
            $authorName = Post::where('slug', $slug)->with('author')->first()?->author?->display_name;
            if ($authorName) {
                return $authorName;
            }
        }

        return self::sitePersonName();
    }

    protected static function pageTitle(string $title, string $siteTitle): string
    {
        return $title === $siteTitle ? $title : "{$title} — {$siteTitle}";
    }

    protected static function canonical(string $pathOrUrl): string
    {
        if (preg_match('#^https?://#i', $pathOrUrl) === 1) {
            return $pathOrUrl;
        }

        return url('/'.ltrim($pathOrUrl, '/'));
    }

    protected static function canonicalPath(): string
    {
        $path = request()->path();
        $path = $path === '/' ? '/' : '/'.trim($path, '/');

        return url($path === '/' ? '/' : $path);
    }

    protected static function absoluteUrl(?string $pathOrUrl): ?string
    {
        $value = self::nullable($pathOrUrl);
        if ($value === null) {
            return null;
        }

        if (preg_match('#^https?://#i', $value) === 1) {
            return $value;
        }

        return url('/'.ltrim($value, '/'));
    }

    protected static function nullable(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }

    protected static function truncate(?string $text, int $length = 160): ?string
    {
        $text = self::nullable($text);
        if ($text === null) {
            return null;
        }

        $text = trim(preg_replace('/\s+/u', ' ', strip_tags($text)) ?? '');
        if ($text === '') {
            return null;
        }
        if (mb_strlen($text) <= $length) {
            return $text;
        }

        return rtrim(mb_substr($text, 0, $length - 1)).'…';
    }
}
