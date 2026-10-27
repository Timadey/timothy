<?php

namespace App\Observers;

use App\Support\CacheKeys;
use Illuminate\Database\Eloquent\Model;

class CacheFlushObserver
{
    public function saved(Model $model): void
    {
        CacheKeys::flushFor($model);
    }

    public function deleted(Model $model): void
    {
        CacheKeys::flushFor($model);
    }
}
