<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Support\Str;

class Topic extends Model
{
    protected $fillable = ['name', 'slug', 'description'];

    public function posts(): MorphToMany
    {
        return $this->morphedByMany(Post::class, 'topicable');
    }

    public function projects(): MorphToMany
    {
        return $this->morphedByMany(Project::class, 'topicable');
    }

    protected static function booted(): void
    {
        static::saving(function (Topic $topic) {
            if (! $topic->slug) {
                $topic->slug = Str::slug($topic->name);
            }
        });
    }
}
