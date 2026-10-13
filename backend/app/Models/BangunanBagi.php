<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BangunanBagi extends Model
{
    protected $table = 'bangunan_bagi';
    
    protected $fillable = [
        'di_id', 
        'canal_id', 
        'nomenklatur_bagi', 
        'hm', 
        'lokasi', 
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
        'lng'
    ];

    public function sadap()
    {
        return $this->hasMany(BangunanSadap::class, 'structure_id');
    }

    public function daerahIrigasi()
    {
        return $this->belongsTo(DaerahIrigasi::class, 'di_id');
    }

    public function saluran()
    {
        return $this->belongsTo(Saluran::class, 'canal_id');
    }
}