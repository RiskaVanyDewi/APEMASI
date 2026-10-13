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
        if (!Schema::hasTable('param_kebutuhan_air')) {
            Schema::create('param_kebutuhan_air', function (Blueprint $table) {
                $table->id();
                $table->string('crop_type', 40);
                $table->string('phase', 40);
                $table->decimal('unit_lps_per_ha', 10, 3);
                // $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('param_kebutuhan_air');
    }
};
