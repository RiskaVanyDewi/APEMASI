<?php

use Illuminate\Support\Facades\Route;
use App\Models\DaerahIrigasi;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/test-di', function () {
    return DaerahIrigasi::orderBy('id', 'desc')->get();
});

Route::get('/test-saluran', function () {
    return Saluran::with('daerahIrigasi')->get();
});