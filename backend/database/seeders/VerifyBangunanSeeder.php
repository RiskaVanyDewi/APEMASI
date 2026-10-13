<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class VerifyBangunanSeeder extends Seeder
{
    public function run(): void
    {
        // Count buildings for DI=2
        $total = DB::table('bangunan_bagi')->where('di_id', 2)->count();
        $kanan = DB::table('bangunan_bagi')->where('di_id', 2)->where('canal_id', 4)->count();
        $kiri = DB::table('bangunan_bagi')->where('di_id', 2)->where('canal_id', 5)->count();
        
        echo "\n✅ Buildings Verification for DI=2:\n";
        echo "   Total: $total\n";
        echo "   Saluran Kanan (canal_id=4): $kanan\n";
        echo "   Saluran Kiri (canal_id=5): $kiri\n";
        
        if ($kanan == 0 && $kiri == 0 && $total == 0) {
            echo "\n❌ ERROR: No buildings found! Seeding BangunanBagiSeeder first...\n";
            $this->call(BangunanBagiSeeder::class);
            
            // Re-count
            $total = DB::table('bangunan_bagi')->where('di_id', 2)->count();
            $kanan = DB::table('bangunan_bagi')->where('di_id', 2)->where('canal_id', 4)->count();
            $kiri = DB::table('bangunan_bagi')->where('di_id', 2)->where('canal_id', 5)->count();
            
            echo "\n✅ After seeding:\n";
            echo "   Total: $total\n";
            echo "   Saluran Kanan: $kanan\n";
            echo "   Saluran Kiri: $kiri\n";
        }
    }
}
