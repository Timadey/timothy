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

    Route::get('projects', [\App\Http\Controllers\Admin\ProjectController::class, 'index'])->name('projects.index');
    Route::get('projects/create', [\App\Http\Controllers\Admin\ProjectController::class, 'create'])->name('projects.create');
    Route::post('projects', [\App\Http\Controllers\Admin\ProjectController::class, 'store'])->name('projects.store');
    Route::get('projects/{project}/edit', [\App\Http\Controllers\Admin\ProjectController::class, 'edit'])->name('projects.edit');
    Route::put('projects/{project}', [\App\Http\Controllers\Admin\ProjectController::class, 'update'])->name('projects.update');
    Route::delete('projects/{project}', [\App\Http\Controllers\Admin\ProjectController::class, 'destroy'])->name('projects.destroy');

    Route::get('collected', [\App\Http\Controllers\Admin\CollectedItemController::class, 'index'])->name('collected.index');
    Route::get('collected/create', [\App\Http\Controllers\Admin\CollectedItemController::class, 'create'])->name('collected.create');
    Route::post('collected', [\App\Http\Controllers\Admin\CollectedItemController::class, 'store'])->name('collected.store');
    Route::get('collected/{collectedItem}/edit', [\App\Http\Controllers\Admin\CollectedItemController::class, 'edit'])->name('collected.edit');
    Route::put('collected/{collectedItem}', [\App\Http\Controllers\Admin\CollectedItemController::class, 'update'])->name('collected.update');
    Route::delete('collected/{collectedItem}', [\App\Http\Controllers\Admin\CollectedItemController::class, 'destroy'])->name('collected.destroy');

    Route::get('now', [\App\Http\Controllers\Admin\NowController::class, 'edit'])->name('now.edit');
    Route::put('now', [\App\Http\Controllers\Admin\NowController::class, 'update'])->name('now.update');

    Route::get('about', [\App\Http\Controllers\Admin\AboutController::class, 'edit'])->name('about.edit');
    Route::put('about', [\App\Http\Controllers\Admin\AboutController::class, 'update'])->name('about.update');

    Route::get('social', [\App\Http\Controllers\Admin\SocialLinkController::class, 'index'])->name('social.index');
    Route::post('social', [\App\Http\Controllers\Admin\SocialLinkController::class, 'store'])->name('social.store');
    Route::put('social/{socialLink}', [\App\Http\Controllers\Admin\SocialLinkController::class, 'update'])->name('social.update');
    Route::delete('social/{socialLink}', [\App\Http\Controllers\Admin\SocialLinkController::class, 'destroy'])->name('social.destroy');

    Route::get('tags', [\App\Http\Controllers\Admin\TaxonomyController::class, 'index'])->name('tags.index');
    Route::post('tags', [\App\Http\Controllers\Admin\TaxonomyController::class, 'store'])->name('tags.store');
    Route::delete('tags/{kind}/{id}', [\App\Http\Controllers\Admin\TaxonomyController::class, 'destroy'])->name('tags.destroy');

    Route::get('settings', [\App\Http\Controllers\Admin\SettingsController::class, 'edit'])->name('settings.edit');
    Route::put('settings', [\App\Http\Controllers\Admin\SettingsController::class, 'update'])->name('settings.update');
    Route::delete('settings/demo-content', [\App\Http\Controllers\Admin\SettingsController::class, 'destroyDemo'])->name('settings.demo');
});

Route::get('/', \App\Http\Controllers\HomeController::class);

Route::get('/writing', [\App\Http\Controllers\WritingController::class, 'index'])->name('writing.index');
Route::get('/writing/{slug}', [\App\Http\Controllers\WritingController::class, 'show'])->name('writing.show');

Route::get('/notes', [\App\Http\Controllers\NoteController::class, 'index'])->name('notes.index');
Route::get('/notes/{slug}', [\App\Http\Controllers\NoteController::class, 'show'])->name('notes.show');

Route::get('/projects', [\App\Http\Controllers\ProjectController::class, 'index'])->name('projects.index');
Route::get('/projects/{slug}', [\App\Http\Controllers\ProjectController::class, 'show'])->name('projects.show');

Route::get('/collected', [\App\Http\Controllers\CollectedController::class, 'index'])->name('collected.index');

Route::get('/about', \App\Http\Controllers\AboutController::class)->name('about');
Route::get('/now', \App\Http\Controllers\NowPageController::class)->name('now');

Route::get('/search', \App\Http\Controllers\SearchController::class)->name('search');
