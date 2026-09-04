<?php

/*
|--------------------------------------------------------------------------
| Route regrouping pattern (Phase F1)
|--------------------------------------------------------------------------
| Today every route sits under auth:sanctum only, which means a student
| token can reach admin handlers. Wrap the existing route families in these
| groups. Do not rename routes: the frontend contract check depends on the
| current names.
*/

use Illuminate\Support\Facades\Route;

Route::middleware(['api.json'])->group(function () {
    // Public
    Route::post('login', [\App\Http\Controllers\Api\AuthController::class, 'login'])
        ->middleware('throttle:login')
        ->name('auth_login');

    Route::middleware(['auth:sanctum'])->group(function () {
        // Any authenticated user
        Route::get('me', [\App\Http\Controllers\Api\AuthController::class, 'me'])->name('me');
        Route::post('logout', [\App\Http\Controllers\Api\AuthController::class, 'logout'])->name('auth_logout');

        // Admin surface
        Route::middleware(['role:admin', 'school.scope'])->group(function () {
            require __DIR__.'/api/admin.php';
        });

        // Teacher surface
        Route::middleware(['role:teacher', 'school.scope'])->group(function () {
            require __DIR__.'/api/teacher.php';
        });

        // Student surface
        Route::middleware(['role:student', 'school.scope'])->group(function () {
            require __DIR__.'/api/student.php';
        });

        // Sponsor surface
        Route::middleware(['role:sponsor', 'school.scope'])->group(function () {
            require __DIR__.'/api/sponsor.php';
        });

        // Deliberately shared, e.g. messaging between permitted parties
        Route::middleware(['role:admin,teacher,student', 'school.scope'])->group(function () {
            require __DIR__.'/api/shared.php';
        });
    });
});
