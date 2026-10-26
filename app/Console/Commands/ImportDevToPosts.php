<?php

namespace App\Console\Commands;

use App\Models\Post;
use App\Models\Tag;
use App\Models\User;
use App\Support\HtmlSanitizer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImportDevToPosts extends Command
{
    protected $signature = 'devto:import
        {--only=* : Import only these slugs (site slug or dev.to slug)}
        {--author= : User ID to attribute imported posts to}';

    protected $description = 'Import published articles from dev.to/timadey into the site';

    private const KEEP_TAGS = ['p', 'h1', 'h2', 'h3', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'br', 'hr', 'a', 'img', 'figure', 'figcaption'];

    private const RENAME_TAGS = ['h4' => 'h3', 'h5' => 'h3', 'h6' => 'h3'];

    private const DROP_TAGS = ['script', 'style', 'svg', 'noscript', 'iframe', 'object', 'embed', 'head', 'meta', 'link', 'title', 'template', 'button', 'input', 'form', 'select', 'textarea', 'video', 'audio', 'picture', 'source', 'canvas', 'map', 'base'];

    /** @var list<string> */
    private array $errors = [];

    public function handle(): int
    {
        $author = $this->option('author')
            ? User::find($this->option('author'))
            : User::first();

        if (! $author) {
            $this->error('No author user found. Create a user first or pass --author=<id>.');

            return self::FAILURE;
        }

        $articles = Http::get('https://dev.to/api/articles', ['username' => 'timadey', 'per_page' => 100])
            ->throw()
            ->json();

        $only = array_filter((array) $this->option('only'));
        $imported = 0;
        $skipped = 0;

        foreach ($articles as $item) {
            if ($only !== [] && ! $this->matchesFilter($item, $only)) {
                $skipped++;

                continue;
            }

            $siteSlug = Post::makeSlug($item['title']);

            if (Post::withTrashed()->where('source_url', $item['url'])->exists()
                || Post::withTrashed()->where('slug', $siteSlug)->exists()) {
                $skipped++;
                $this->line("  skipped: {$item['title']} (already imported)");

                continue;
            }

            try {
                $post = $this->importArticle($item, $author, $siteSlug);
                $imported++;
                $this->info("  imported: {$post->title} -> /writing/{$post->slug}");
            } catch (\Throwable $e) {
                $this->errors[] = "{$item['title']}: {$e->getMessage()}";
                $this->error("  failed: {$item['title']} - {$e->getMessage()}");
            }
        }

        $this->newLine();
        $this->info("Imported: {$imported}, skipped: {$skipped}, failed: ".count($this->errors));

        return $this->errors === [] ? self::SUCCESS : self::FAILURE;
    }

    /** @param list<string> $only */
    private function matchesFilter(array $item, array $only): bool
    {
        return in_array($item['slug'], $only, true)
            || in_array(Post::makeSlug($item['title']), $only, true);
    }

    private function importArticle(array $item, User $author, string $siteSlug): Post
    {
        $show = Http::get('https://dev.to/api/articles/'.$item['id'])->throw()->json();

        $body = HtmlSanitizer::sanitize($this->cleanBody((string) ($show['body_html'] ?? '')));

        $cover = $this->downloadImage($show['cover_image'] ?? null)
            ?? $this->downloadImage($show['social_image'] ?? null);

        $description = $show['description'] ?? null;

        $post = Post::create([
            'author_id' => $author->id,
            'title' => $show['title'],
            'slug' => $siteSlug,
            'excerpt' => $description,
            'body' => $body,
            'post_type' => 'article',
            'status' => 'published',
            'visibility' => 'public',
            'featured' => false,
            'is_demo' => false,
            'cover_image' => $cover,
            'source_url' => $show['url'],
            'meta_title' => $show['title'],
            'meta_description' => $description,
            'published_at' => isset($show['published_at']) && $show['published_at'] !== null
                ? \Illuminate\Support\Carbon::parse($show['published_at'])->timezone(config('app.timezone'))
                : null,
        ]);

        $tagIds = collect($show['tag_list'] ?? [])
            ->filter()
            ->map(fn ($name) => Tag::firstOrCreate(['slug' => Str::slug($name)], ['name' => $name])->id)
            ->all();
        $post->tags()->sync($tagIds);

        return $post;
    }

    private function cleanBody(string $html): string
    {
        if (trim($html) === '') {
            return '';
        }

        $html = preg_replace_callback(
            '/[^\x00-\x7F]/u',
            fn (array $m) => '&#'.mb_ord($m[0], 'UTF-8').';',
            $html,
        ) ?? $html;

        $doc = new \DOMDocument();
        libxml_use_internal_errors(true);
        $doc->loadHTML('<div id="__import_root">'.$html.'</div>', LIBXML_NOERROR | LIBXML_NOWARNING);
        libxml_clear_errors();

        $root = (new \DOMXPath($doc))->query('//div[@id="__import_root"]')->item(0);
        if (! $root instanceof \DOMElement) {
            return $html;
        }

        $this->localizeImages($doc);
        $this->cleanChildren($root);

        $out = '';
        foreach ($root->childNodes as $child) {
            $out .= $doc->saveHTML($child);
        }

        return $out;
    }

    private function localizeImages(\DOMDocument $doc): void
    {
        foreach ((new \DOMXPath($doc))->query('//img') as $img) {
            $src = $img->getAttribute('src');

            if ($src === '' || str_starts_with($src, '/storage/')) {
                continue;
            }

            $local = $this->downloadImage($src);

            if ($local === null) {
                $img->parentNode?->removeChild($img);

                continue;
            }

            $img->setAttribute('src', $local);
        }
    }

    private function cleanChildren(\DOMElement $parent): void
    {
        foreach (iterator_to_array($parent->childNodes) as $child) {
            if ($child instanceof \DOMComment) {
                $parent->removeChild($child);

                continue;
            }

            if (! $child instanceof \DOMElement) {
                continue;
            }

            $tag = strtolower($child->tagName);

            if (in_array($tag, self::DROP_TAGS, true)) {
                $parent->removeChild($child);

                continue;
            }

            if (isset(self::RENAME_TAGS[$tag])) {
                $child = $this->renameElement($child, self::RENAME_TAGS[$tag]);
                $tag = strtolower($child->tagName);
            }

            if (in_array($tag, self::KEEP_TAGS, true)) {
                $this->sanitizeAttributes($child);
                $this->cleanChildren($child);

                if ($tag === 'a' && ! $child->hasAttribute('href')) {
                    $this->unwrap($parent, $child);
                } elseif ($tag === 'img' && ! $child->hasAttribute('src')) {
                    $parent->removeChild($child);
                }

                continue;
            }

            $this->cleanChildren($child);
            $this->unwrap($parent, $child);
        }
    }

    private function renameElement(\DOMElement $old, string $tag): \DOMElement
    {
        $new = $old->ownerDocument->createElement($tag);

        while ($old->firstChild) {
            $new->appendChild($old->firstChild);
        }

        $old->parentNode?->replaceChild($new, $old);

        return $new;
    }

    private function unwrap(\DOMElement $parent, \DOMElement $node): void
    {
        while ($node->firstChild) {
            $parent->insertBefore($node->firstChild, $node);
        }

        $parent->removeChild($node);
    }

    private function sanitizeAttributes(\DOMElement $el): void
    {
        $tag = strtolower($el->tagName);
        $allowed = match ($tag) {
            'a' => ['href', 'title', 'target', 'rel'],
            'img' => ['src', 'alt', 'width', 'height'],
            default => [],
        };

        $attributes = [];
        for ($i = 0; $i < $el->attributes->length; $i++) {
            $attributes[] = $el->attributes->item($i);
        }

        foreach ($attributes as $attr) {
            $name = strtolower($attr->nodeName);
            $value = trim($attr->nodeValue ?? '');

            if (! in_array($name, $allowed, true)) {
                $el->removeAttribute($attr->nodeName);

                continue;
            }

            if ($name === 'href' && ! $this->validHref($value)) {
                $el->removeAttribute($attr->nodeName);

                continue;
            }

            if ($name === 'target' && ! in_array($value, ['_blank', '_self'], true)) {
                $el->removeAttribute($attr->nodeName);

                continue;
            }

            if (in_array($name, ['width', 'height'], true) && ! ctype_digit($value)) {
                $el->removeAttribute($attr->nodeName);
            }
        }
    }

    private function validHref(string $value): bool
    {
        if ($value === '') {
            return false;
        }

        if (str_starts_with($value, '#')) {
            return true;
        }

        if (str_starts_with($value, '/')) {
            return ! str_starts_with($value, '//');
        }

        foreach (['http://', 'https://', 'mailto:'] as $scheme) {
            if (stripos($value, $scheme) === 0) {
                return true;
            }
        }

        return false;
    }

    private function downloadImage(?string $url): ?string
    {
        if ($url === null || $url === '') {
            return null;
        }

        if (str_starts_with($url, '/storage/')) {
            return $url;
        }

        try {
            $response = Http::accept('image/*')->get($url);
        } catch (\Throwable) {
            return null;
        }

        if (! $response->ok() || $response->body() === '') {
            return null;
        }

        $contentType = strtolower(trim(explode(';', $response->header('Content-Type', ''))[0]));
        $ext = match ($contentType) {
            'image/png' => 'png',
            'image/jpeg', 'image/jpg' => 'jpg',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
            default => $this->extFromUrl($url),
        };

        $path = 'uploads/devto/'.sha1($url).'.'.$ext;
        Storage::disk('public')->put($path, $response->body());

        return '/storage/'.$path;
    }

    private function extFromUrl(string $url): string
    {
        $ext = strtolower(pathinfo((string) parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION));

        if (! in_array($ext, ['png', 'jpg', 'jpeg', 'webp', 'gif'], true)) {
            return 'png';
        }

        return $ext === 'jpeg' ? 'jpg' : $ext;
    }
}
