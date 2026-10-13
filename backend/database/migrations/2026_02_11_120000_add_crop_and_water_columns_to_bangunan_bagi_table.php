<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Menambahkan kolom untuk area tanam dan kebutuhan air berbagai jenis tanaman
     */
    public function up(): void
    {
        Schema::table('bangunan_bagi', function (Blueprint $table) {
            // Area (Ha) untuk berbagai jenis tanam
            $table->decimal('apadi_ha', 10, 2)->nullable()->after('a_igt_ha');
            $table->decimal('apalainja_ha', 10, 2)->nullable()->after('apadi_ha');
            $table->decimal('atebu_ha', 10, 2)->nullable()->after('apalainja_ha');
            $table->decimal('akolkultura_ha', 10, 2)->nullable()->after('atebu_ha');
            
            // Kebutuhan air (lt/dt) untuk berbagai jenis tanam
            $table->decimal('qpadi_ldt', 10, 2)->nullable()->after('akolkultura_ha');
            $table->decimal('qpalainja_ldt', 10, 2)->nullable()->after('qpadi_ldt');
            $table->decimal('qtebu_ldt', 10, 2)->nullable()->after('qpalainja_ldt');
            $table->decimal('qkolkultur_ldt', 10, 2)->nullable()->after('qtebu_ldt');
            $table->decimal('qsaltikult_ldt', 10, 2)->nullable()->after('qkolkultur_ldt');
            
            // Total kebutuhan air
            $table->decimal('qasaraka_ldt', 10, 2)->nullable()->after('qsaltikult_ldt');
            $table->decimal('qtersedia_ldt', 10, 2)->nullable()->after('qasaraka_ldt');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bangunan_bagi', function (Blueprint $table) {
            $table->dropColumn([
                'apadi_ha',
                'apalainja_ha',
                'atebu_ha',
                'akolkultura_ha',
                'qpadi_ldt',
                'qpalainja_ldt',
                'qtebu_ldt',
                'qkolkultur_ldt',
                'qsaltikult_ldt',
                'qasaraka_ldt',
                'qtersedia_ldt',
            ]);
        });
    }
};
