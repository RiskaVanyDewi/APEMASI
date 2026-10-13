<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BuildingController;
use App\Http\Controllers\Api\BuildingRecordController;
use App\Http\Controllers\Api\UserController;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/users', [UserController::class, 'store']);
Route::get('/users', [UserController::class, 'index']); // DEBUG: List semua users
Route::delete('/users/{id}', [UserController::class, 'destroy']);
Route::get('/users/test/create', [UserController::class, 'testCreate']); // DEBUG: Test create

// Public routes
Route::get('/ping', function () {
    return response()->json(['ok' => true]);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Building inputs (save requires auth)
    Route::post('/building-records', [BuildingRecordController::class, 'store']);
});

// Building records (read is public)
Route::get('/building-records/{buildingId}', [BuildingRecordController::class, 'show']);
Route::get('/building-records', [BuildingRecordController::class, 'index']);

Route::get('/buildings', [BuildingController::class, 'index']);
Route::get('/buildings/{id}', [BuildingController::class, 'show']);

Route::get('/daerah-irigasi', function() {
    return \App\Models\DaerahIrigasi::all();
});