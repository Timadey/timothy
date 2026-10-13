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
        'visibility', 'featured', 'cover_image', 'meta_title', 'meta_description',
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
                $post->slug = static::makeSlug($post->title);
            }
            $post->reading_time = static::readingTimeFromBody((string) $post->body);
            if ($post->status === 'published' && ! $post->published_at) {
                $post->published_at = now();
            }
        });
    }
}
