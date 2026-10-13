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
            $table->dropColumn([
                'luas_baku_permen',
                'luas_baku_igt',
                'alih_fungsi_total',
                'q_kebutuhan_bendung',
                'q_tersedia_bendung',
                'q_tersedia_saluran',
                'faktor_k',
                'rppa_irigasi'
            ]);
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
