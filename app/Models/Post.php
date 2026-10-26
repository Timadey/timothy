<?php

namespace App\Models;

use App\Models\Concerns\HasSlug;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Post extends Model
{
    use HasFactory, HasSlug, SoftDeletes;

    protected $fillable = [
        'author_id', 'title', 'slug', 'excerpt', 'body', 'post_type', 'status',
        'visibility', 'featured', 'cover_image', 'source_url', 'meta_title', 'meta_description',
        'og_image', 'reading_time', 'is_demo', 'published_at',
    ];

    protected $casts = [
        'featured' => 'boolean',
        'is_demo' => 'boolean',
        'published_at' => 'datetime',
    ];

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable')->orderBy('name');
    }

    public function topics(): MorphToMany
    {
        return $this->morphToMany(Topic::class, 'topicable')->orderBy('name');
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', 'published')
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }

    public function scopePubliclyVisible(Builder $query): Builder
    {
        return $query->published()->where('visibility', 'public');
    }

    public function scopeOfType(Builder $query, string $type): Builder
    {
        return $query->where('post_type', $type);
    }

    public static function readingTimeFromBody(string $body): int
    {
        $text = trim(strip_tags($body));
        $words = str_word_count($text);

        return max(1, (int) ceil($words / 220));
    }

    protected static function booted(): void
    {
        static::saving(function (Post $post) {
            if (! $post->slug) {
                $post->slug = static::resolveSlug($post->title, $post->body);
            }
            $post->reading_time = static::readingTimeFromBody((string) $post->body);
            if ($post->status === 'published' && ! $post->published_at) {
                $post->published_at = now();
            }
        });
    }

    public static function resolveSlug(?string $title, ?string $body = null): string
    {
        if ($title !== null && $title !== '') {
            return static::makeSlug($title);
        }

        $firstLine = trim(\Illuminate\Support\Str::before((string) $body, "\n"));
        if ($firstLine === '') {
            return static::makeSlug('note');
        }

        $kept = [];
        $length = 0;
        foreach (preg_split('/\s+/', $firstLine) ?: [] as $word) {
            $add = mb_strlen($word) + ($kept !== [] ? 1 : 0);
            if (count($kept) >= 8 || ($kept !== [] && $length + $add > 40)) {
                break;
            }
            $kept[] = $word;
            $length += $add;
        }

        $source = implode(' ', $kept);
        if (mb_strlen($source) > 40) {
            $source = rtrim(mb_substr($source, 0, 40));
        }

        return static::makeSlug($source !== '' ? $source : 'note');
    }

    public static function convertMarkdownBodiesToHtml(): void
    {
        $markdown = app(\App\Services\MarkdownService::class);

        static::query()
            ->where('post_type', '!=', 'note')
            ->orderBy('id')
            ->chunkById(100, function ($posts) use ($markdown) {
                foreach ($posts as $post) {
                    $post->body = $markdown->render((string) $post->body);
                    $post->save();
                }
            });
    }

    public static function shortenTitlelessSlugs(int $max = 45): void
    {
        static::query()
            ->where('post_type', 'note')
            ->whereNull('title')
            ->whereRaw('LENGTH(slug) > ?', [$max])
            ->orderBy('id')
            ->get()
            ->each(function (Post $post) {
                $fresh = static::resolveSlug($post->title, $post->body);
                if ($fresh !== $post->slug) {
                    $post->slug = $fresh;
                    $post->save();
                }
            });
    }

    public function plainBody(): string
    {
        $text = (string) $this->body;

        if ($this->post_type !== 'note') {
            $text = html_entity_decode(strip_tags($text), ENT_QUOTES | ENT_HTML5);
            $text = preg_replace('/\s+/', ' ', $text) ?? $text;

            return trim($text);
        }

        $text = preg_replace('/^#{1,6}\s*/m', '', $text) ?? $text;
        $text = preg_replace('/^\s*(?:[->*+]|\d+\.)\s+/m', '', $text) ?? $text;
        $text = str_replace(['**', '__', '~~', '`'], '', $text);
        $text = preg_replace('/\[([^\]]+)\]\([^)]*\)/', '$1', $text) ?? $text;
        $text = preg_replace('/\s+/', ' ', $text) ?? $text;

        return trim($text);
    }

    public function titleOrSnippet(int $limit = 60): string
    {
        if ($this->title !== null && $this->title !== '') {
            return $this->title;
        }

        $plain = $this->plainBody();

        return $plain !== '' ? self::cut($plain, $limit) : 'Untitled';
    }

    public function streamHeadline(int $limit = 90): string
    {
        if ($this->title !== null && $this->title !== '') {
            return $this->title;
        }

        $plain = $this->plainBody();

        if ($plain === '') {
            return 'Untitled';
        }

        return $this->plainExcerpt($limit);
    }

    public function streamTeaser(int $limit = 280): string
    {
        $teaser = $this->plainExcerpt($limit);

        if ($this->title === null || $this->title === '') {
            $base = rtrim($this->streamHeadline(), '…');
            if ($base !== '' && str_starts_with($teaser, $base)) {
                $teaser = ltrim(mb_substr($teaser, mb_strlen($base)));
            }
        }

        return $teaser;
    }

    public function plainExcerpt(int $limit = 280): string
    {
        $plain = $this->plainBody();

        if (mb_strlen($plain) <= $limit) {
            return $plain;
        }

        $cut = mb_substr($plain, 0, $limit);
        $space = mb_strrpos($cut, ' ');
        if ($space !== false && $space > (int) ($limit * 0.6)) {
            $cut = mb_substr($cut, 0, $space);
        }

        return rtrim($cut).'…';
    }

    private static function cut(string $text, int $limit): string
    {
        return mb_strlen($text) <= $limit ? $text : mb_substr($text, 0, $limit).'…';
    }
}
