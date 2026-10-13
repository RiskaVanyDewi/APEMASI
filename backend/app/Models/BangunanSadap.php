<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BangunanSadap extends Model
{
    protected $table = 'bangunan_sadap';

    protected $fillable = [
        'structure_id',
        'di_id',
        'canal_id',
        'nomenklatur_sadap',
        'hm',
        'lokasi',
        'side',
        'a_igt_ha',
        'apadi_ha',
        'fase_padi',
        'apalawija_ha',
        'fase_palawija',
        'atebu_ha',
        'fase_tebu',
        'aholtikultura_ha',
        'fase_holtikultura',
        'akolam_ha',
        'qpadi_ldt',
        'qpalawija_ldt',
        'qtebu_ldt',
        'qholtikultura_ldt',
        'qkolam_ldt',
        'qkebutuhan_ldt',
        'qtersedia_ldt',
        'order_no',
        'lat',
        'lng',
    ];

    public function bangunanBagi()
    {
        return $this->belongsTo(BangunanBagi::class, 'structure_id');
    }
}