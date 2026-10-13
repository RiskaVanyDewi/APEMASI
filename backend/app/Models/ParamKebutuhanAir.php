<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ParamKebutuhanAir extends Model
{
    protected $table = 'param_kebutuhan_air';
    public $timestamps = false;

    protected $fillable = [
        'crop_type',
        'phase',
        'unit_lps_per_ha',
    ];
}
