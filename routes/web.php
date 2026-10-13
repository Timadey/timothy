<?php

use App\Http\Controllers\Admin\AuthController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('/admin/login', [AuthController::class, 'create'])->name('login');
    Route::post('/admin/login', [AuthController::class, 'store'])->middleware('throttle:5,1');
});

Route::post('/admin/logout', [AuthController::class, 'destroy'])
    ->middleware('auth')
    ->name('logout');

Route::prefix('admin')->name('admin.')->middleware(['auth', 'owner'])->group(function () {
    Route::get('/', [\App\Http\Controllers\Admin\DashboardController::class, 'index'])->name('dashboard');

    Route::get('posts', [\App\Http\Controllers\Admin\PostController::class, 'index'])->name('posts.index');
    Route::get('posts/create', [\App\Http\Controllers\Admin\PostController::class, 'create'])->name('posts.create');
    Route::post('posts', [\App\Http\Controllers\Admin\PostController::class, 'store'])->name('posts.store');
    Route::get('posts/{post}/edit', [\App\Http\Controllers\Admin\PostController::class, 'edit'])->name('posts.edit');
    Route::put('posts/{post}', [\App\Http\Controllers\Admin\PostController::class, 'update'])->name('posts.update');
    Route::delete('posts/{post}', [\App\Http\Controllers\Admin\PostController::class, 'destroy'])->name('posts.destroy');
    Route::get('posts/{post}/preview', [\App\Http\Controllers\Admin\PostController::class, 'preview'])->name('posts.preview');

    Route::post('preview-markdown', function (\Illuminate\Http\Request $request) {
        $data = $request->validate(['markdown' => ['nullable', 'string', 'max:200000']]);

        return response()->json([
            'html' => app(\App\Services\MarkdownService::class)->render($data['markdown'] ?? ''),
        ]);
    })->name('preview-markdown');
});

Route::get('/', function () {
    return \Inertia\Inertia::render('Home');
});
