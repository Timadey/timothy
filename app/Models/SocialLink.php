<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SocialLink extends Model
{
    protected $fillable = ['platform', 'url', 'label', 'sort_order', 'visible'];

    protected $casts = ['visible' => 'boolean'];
}
