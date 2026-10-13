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
        if (!Schema::hasTable('bangunan_bagi')) {
            Schema::create('bangunan_bagi', function (Blueprint $table) {
                $table->id();
                $table->foreignId('di_id')->constrained('daerah_irigasi');
                $table->foreignId('canal_id')->constrained('saluran'); // Assuming canal_id refs saluran
                $table->string('nomenklatur_bagi', 80);
                $table->string('hm', 30)->nullable();
                $table->string('lokasi', 120)->nullable();
                $table->decimal('a_igt_ha', 10, 2)->nullable();
                $table->integer('order_no')->nullable();
                $table->decimal('lat', 10, 7)->nullable();
                $table->decimal('lng', 10, 7)->nullable();
                // $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bangunan_bagi');
    }
};
