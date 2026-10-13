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
        // 1. Update daerah_irigasi
        Schema::table('daerah_irigasi', function (Blueprint $table) {
            if (!Schema::hasColumn('daerah_irigasi', 'code')) {
                $table->string('code', 20)->unique()->after('id')->nullable();
            }
            if (!Schema::hasColumn('daerah_irigasi', 'created_at')) {
                $table->timestamps();
            }
        });

        // 2. Update saluran: Add di_id and timestamps
        Schema::table('saluran', function (Blueprint $table) {
            if (!Schema::hasColumn('saluran', 'di_id')) {
                $table->foreignId('di_id')->nullable()->after('id')->constrained('daerah_irigasi')->nullOnDelete();
            }
            if (!Schema::hasColumn('saluran', 'created_at')) {
                $table->timestamps();
            }
        });

        // 3. Update bangunan_bagi: Add timestamps
        Schema::table('bangunan_bagi', function (Blueprint $table) {
            if (!Schema::hasColumn('bangunan_bagi', 'created_at')) {
                $table->timestamps();
            }
        });

        // 4. Update bangunan_sadap: Add timestamps
        Schema::table('bangunan_sadap', function (Blueprint $table) {
            if (!Schema::hasColumn('bangunan_sadap', 'created_at')) {
                $table->timestamps();
            }
        });

        // 5. Update users: Add di_id for petugases
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'di_id')) {
                $table->foreignId('di_id')->nullable()->after('role')->constrained('daerah_irigasi')->nullOnDelete();
            }
        });

        // 6. Update param_kebutuhan_air: Add timestamps
        Schema::table('param_kebutuhan_air', function (Blueprint $table) {
            if (!Schema::hasColumn('param_kebutuhan_air', 'created_at')) {
                $table->timestamps();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['di_id']);
            $table->dropColumn('di_id');
        });

        Schema::table('saluran', function (Blueprint $table) {
            $table->dropForeign(['di_id']);
            $table->dropColumn(['di_id', 'created_at', 'updated_at']);
        });

        Schema::table('daerah_irigasi', function (Blueprint $table) {
            $table->dropColumn(['code', 'created_at', 'updated_at']);
        });

        Schema::table('bangunan_bagi', function (Blueprint $table) {
            $table->dropColumn(['created_at', 'updated_at']);
        });

        Schema::table('bangunan_sadap', function (Blueprint $table) {
            $table->dropColumn(['created_at', 'updated_at']);
        });

        Schema::table('param_kebutuhan_air', function (Blueprint $table) {
            $table->dropColumn(['created_at', 'updated_at']);
        });
    }
};
