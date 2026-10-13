<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DIsSeeder extends Seeder
{
    public function run(): void
    {
        $dis = [
            ['code' => 'DCS', 'name' => 'DI. Dwicupaksari'],
            ['code' => 'BDG', 'name' => 'DI. Bodag'],
            ['code' => 'PBD', 'name' => 'DI. Pribadi'],
            ['code' => 'ADB', 'name' => 'DI. Andongbang'],
            ['code' => 'BNY', 'name' => 'DI. Buniayu'],
            ['code' => 'KBS', 'name' => 'DI. Kebasen'],
            ['code' => 'CLM', 'name' => 'DI. Cilemeuh'],
            ['code' => 'CJL', 'name' => 'DI. Cijalu'],
            ['code' => 'PSA', 'name' => 'DI. Piasa'],
            ['code' => 'ACN', 'name' => 'DI. Kedunglimus Arca'],
            ['code' => 'BNJ', 'name' => 'DI. Banjaran'],
            ['code' => 'KRC', 'name' => 'DI. Krenceng'],
            ['code' => 'KSP', 'name' => 'DI. Kalisapi'],
            ['code' => 'BCN', 'name' => 'DI. Banjarcahyana'],
            ['code' => 'TJM', 'name' => 'DI. Tajum'],
            ['code' => 'SRY', 'name' => 'DI. Serayu'],
            ['code' => 'SGM', 'name' => 'DI. Singomerto'],
        ];

        foreach ($dis as $di) {
            DB::table('daerah_irigasi')->updateOrInsert(
                ['code' => $di['code']],
                ['name' => $di['name'], 'updated_at' => now(), 'created_at' => now()]
            );
        }
    }
}
