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
        if (!Schema::hasTable('bangunan_sadap')) {
            Schema::create('bangunan_sadap', function (Blueprint $table) {
                $table->id();
                $table->foreignId('structure_id')->constrained('bangunan_bagi');
                $table->string('nomenklatur_sadap', 80);
                $table->enum('side', ['Ka', 'Ki']);
                // $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bangunan_sadap');
    }
};
