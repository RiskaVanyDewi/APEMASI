<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\BangunanBagi;
use App\Models\User;

class UpdateGeoBuildingsSeeder extends Seeder
{
    public function run()
    {
        $this->command->info('Mencari kandidat bangunan untuk "Bendung Arca"...');

        $candidates = BangunanBagi::where('nomenklatur_bagi', 'like', '%Bdg%')
            ->orWhere('nomenklatur_bagi', 'like', '%B. Bdg%')
            ->orWhere('lokasi', 'like', '%Danang%')
            ->orWhere('nomenklatur_bagi', 'like', '%Bendung%')
            ->get();

        if ($candidates->isEmpty()) {
            $this->command->error('Tidak menemukan kandidat bangunan untuk Bendung Arca.');
            return;
        }

        $this->command->info('Menemukan ' . $candidates->count() . ' kandidat, mencoba mencocokkan nama...');

        $found = null;
        foreach ($candidates as $c) {
            $norm = strtolower(str_replace([' ','.',"\t"], '', $c->nomenklatur_bagi . ' ' . $c->lokasi));
            if (strpos($norm, 'bendung') !== false || strpos($norm, 'bdg') !== false || strpos($norm, 'bdgacr') !== false || strpos($norm, 'b.bdg.acr') !== false) {
                $found = $c;
                break;
            }
        }

        if (! $found) {
            $found = $candidates->first();
            $this->command->warn('Tidak menemukan kecocokan pasti; menggunakan kandidat pertama: ' . $found->nomenklatur_bagi . ' (ID: ' . $found->id . ')');
        } else {
            $this->command->info('Cocok ditemukan: ' . $found->nomenklatur_bagi . ' (ID: ' . $found->id . ')');
        }

        $user = User::where('username', 'geo')->first();
        if (! $user) {
            $this->command->error('User "geo" tidak ditemukan.');
            return;
        }

        $user->building_ids = [$found->id];
        $user->save();

        $this->command->info('User geo berhasil di-update dengan building_id: ' . $found->id);
    }
}
