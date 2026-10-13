<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphToMany;

class CollectedItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'title', 'url', 'creator', 'item_type', 'annotation', 'visibility', 'is_demo',
    ];

    protected $casts = ['is_demo' => 'boolean'];

    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable')->orderBy('name');
    }

    public function scopePubliclyVisible(Builder $query): Builder
    {
        return $query->where('visibility', 'public');
    }
}
