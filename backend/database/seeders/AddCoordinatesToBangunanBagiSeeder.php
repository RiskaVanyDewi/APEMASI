<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\BangunanBagi;

class AddCoordinatesToBangunanBagiSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Default coordinates for Banyumas/Purwokerto area (DI Kedunglimus Arca)
        $baseLat = -7.4305903;
        $baseLng = 109.2483547;
        
        // Get all buildings in DI 2 without coordinates
        $buildings = BangunanBagi::where('di_id', 2)->get();
        
        foreach ($buildings as $index => $building) {
            // If no coordinates, assign slightly different coordinates for each building
            if (!$building->lat || !$building->lng) {
                $building->lat = $baseLat + (($index % 10) - 5) * 0.01; // Spread across ~5km
                $building->lng = $baseLng + (($index / 10) - 2) * 0.01;
                $building->save();
            }
        }
        
        $this->command->info('Updated ' . $buildings->count() . ' buildings with coordinates.');
    }
}
