<?php

use App\Http\Controllers\Api;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Public read-only endpoints. Only published, public content is exposed.
|
*/

Route::get('/posts', [Api\PostController::class, 'index']);
Route::get('/posts/{slug}', [Api\PostController::class, 'show'])->where('slug', '[A-Za-z0-9\-]+');
Route::get('/notes', [Api\PostController::class, 'notes']);
Route::get('/notes/{slug}', [Api\PostController::class, 'showNote'])->where('slug', '[A-Za-z0-9\-]+');
Route::get('/projects', [Api\ProjectController::class, 'index']);
Route::get('/projects/{slug}', [Api\ProjectController::class, 'show'])->where('slug', '[A-Za-z0-9\-]+');
Route::get('/collected', [Api\CollectedItemController::class, 'index']);
Route::get('/search', [Api\SearchController::class, '__invoke']);
