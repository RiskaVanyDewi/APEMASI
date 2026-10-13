<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ImportSaluranSeeder extends Seeder
{
    public function run(): void
    {
        $jsonPath = database_path('seeders/data_import.json');
        
        if (!file_exists($jsonPath)) return;
        
        $jsonContent = file_get_contents($jsonPath);
        $data = json_decode($jsonContent, true); // Object { structures: [...] }
        $structures = $data['structures'] ?? [];
        
        // 1. Pastikan DI (Get/Create with code)
        $diName = 'DI. Kedunglimus Arca';
        $di = \App\Models\DaerahIrigasi::updateOrCreate(
            ['code' => 'ACN'],
            ['name' => $diName]
        );
        
        $diId = $di->id;
        
        // 2. Buat Saluran (Link to DI)
        $saluranKanan = \App\Models\Saluran::updateOrCreate(
            ['name' => 'Saluran Arca Kanan', 'di_id' => $diId]
        );
        $saluranKananId = $saluranKanan->id;

        $saluranKiri = \App\Models\Saluran::updateOrCreate(
            ['name' => 'Saluran Arca Kiri', 'di_id' => $diId]
        );
        $saluranKiriId = $saluranKiri->id;
        
        // 3. Insert Structures
        $count = 0;
        foreach ($structures as $item) {
            $saluranId = ($item['section'] === 'KANAN') ? $saluranKananId : $saluranKiriId;
            
            // Cek Duplicate Bangunan Bagi
            $existingBagi = DB::table('bangunan_bagi')
                ->where('di_id', $di->id)
                ->where('nomenklatur_bagi', $item['nomenklatur'])
                ->first();

            if ($existingBagi) {
                $bagiId = $existingBagi->id;
                // Update properties just in case
                DB::table('bangunan_bagi')->where('id', $bagiId)->update([
                    'canal_id' => $saluranId,
                    'hm' => $item['hm'],
                    'lokasi' => $item['lokasi'],
                    'order_no' => $item['order_no']
                ]);
            } else {
                $bagiId = DB::table('bangunan_bagi')->insertGetId([
                    'di_id' => $di->id,
                    'canal_id' => $saluranId,
                    'nomenklatur_bagi' => $item['nomenklatur'],
                    'hm' => $item['hm'],
                    'lokasi' => $item['lokasi'],
                    'order_no' => $item['order_no'],
                    'a_igt_ha' => 0
                ]);
            }
            
            $totalArea = 0;
            
            foreach ($item['sadaps'] as $sadap) {
                 // Cek Duplicate Bangunan Sadap
                $existingSadap = DB::table('bangunan_sadap')
                    ->where('structure_id', $bagiId)
                    ->where('nomenklatur_sadap', $sadap['nomenklatur'])
                    ->first();

                if (!$existingSadap) {
                    DB::table('bangunan_sadap')->insert([
                        'structure_id' => $bagiId,
                        'nomenklatur_sadap' => $sadap['nomenklatur'],
                        'side' => $sadap['side']
                    ]);
                }
                $totalArea += (float)$sadap['area'];
            }
            
            DB::table('bangunan_bagi')->where('id', $bagiId)->update(['a_igt_ha' => $totalArea]);
            $count++;
        }
        
        $this->command->info("Berhasil memproses $count struktur data.");
    }
}
