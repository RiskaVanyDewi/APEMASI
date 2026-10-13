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
        Schema::table('bangunan_sadap', function (Blueprint $table) {
            // Add missing columns to match bangunan_bagi structure
            if (!Schema::hasColumn('bangunan_sadap', 'di_id')) {
                $table->unsignedBigInteger('di_id')->nullable()->after('structure_id');
            }
            if (!Schema::hasColumn('bangunan_sadap', 'canal_id')) {
                $table->unsignedBigInteger('canal_id')->nullable()->after('di_id');
            }
            if (!Schema::hasColumn('bangunan_sadap', 'hm')) {
                $table->string('hm', 20)->nullable()->after('nomenklatur_sadap');
            }
            if (!Schema::hasColumn('bangunan_sadap', 'lokasi')) {
                $table->string('lokasi', 100)->nullable()->after('hm');
            }
            if (!Schema::hasColumn('bangunan_sadap', 'a_igt_ha')) {
                $table->decimal('a_igt_ha', 8, 2)->nullable()->after('side');
            }
            if (!Schema::hasColumn('bangunan_sadap', 'order_no')) {
                $table->integer('order_no')->nullable()->after('qtersedia_ldt');
            }
            if (!Schema::hasColumn('bangunan_sadap', 'lat')) {
                $table->decimal('lat', 10, 8)->nullable()->after('order_no');
            }
            if (!Schema::hasColumn('bangunan_sadap', 'lng')) {
                $table->decimal('lng', 11, 8)->nullable()->after('lat');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bangunan_sadap', function (Blueprint $table) {
            $table->dropColumn(['di_id', 'canal_id', 'hm', 'lokasi', 'a_igt_ha', 'order_no', 'lat', 'lng']);
        });
    }
};
