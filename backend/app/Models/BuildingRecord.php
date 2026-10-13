<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BuildingRecord extends Model
{
    protected $fillable = [
        'building_id', 'side', 'user_id', 'periode', 'p_key', 'data'
    ];

    protected $casts = [
        'data' => 'array', // otomatis serialize/unserialize JSON
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function building()
    {
        return $this->belongsTo(BangunanBagi::class, 'building_id');
    }
}
