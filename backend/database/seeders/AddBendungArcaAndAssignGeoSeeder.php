<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\BangunanBagi;
use App\Models\User;

class AddBendungArcaAndAssignGeoSeeder extends Seeder
{
    public function run()
    {
        $this->command->info('Mencari/membuat bangunan B.Bdg.Acr (Bendung Arca)...');

        $building = BangunanBagi::where('nomenklatur_bagi', 'like', '%B.Bdg.Acr%')
            ->orWhere('nomenklatur_bagi', 'like', '%Bendung Arca%')
            ->orWhere('lokasi', 'like', '%Danang%')
            ->first();

        if (! $building) {
            $this->command->warn('Tidak ditemukan, membuat entri baru B.Bdg.Acr');

            $building = BangunanBagi::create([
                'di_id' => 2,
                'canal_id' => 4,
                'order_no' => 0,
                'nomenklatur_bagi' => 'B.Bdg.Acr',
                'hm' => '0+00',
                'lokasi' => 'Danang',
                'lat' => -7.4126467,
                'lng' => 109.2653467,
                'apadi_ha' => 0,
            ]);

            $this->command->info('Dibuat bangunan: ID ' . $building->id);
        } else {
            $this->command->info('Sudah ada: ' . $building->nomenklatur_bagi . ' (ID: ' . $building->id . ')');
        }

        $user = User::where('username', 'geo')->first();
        if (! $user) {
            $this->command->error('User "geo" tidak ditemukan.');
            return;
        }

        $user->building_ids = [$building->id];
        $user->save();

        $this->command->info('User geo berhasil di-update dengan building_id: ' . $building->id);
    }
}
