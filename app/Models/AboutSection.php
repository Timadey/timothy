<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AboutSection extends Model
{
    protected $fillable = ['key', 'title', 'body', 'sort_order', 'visible'];

    protected $casts = ['visible' => 'boolean'];
}
