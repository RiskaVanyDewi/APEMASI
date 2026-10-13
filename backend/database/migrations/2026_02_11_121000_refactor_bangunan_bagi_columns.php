<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Menyesuaikan struktur bangunan_bagi dengan dataset yang benar:
     * Apadi (Ha), Fase Tanaman, Apalawija (Ha), Fase Tanaman, Atebu (Ha), Fase Tanaman,
     * Aholtikultura (Ha), Fase Tanaman, Akolam (Ha), Qpadi, Qpalawija, Qtebu, 
     * Qholtikultura, Qkolam, Qkebutuhan, Qtersedia
     */
    public function up(): void
    {
        Schema::table('bangunan_bagi', function (Blueprint $table) {
            // Cek dan drop kolom lama jika ada
            $columns = Schema::getColumnListing('bangunan_bagi');
            
            if (in_array('apadi_ha', $columns)) {
                $table->dropColumn([
                    'apadi_ha', 'apalainja_ha', 'atebu_ha', 'akolkultura_ha',
                    'qpadi_ldt', 'qpalainja_ldt', 'qtebu_ldt', 'qkolkultur_ldt',
                    'qsaltikult_ldt', 'qasaraka_ldt', 'qtersedia_ldt'
                ]);
            }
        });

        Schema::table('bangunan_bagi', function (Blueprint $table) {
            // Area Padi (Ha) & Fase Tanaman
            $table->decimal('apadi_ha', 10, 2)->nullable()->after('a_igt_ha');
            $table->string('fase_padi', 50)->nullable()->after('apadi_ha');
            
            // Area Palawija (Ha) & Fase Tanaman
            $table->decimal('apalawija_ha', 10, 2)->nullable()->after('fase_padi');
            $table->string('fase_palawija', 50)->nullable()->after('apalawija_ha');
            
            // Area Tebu (Ha) & Fase Tanaman
            $table->decimal('atebu_ha', 10, 2)->nullable()->after('fase_palawija');
            $table->string('fase_tebu', 50)->nullable()->after('atebu_ha');
            
            // Area Hortikultura (Ha) & Fase Tanaman
            $table->decimal('aholtikultura_ha', 10, 2)->nullable()->after('fase_tebu');
            $table->string('fase_holtikultura', 50)->nullable()->after('aholtikultura_ha');
            
            // Area Kolam (Ha)
            $table->decimal('akolam_ha', 10, 2)->nullable()->after('fase_holtikultura');
            
            // Kebutuhan Air (lt/dt)
            $table->decimal('qpadi_ldt', 10, 2)->nullable()->after('akolam_ha');
            $table->decimal('qpalawija_ldt', 10, 2)->nullable()->after('qpadi_ldt');
            $table->decimal('qtebu_ldt', 10, 2)->nullable()->after('qpalawija_ldt');
            $table->decimal('qholtikultura_ldt', 10, 2)->nullable()->after('qtebu_ldt');
            $table->decimal('qkolam_ldt', 10, 2)->nullable()->after('qholtikultura_ldt');
            $table->decimal('qkebutuhan_ldt', 10, 2)->nullable()->after('qkolam_ldt');
            $table->decimal('qtersedia_ldt', 10, 2)->nullable()->after('qkebutuhan_ldt');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bangunan_bagi', function (Blueprint $table) {
            $columns = Schema::getColumnListing('bangunan_bagi');
            
            $colsToDelete = [
                'apadi_ha', 'fase_padi', 'apalawija_ha', 'fase_palawija',
                'atebu_ha', 'fase_tebu', 'aholtikultura_ha', 'fase_holtikultura',
                'akolam_ha', 'qpadi_ldt', 'qpalawija_ldt', 'qtebu_ldt',
                'qholtikultura_ldt', 'qkolam_ldt', 'qkebutuhan_ldt', 'qtersedia_ldt'
            ];
            
            $existingCols = array_intersect($colsToDelete, $columns);
            
            if (!empty($existingCols)) {
                $table->dropColumn($existingCols);
            }
        });
    }
};
