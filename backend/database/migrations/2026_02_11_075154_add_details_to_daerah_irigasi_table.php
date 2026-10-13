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
        Schema::table('daerah_irigasi', function (Blueprint $table) {
            $table->decimal('luas_baku_permen', 10, 2)->nullable();
            $table->decimal('luas_baku_igt', 10, 2)->nullable();
            $table->decimal('alih_fungsi_total', 10, 2)->nullable();
            $table->decimal('q_kebutuhan_bendung', 10, 2)->nullable();
            $table->decimal('q_tersedia_bendung', 10, 2)->nullable();
            $table->decimal('q_tersedia_saluran', 10, 2)->nullable(); // total
            $table->decimal('faktor_k', 8, 2)->nullable();
            $table->decimal('rppa_irigasi', 8, 2)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('daerah_irigasi', function (Blueprint $table) {
            //
        });
    }
};
