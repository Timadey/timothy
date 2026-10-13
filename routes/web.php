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
    Route::get('/', function () {
        return \Inertia\Inertia::render('Admin/Dashboard');
    })->name('dashboard');
});

Route::get('/', function () {
    return \Inertia\Inertia::render('Home');
});
