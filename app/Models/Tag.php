<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Support\Str;

class Tag extends Model
{
    protected $fillable = ['name', 'slug'];

    public function posts(): MorphToMany
    {
        return $this->morphedByMany(Post::class, 'taggable');
    }

    public function projects(): MorphToMany
    {
        return $this->morphedByMany(Project::class, 'taggable');
    }

    public function collectedItems(): MorphToMany
    {
        return $this->morphedByMany(CollectedItem::class, 'taggable');
    }

    protected static function booted(): void
    {
        static::saving(function (Tag $tag) {
            if (! $tag->slug) {
                $tag->slug = Str::slug($tag->name);
            }
        });
    }
}
