<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NowSection extends Model
{
    protected $fillable = ['key', 'label', 'body', 'sort_order', 'visible'];

    protected $casts = ['visible' => 'boolean'];

    public function updates(): HasMany
    {
        return $this->hasMany(NowUpdate::class);
    }
}
