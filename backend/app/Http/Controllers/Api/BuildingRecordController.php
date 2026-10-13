<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\BuildingRecord;

class BuildingRecordController extends Controller
{
    public function store(Request $request)
    {
        // Validasi input
        $validated = $request->validate([
            'building_id' => 'required',
            'periode' => 'required',
            'p_key' => 'required',
            'data' => 'required|array', // JSON blob
        ]);

        $user = $request->user();

        // Update or Create based on building_id + p_key + side (optional)
        // Disini kita simpan setiap submit sebagai record baru (history) 
        // ATAU update record existing untuk periode tsb.
        // Sesuai req frontend: history snapshot disimpan terpisah.
        // Kita simpan record baru setiap "Hitung & Simpan".

        $record = BuildingRecord::create([
            'building_id' => $validated['building_id'],
            'side' => $request->input('side'), // optional
            'user_id' => $user->id,
            'periode' => $validated['periode'],
            'p_key' => $validated['p_key'],
            'data' => $validated['data'],
        ]);

        return response()->json([
            'message' => 'Data saved successfully',
            'record' => $record
        ]);
    }

    // Get latest record for a building (for initial load)
    public function show(Request $request, $buildingId)
    {
        $side = $request->query('side'); // optional filter by side

        $query = BuildingRecord::where('building_id', $buildingId);
        
        if ($side) {
            $query->where('side', $side);
        }

        // Ambil yang paling baru dibuat
        $record = $query->latest()->first();

        if (!$record) {
            return response()->json(null);
        }

        return response()->json($record);
    }
    
    // List history for a building OR for an entire DI
    public function index(Request $request)
    {
        $buildingId = $request->query('building_id');
        $diId = $request->query('di_id');

        $query = BuildingRecord::query();

        if ($buildingId) {
            $query->where('building_id', $buildingId);
        }

        if ($diId) {
            // Join dengan bangunan_bagi untuk filter by DI
            $query->whereHas('building', function($q) use ($diId) {
                // di_id di model BangunanBagi
                $q->where('di_id', $diId);
            });
        }

        if (!$buildingId && !$diId) {
            return response()->json([]);
        }

        $records = $query->with('user:id,name')
            ->latest()
            ->limit($buildingId ? 20 : 500) // Kalau DI, ambil lebih banyak data rekap
            ->get();
            
        return response()->json($records);
    }
}
