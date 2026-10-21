<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class CollectedItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'title', 'url', 'cover_image', 'creator', 'item_type', 'annotation', 'visibility', 'is_demo',
    ];

    protected $casts = ['is_demo' => 'boolean'];

    public function coverUrl(): ?string
    {
        if (! $this->cover_image) {
            return null;
        }

        return str_starts_with($this->cover_image, 'http')
            ? $this->cover_image
            : Storage::url($this->cover_image);
    }

    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable')->orderBy('name');
    }

    public function scopePubliclyVisible(Builder $query): Builder
    {
        return $query->where('visibility', 'public');
    }
}
