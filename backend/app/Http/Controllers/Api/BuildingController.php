<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BangunanBagi;
use App\Models\BangunanSadap;
use Illuminate\Http\Request;

class BuildingController extends Controller
{
    // GET /api/buildings
    public function index(Request $request)
    {
        $diId = $request->query('di_id', 15); // default 15 for Arca

        $rows = BangunanBagi::select(
            'id', 'di_id', 'canal_id', 'order_no', 'nomenklatur_bagi', 'hm', 'lokasi',
            'lat', 'lng',
            'apadi_ha', 'apalawija_ha', 'atebu_ha', 'aholtikultura_ha', 'akolam_ha',
            'fase_padi', 'fase_palawija', 'fase_tebu', 'fase_holtikultura',
            'qpadi_ldt', 'qpalawija_ldt', 'qtebu_ldt', 'qholtikultura_ldt', 'qkolam_ldt',
            'qtersedia_ldt'
        )
            ->where('di_id', $diId)
            ->orderBy('canal_id')
            ->orderBy('order_no')
            ->get();

        $unique = [];
        foreach ($rows as $row) {
            if (!isset($unique[$row->nomenklatur_bagi])) {
                $unique[$row->nomenklatur_bagi] = $row;
            }
        }

        return response()->json(array_values($unique));
    }

    // GET /api/buildings/{id}
    public function show($id)
    {
        $building = BangunanBagi::select(
            'id', 'di_id', 'canal_id', 'order_no', 'nomenklatur_bagi', 'hm', 'lokasi',
            'lat', 'lng',
            'a_igt_ha', 'apadi_ha', 'apalawija_ha', 'atebu_ha', 'aholtikultura_ha', 'akolam_ha',
            'fase_padi', 'fase_palawija', 'fase_tebu', 'fase_holtikultura',
            'qkebutuhan_ldt', 'qpadi_ldt', 'qpalawija_ldt', 'qtebu_ldt', 'qholtikultura_ldt', 'qkolam_ldt',
            'qtersedia_ldt'
        )
            ->where('id', $id)
            ->first();

        if (!$building) {
            return response()->json(['message' => 'Building not found'], 404);
        }

        return response()->json($building);
    }
}