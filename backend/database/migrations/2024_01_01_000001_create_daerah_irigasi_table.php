<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('daerah_irigasi')) {
            Schema::create('daerah_irigasi', function (Blueprint $table) {
                $table->id();
                $table->string('name', 120)->unique();
                // $table->timestamps(); // Existing table doesn't have timestamps based on Model
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daerah_irigasi');
    }
};
