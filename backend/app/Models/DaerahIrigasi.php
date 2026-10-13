<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DaerahIrigasi extends Model
{
    protected $table = 'daerah_irigasi';

    protected $fillable = ['code', 'name'];

    public function bangunanBagi()
    {
        return $this->hasMany(BangunanBagi::class, 'di_id');
    }

    public function saluran()
    {
        return $this->hasMany(Saluran::class, 'di_id');
    }

    public function users()
    {
        return $this->hasMany(User::class, 'di_id');
    }
}