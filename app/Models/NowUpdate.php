<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NowUpdate extends Model
{
    protected $fillable = ['now_section_id', 'text', 'occurred_at', 'visible'];

    protected $casts = [
        'occurred_at' => 'datetime',
        'visible' => 'boolean',
    ];

    public function section(): BelongsTo
    {
        return $this->belongsTo(NowSection::class, 'now_section_id');
    }
}
