<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ImportDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $jsonPath = database_path('seeders/data_import.json');
        
        if (!file_exists($jsonPath)) {
            $this->command->error("File seeding JSON tidak ditemukan: $jsonPath");
            return;
        }

        $jsonContent = file_get_contents($jsonPath);
        $fullData = json_decode($jsonContent, true); // Now objects { di_data, structures }

        if (!$fullData) {
            $this->command->error("Gagal decode JSON.");
            return;
        }
        
        $diData = $fullData['di_data'] ?? [];
        // $structures = $fullData['structures'] ?? [];

        // 1. Pastikan Daerah Irigasi ada & Update Detail
        $diName = 'D.I. KEDUNGLIMUS ARCA';
        
        // Cek existing
        $existingDi = DB::table('daerah_irigasi')->where('name', $diName)->first();
        
        $updateData = [
            'luas_baku_permen' => $diData['luas_baku_permen'] ?? null,
            'luas_baku_igt' => $diData['luas_baku_igt'] ?? null,
            'alih_fungsi_total' => $diData['alih_fungsi_total'] ?? null,
            'q_kebutuhan_bendung' => $diData['q_kebutuhan_bendung'] ?? null,
            'q_tersedia_bendung' => $diData['q_tersedia_bendung'] ?? null,
            'q_tersedia_saluran' => $diData['q_tersedia_saluran'] ?? null,
            'faktor_k' => $diData['faktor_k'] ?? null,
            'rppa_irigasi' => $diData['rppa_irigasi'] ?? null,
        ];
        
        if ($existingDi) {
            DB::table('daerah_irigasi')->where('id', $existingDi->id)->update($updateData);
            $this->command->info("Daerah Irigasi '$diName' diperbarui dengan data screenshot.");
            $diId = $existingDi->id;
        } else {
            $insertData = array_merge(['name' => $diName], $updateData);
            $diId = DB::table('daerah_irigasi')->insertGetId($insertData);
            $this->command->info("Daerah Irigasi '$diName' dibuat baru dengan data screenshot.");
        }
    }
}
