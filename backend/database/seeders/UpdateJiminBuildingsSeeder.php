<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;

class UpdateJiminBuildingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Cari bangunan B.ACN.5 dari database
        $building = \DB::table('bangunan_bagi')
            ->where('nomenklatur_bagi', 'B.ACN.5')
            ->first();

        if (!$building) {
            echo "\n❌ Bangunan B.ACN.5 tidak ditemukan di database\n";
            return;
        }

        echo "\n✅ Ditemukan bangunan B.ACN.5 dengan ID: {$building->id}\n";

        // Update user jimin dengan building_ids
        $user = User::where('username', 'jimin')->first();
        
        if (!$user) {
            echo "❌ User jimin tidak ditemukan\n";
            return;
        }

        $user->building_ids = [$building->id];
        $user->save();

        echo "\n✅ User jimin berhasil di-update dengan building_ids:\n";
        echo "  - Building ID: {$building->id}\n";
        echo "  - Building Code: {$building->nomenklatur_bagi}\n";
        echo "  - Lokasi: {$building->lokasi}\n";
        echo "  - HM: {$building->hm}\n\n";
    }
}
