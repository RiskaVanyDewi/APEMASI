<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\BangunanBagi;
use App\Models\BangunanSadap;
use App\Models\BuildingRecord;
use App\Models\User;

class BuildingRecordSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get first user or create dummy user
        $user = User::first();
        if (!$user) {
            $user = User::create([
                'name' => 'Admin',
                'email' => 'admin@apemasi.local',
                'password' => bcrypt('password'),
            ]);
        }

        // Get all bangunan_bagi records
        $bangunanBagi = BangunanBagi::all();
        
        // Define some sample periods for 2026
        $periods = [
            '2026-01-P1' => 'Jan I',
            '2026-02-P1' => 'Feb I',
            '2026-03-P1' => 'Mar I',
        ];

        foreach ($bangunanBagi as $building) {
            foreach ($periods as $periodKey => $periodLabel) {
                // Create building record using the crop and water data from bangunan_bagi
                $recordData = [
                    'apadi_ha' => $building->apadi_ha ?? 0,
                    'fase_padi' => $building->fase_padi ?? 'Pengolahan',
                    'qpadi_ldt' => $building->qpadi_ldt ?? 0,
                    
                    'apalawija_ha' => $building->apalawija_ha ?? 0,
                    'fase_palawija' => $building->fase_palawija,
                    'qpalawija_ldt' => $building->qpalawija_ldt ?? 0,
                    
                    'atebu_ha' => $building->atebu_ha ?? 0,
                    'fase_tebu' => $building->fase_tebu,
                    'qtebu_ldt' => $building->qtebu_ldt ?? 0,
                    
                    'aholtikultura_ha' => $building->aholtikultura_ha ?? 0,
                    'fase_holtikultura' => $building->fase_holtikultura,
                    'qholtikultura_ldt' => $building->qholtikultura_ldt ?? 0,
                    
                    'akolam_ha' => $building->akolam_ha ?? 0,
                    'qkolam_ldt' => $building->qkolam_ldt ?? 0,
                    
                    'qkebutuhan_ldt' => $building->qkebutuhan_ldt ?? 0,
                    'qtersedia_ldt' => $building->qtersedia_ldt ?? 0,
                ];

                $sumQ = ($recordData['qpadi_ldt'] ?? 0) + 
                        ($recordData['qpalawija_ldt'] ?? 0) + 
                        ($recordData['qtebu_ldt'] ?? 0) + 
                        ($recordData['qholtikultura_ldt'] ?? 0) + 
                        ($recordData['qkolam_ldt'] ?? 0);

                // Check if record already exists
                $exists = BuildingRecord::where('building_id', $building->id)
                    ->where('p_key', $periodKey)
                    ->exists();

                if (!$exists) {
                    BuildingRecord::create([
                        'building_id' => $building->id,
                        'user_id' => $user->id,
                        'periode' => $periodLabel,
                        'p_key' => $periodKey,
                        'data' => array_merge($recordData, [
                            'sumQ' => $sumQ,
                            'hasil' => ['sumQ' => $sumQ],
                        ]),
                    ]);
                }
            }
        }

        echo "Building records seeded successfully!\n";
    }
}
