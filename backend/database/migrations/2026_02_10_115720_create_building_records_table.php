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
        Schema::create('building_records', function (Blueprint $table) {
            $table->id();
            $table->string('building_id')->index(); // e.g. "b-acn-1"
            $table->string('side')->nullable();     // e.g. "kiri" (optional if separate record per side)
            
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            
            $table->string('periode'); // e.g. "Januari Periode 1"
            $table->string('p_key')->index(); // e.g. "2024-01-P1" for filtering
            
            // Simpan semua input form sebagai JSON blob
            // agar fleksibel dan tidak perlu ratusan kolom
            $table->json('data'); 
            
            $table->timestamps();

            // Index composite untuk pencarian cepat
            $table->index(['building_id', 'p_key']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('building_records');
    }
};
