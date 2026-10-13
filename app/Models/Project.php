<?php

namespace App\Models;

use App\Models\Concerns\HasSlug;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use HasFactory, HasSlug, SoftDeletes;

    protected $fillable = [
        'name', 'slug', 'summary', 'description', 'status', 'visibility',
        'cover_image', 'repository_url', 'live_url', 'started_at', 'completed_at',
        'featured', 'is_demo',
    ];

    protected $casts = [
        'featured' => 'boolean',
        'is_demo' => 'boolean',
        'started_at' => 'date',
        'completed_at' => 'date',
    ];

    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable')->orderBy('name');
    }

    public function topics(): MorphToMany
    {
        return $this->morphToMany(Topic::class, 'topicable')->orderBy('name');
    }

    public function scopePubliclyVisible(Builder $query): Builder
    {
        return $query->where('visibility', 'public');
    }

    protected static function booted(): void
    {
        static::saving(function (Project $project) {
            if ($project->isDirty('slug') || ! $project->slug) {
                $project->slug = static::makeSlug($project->name);
            }
        });
    }
}
