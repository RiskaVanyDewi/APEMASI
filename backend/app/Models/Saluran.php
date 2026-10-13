<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Saluran extends Model
{
    protected $table = 'saluran';

    protected $fillable = ['di_id', 'name'];

    public function daerahIrigasi()
    {
        return $this->belongsTo(DaerahIrigasi::class, 'di_id');
    }

    public function bangunanBagi()
    {
        return $this->hasMany(BangunanBagi::class, 'canal_id');
    }
}