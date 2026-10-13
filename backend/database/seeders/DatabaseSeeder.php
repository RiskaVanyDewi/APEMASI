<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            DIsSeeder::class,           // Seed all 17 DIs
            ImportSaluranSeeder::class, // Seed Kedunglimus Structures
            AdminUserSeeder::class,    // Seed Users (linked to DIs)
            ParamKebutuhanAirSeeder::class, // Seed Crop Parameters
        ]);
    }
}
