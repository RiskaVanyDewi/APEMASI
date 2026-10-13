<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ParamKebutuhanAir;
use Illuminate\Support\Facades\DB;

class ParamKebutuhanAirSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Truncate existing data to avoid duplicates if re-run
        ParamKebutuhanAir::truncate();

        $data = [
            // Satuan Kebutuhan Air (l/dt/ha)
            ['crop_type' => 'Padi', 'phase' => 'Pengolahan', 'unit_lps_per_ha' => 1.25],
            ['crop_type' => 'Padi', 'phase' => 'Pertumbuhan', 'unit_lps_per_ha' => 0.725],
            
            ['crop_type' => 'Palawija Sedikit', 'phase' => 'Pengolahan', 'unit_lps_per_ha' => 0.20],
            ['crop_type' => 'Palawija Sedikit', 'phase' => 'Pertumbuhan', 'unit_lps_per_ha' => 0.20],
            
            ['crop_type' => 'Palawija Banyak', 'phase' => 'Pengolahan', 'unit_lps_per_ha' => 0.30],
            ['crop_type' => 'Palawija Banyak', 'phase' => 'Pertumbuhan', 'unit_lps_per_ha' => 0.30],
            
            ['crop_type' => 'Holtikultura', 'phase' => 'Pengolahan', 'unit_lps_per_ha' => 1.00],
            ['crop_type' => 'Holtikultura', 'phase' => 'Pertumbuhan', 'unit_lps_per_ha' => 1.00],
            
            ['crop_type' => 'Kolam', 'phase' => 'Pengolahan', 'unit_lps_per_ha' => 11.00],
            ['crop_type' => 'Kolam', 'phase' => 'Pertumbuhan', 'unit_lps_per_ha' => 11.00],
            
            ['crop_type' => 'Tebu', 'phase' => 'Pengolahan', 'unit_lps_per_ha' => 0.85],
            ['crop_type' => 'Tebu', 'phase' => 'Muda', 'unit_lps_per_ha' => 0.36],
            ['crop_type' => 'Tebu', 'phase' => 'Tua', 'unit_lps_per_ha' => 0.125],

            // Faktor Tersier
            ['crop_type' => 'Faktor Tersier', 'phase' => 'Nilai 1', 'unit_lps_per_ha' => 1.20],
            ['crop_type' => 'Faktor Tersier', 'phase' => 'Nilai 2', 'unit_lps_per_ha' => 1.25],
            ['crop_type' => 'Faktor Tersier', 'phase' => 'Nilai 3', 'unit_lps_per_ha' => 1.30],
            ['crop_type' => 'Faktor Tersier', 'phase' => 'Nilai 4', 'unit_lps_per_ha' => 1.33],
            ['crop_type' => 'Faktor Tersier', 'phase' => 'Nilai 5', 'unit_lps_per_ha' => 1.35],

            // Faktor Kehilangan
            ['crop_type' => 'Faktor Kehilangan', 'phase' => 'Global', 'unit_lps_per_ha' => 0.35],
        ];

        foreach ($data as $item) {
            ParamKebutuhanAir::create($item);
        }
    }
}
