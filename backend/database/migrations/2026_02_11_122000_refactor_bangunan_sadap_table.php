<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Refactor bangunan_sadap dengan kolom yang sama seperti bangunan_bagi
     */
    public function up(): void
    {
        // Jika tabel sudah ada, drop dan buat ulang
        if (Schema::hasTable('bangunan_sadap')) {
            Schema::drop('bangunan_sadap');
        }

        Schema::create('bangunan_sadap', function (Blueprint $table) {
            $table->id();
            $table->foreignId('structure_id')->constrained('bangunan_bagi');
            $table->string('nomenklatur_sadap', 80);
            $table->string('side', 20)->nullable(); // 'Ki', 'Ka'
            
            // Area Padi (Ha) & Fase Tanaman
            $table->decimal('apadi_ha', 10, 2)->nullable();
            $table->string('fase_padi', 50)->nullable();
            
            // Area Palawija (Ha) & Fase Tanaman
            $table->decimal('apalawija_ha', 10, 2)->nullable();
            $table->string('fase_palawija', 50)->nullable();
            
            // Area Tebu (Ha) & Fase Tanaman
            $table->decimal('atebu_ha', 10, 2)->nullable();
            $table->string('fase_tebu', 50)->nullable();
            
            // Area Hortikultura (Ha) & Fase Tanaman
            $table->decimal('aholtikultura_ha', 10, 2)->nullable();
            $table->string('fase_holtikultura', 50)->nullable();
            
            // Area Kolam (Ha)
            $table->decimal('akolam_ha', 10, 2)->nullable();
            
            // Kebutuhan Air (lt/dt)
            $table->decimal('qpadi_ldt', 10, 2)->nullable();
            $table->decimal('qpalawija_ldt', 10, 2)->nullable();
            $table->decimal('qtebu_ldt', 10, 2)->nullable();
            $table->decimal('qholtikultura_ldt', 10, 2)->nullable();
            $table->decimal('qkolam_ldt', 10, 2)->nullable();
            $table->decimal('qkebutuhan_ldt', 10, 2)->nullable();
            $table->decimal('qtersedia_ldt', 10, 2)->nullable();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bangunan_sadap');
    }
};
