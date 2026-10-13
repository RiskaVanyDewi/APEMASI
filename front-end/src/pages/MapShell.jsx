import { useMemo, useState, useEffect } from "react";
import Topbar from "../components/Topbar";
import MapView from "../components/MapView";
import { BUILDINGS } from "../lib/mockData";
import axiosClient from "../lib/axios";
import { Card, CardHeader, CardContent, Badge, Button } from "../components/ui";

// Helper to get full building data with coordinates
function getFullBuilding(b, allBuildings) {
  if (!b) return null;

  // If already has valid coords, use it
  if (b.lat != null && b.lng != null) return b;

  // Normalize search function
  const normalize = (str) => String(str || "").toLowerCase().replace(/\s+/g, "");
  const bCode = normalize(b.code);
  const bId = String(b.id || "");

  // 1. Try to find in allBuildings (API data has priority)
  for (let building of allBuildings) {
    const match = (
      building.id === b.id ||
      normalize(building.code) === bCode ||
      String(building.id || "") === bId
    );

    if (match && building.lat != null && building.lng != null) {
      return building;
    }
  }

  // 2. Fallback to BUILDINGS mock data
  for (let mock of BUILDINGS) {
    const match = (
      mock.id === b.id ||
      normalize(mock.code) === bCode ||
      String(mock.id || "") === bId
    );

    if (match && mock.lat != null && mock.lng != null) {
      return mock;
    }
  }

  // 3. Return original with whatever coords it has
  return b;
}

function readAll() {
  try {
    const raw = localStorage.getItem("apemasi_building_inputs");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** ===== USERS (petugas/pengelola) from AdminUsers ===== */
const LS_USERS = "apemasi_users";

function loadUsers() {
  try {
    const raw = localStorage.getItem(LS_USERS);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** HM parsing: "03+90" -> number comparable */
function hmToNumber(hm) {
  if (!hm) return NaN;
  const s = String(hm).trim();
  // accept "03+90" or "3+90" or "03+900" etc
  const parts = s.split("+");
  const a = Number(String(parts[0] ?? "").replace(/[^\d]/g, ""));
  const b = Number(String(parts[1] ?? "").replace(/[^\d]/g, ""));
  if (Number.isNaN(a) || Number.isNaN(b)) return NaN;
  // make comparable scale (a * 1000 + b)
  return a * 1000 + b;
}

function inHmRange(buildingHm, hmAwal, hmAkhir) {
  const bh = hmToNumber(buildingHm);
  const a = hmToNumber(hmAwal);
  const z = hmToNumber(hmAkhir);
  if ([bh, a, z].some((x) => Number.isNaN(x))) return false;

  // range could be reversed (start > end)
  const min = Math.min(a, z);
  const max = Math.max(a, z);
  return bh >= min && bh <= max;
}

function resolveAssignees({ building }) {
  const users = loadUsers();
  const bid = String(building?.id ?? "");
  const saluran = String(building?.saluran ?? "").toLowerCase();

  // 1) STRICT: by buildingIds
  const strictPetugas = users.filter(
    (u) => u?.type === "petugas" && Array.isArray(u?.buildingIds) && u.buildingIds.map(String).includes(bid)
  );
  const strictPengelola = users.filter(
    (u) => u?.type === "pengelola" && Array.isArray(u?.buildingIds) && u.buildingIds.map(String).includes(bid)
  );

  // 2) FALLBACK: by saluran + HM range
  const fallbackPetugas = users.filter((u) => {
    if (u?.type !== "petugas") return false;
    if (Array.isArray(u?.buildingIds) && u.buildingIds.length > 0) return false; // only fallback for unassigned petugas
    const sal = new Set((u?.saluran || []).map((x) => String(x).toLowerCase()));
    if (sal.size > 0 && saluran && !sal.has(saluran)) return false;

    const hasHm = (u?.hmAwal && u?.hmAkhir) ? true : false;
    return hasHm ? inHmRange(building?.hm, u.hmAwal, u.hmAkhir) : false;
  });

  const fallbackPengelola = users.filter((u) => {
    if (u?.type !== "pengelola") return false;
    if (Array.isArray(u?.buildingIds) && u.buildingIds.length > 0) return false; // only fallback for unassigned pengelola
    const sal = new Set((u?.saluran || []).map((x) => String(x).toLowerCase()));
    if (sal.size > 0 && saluran && !sal.has(saluran)) return false;

    const hasHm = (u?.hmAwal && u?.hmAkhir) ? true : false;
    return hasHm ? inHmRange(building?.hm, u.hmAwal, u.hmAkhir) : false;
  });

  const petugas = (strictPetugas.length ? strictPetugas : fallbackPetugas)
    .map((u) => u?.nama || u?.username)
    .filter(Boolean);

  const pengelola = (strictPengelola.length ? strictPengelola : fallbackPengelola)
    .map((u) => u?.nama || u?.username)
    .filter(Boolean);

  // de-dupe
  const uniq = (arr) => Array.from(new Set(arr.map(String)));
  return { petugas: uniq(petugas), pengelola: uniq(pengelola) };
}

function num(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return n;
}
function fmt(v) {
  return num(v).toFixed(3).replace(/\.000$/, "");
}
function clamp01(x) {
  const n = num(x);
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function getRecordFields(rec) {
  if (!rec?.data) return {};
  const d = rec.data;
  return {
    luasPadi: num(d.luasPadi),
    luasPalawija: num(d.luasPalawija),
    luasHorti: num(d.luasHorti),
    luasKolam: num(d.luasKolam),
    luasTebu: num(d.luasTebu),
    fasePadi: d.fasePadi || null,
    fasePalawija: d.fasePalawija || null,
    faseTebu: d.faseTebu || null,
    qPadi: num(d.hasil?.qPadi ?? d.qPadi),
    qPalawija: num(d.hasil?.qPalawija ?? d.qPalawija),
    qHorti: num(d.hasil?.qHorti ?? d.qHorti),
    qKolam: num(d.hasil?.qKolam ?? d.qKolam),
    qTebu: num(d.hasil?.qTebu ?? d.qTebu),
    hasil: d.hasil || null,
  };
}

function currentPeriodKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const p = date.getDate() <= 15 ? "P1" : "P2";
  return `${y}-${m}-${p}`;
}

function periodeLabelToPKey(label, year) {
  const map = {
    januari: "01",
    februari: "02",
    maret: "03",
    april: "04",
    mei: "05",
    juni: "06",
    juli: "07",
    agustus: "08",
    september: "09",
    oktober: "10",
    november: "11",
    desember: "12",
  };

  const s = String(label || "").trim().toLowerCase();
  const parts = s.split(/\s+/);
  const monthValue = map[parts[0]] || "01";
  const p = s.includes("periode 2") ? "P2" : "P1";
  return `${year}-${monthValue}-${p}`;
}

function parseRecordTimestamp(rec) {
  if (!rec) return 0;
  const candidate = rec.updated_at || rec.data?.updatedAt || rec.at || rec.updatedAt || rec.created_at || rec.createdAt;
  const d = candidate ? new Date(candidate) : null;
  return d && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
}

export default function MapShell() {
  const [selected, setSelected] = useState(null);
  const [buildings, setBuildings] = useState(BUILDINGS);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Trigger re-reads of localStorage

  // Fetch buildings from API with coordinates
  useEffect(() => {
    async function loadBuildings() {
      try {
        const [buildingsRes, recordsRes] = await Promise.all([
          axiosClient.get(`/buildings?di_id=2`),
          axiosClient.get(`/building-records?di_id=2`)
        ]);

        // Map buildings
        const buildingsData = (buildingsRes.data || []).map(b => {
          const lat = b.lat != null ? parseFloat(b.lat) : null;
          const lng = b.lng != null ? parseFloat(b.lng) : null;
          return {
            id: b.id,
            code: b.nomenklatur_bagi,
            name: b.nomenklatur_bagi,
            lokasi: b.lokasi,
            hm: b.hm,
            lat: !isNaN(lat) ? lat : null,
            lng: !isNaN(lng) ? lng : null,
            saluran: b.canal_id === 4 ? "Kanan" : b.canal_id === 5 ? "Kiri" : "",
            qTersedia: parseFloat(b.qtersedia_ldt) || 0,
            fotoUrl: null,
          };
        });

        const currentPKey = currentPeriodKey();
        const recordsMap = {};
        (recordsRes.data || []).forEach((rec) => {
          const bid = String(rec.building_id);
          const ts = parseRecordTimestamp(rec);

          // Hanya pakai record yang masih di periode saat ini
          if (rec.p_key && String(rec.p_key).trim() !== currentPKey) return;
          if (!rec.p_key && rec.periode) {
            const fallbackKey = periodeLabelToPKey(rec.periode, new Date().getFullYear());
            if (fallbackKey !== currentPKey) return;
          }

          const prev = recordsMap[bid];
          if (!prev || ts >= parseRecordTimestamp(prev)) {
            recordsMap[bid] = rec;
          }
        });

        // Create a map of API buildings for easy lookup
        const apiMap = new Map();
        buildingsData.forEach(b => {
          // Normalize for matching, handle nulls safely to prevent crash
          const codeSafe = (b.code || "").toString();
          const nameSafe = (b.name || "").toString();

          if (codeSafe.trim()) {
            const key1 = codeSafe.replace(/\s+/g, '').toLowerCase();
            apiMap.set(key1, b);
          }
          if (nameSafe.trim()) {
            const key2 = nameSafe.replace(/\s+/g, '').toLowerCase();
            apiMap.set(key2, b);
          }
          // ID should be string for consistent lookup
          apiMap.set(String(b.id), b);
        });

        // 1. Start with our solid MOCK DATA (105 items) - Ensures ALL markers appear
        const mergedFromMock = BUILDINGS.map(mockB => {
          // Try to find matching API data
          const codeSafe = (mockB.code || "").toString();
          const nameSafe = (mockB.name || "").toString();
          const key1 = codeSafe.replace(/\s+/g, '').toLowerCase();
          const key2 = nameSafe.replace(/\s+/g, '').toLowerCase();

          const apiB = apiMap.get(key1) || apiMap.get(key2) || apiMap.get(String(mockB.id));

          // If we found a match in API, use API's ID (for consistency with records) but Mock's Coordinates (priority)
          if (apiB) {
            // Remove from map so we don't duplicate later
            apiMap.delete(key1);
            apiMap.delete(key2);
            apiMap.delete(String(apiB.id));

            const rec = recordsMap[String(apiB.id)];
            let lat = mockB.lat; // Default to Mock which we know is valid
            let lng = mockB.lng;

            // If saved record exists, it overrides everything IF valid
            if (rec?.data?.koordinatLat) {
              const val = parseFloat(rec.data.koordinatLat);
              if (!isNaN(val)) lat = val;
            }
            if (rec?.data?.koordinatLng) {
              const val = parseFloat(rec.data.koordinatLng);
              if (!isNaN(val)) lng = val;
            }

            return {
              ...apiB, // Use API metadata (ID, etc)
              lat: lat,
              lng: lng,
              // Use saved record logic for other fields (map data.* into top-level so UI finds them)
              fotoUrl: rec?.data?.fotoUrl || null,
              totalArea: rec?.data?.totalArea ?? apiB.qTersedia,
              sumQ: rec?.data?.hasil?.sumQ ?? rec?.data?.sumQ ?? 0,
              qTersedia: rec?.data?.qTersedia ?? apiB.qTersedia ?? 0,
              faktorK: rec?.data?.faktorK ?? 0,
              ...getRecordFields(rec),
            };
          } else {
            // No API match, just use Mock data as-is (at least it shows on map)
            return {
              ...mockB,
              // Ensure numeric fields exist
              qTersedia: 0,
              sumQ: 0,
              fotoUrl: null,
              // Ensure lat/lng are numbers (mock data should be numbers, but just in case)
              lat: typeof mockB.lat === 'number' ? mockB.lat : parseFloat(mockB.lat) || null,
              lng: typeof mockB.lng === 'number' ? mockB.lng : parseFloat(mockB.lng) || null,
            };
          }
        });

        // 2. Add any remaining API items that didn't match Mock data
        // (Convert map values to array and deduplicate)
        const remainingApi = Array.from(new Set(apiMap.values())).map(b => {
          const rec = recordsMap[String(b.id)];
          // Validate coords
          let lat = parseFloat(b.lat);
          if (isNaN(lat)) lat = null;
          let lng = parseFloat(b.lng);
          if (isNaN(lng)) lng = null;

          // Override with saved record if exists
          if (rec?.data?.koordinatLat) {
            const val = parseFloat(rec.data.koordinatLat);
            if (!isNaN(val)) lat = val;
          }
          if (rec?.data?.koordinatLng) {
            const val = parseFloat(rec.data.koordinatLng);
            if (!isNaN(val)) lng = val;
          }

          return {
            ...b,
            lat,
            lng,
            fotoUrl: rec?.data?.fotoUrl || null,
            totalArea: rec?.data?.totalArea ?? b.qTersedia,
            sumQ: rec?.data?.hasil?.sumQ ?? rec?.data?.sumQ ?? 0,
            qTersedia: rec?.data?.qTersedia ?? b.qTersedia ?? 0,
            faktorK: rec?.data?.faktorK ?? 0,
            ...getRecordFields(rec),
          }
        });

        const finalData = [...mergedFromMock, ...remainingApi];

        setBuildings(finalData.length ? finalData : BUILDINGS);
      } catch (err) {
        console.error("Failed to load buildings:", err);
        setBuildings(BUILDINGS);
      }
    }
    loadBuildings();
  }, []);

  // ✅ Listen for localStorage changes (from BuildingDetail auto-save)
  useEffect(() => {
    const handleStorageChange = () => {
      setRefreshTrigger(prev => prev + 1);
    };

    // Listen for storage events from other tabs
    window.addEventListener("storage", handleStorageChange);

    // Also check localStorage periodically for same-tab changes (every 1.5 sec)
    const interval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 1500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const currentPKey = currentPeriodKey();
  const savedAll = useMemo(() => {
    const all = readAll();
    const filtered = {};
    Object.entries(all || {}).forEach(([buildingId, state]) => {
      if (!state) return;
      const key = state.periodKey || (state.periode ? periodeLabelToPKey(state.periode, new Date().getFullYear()) : null);
      if (String(key) === currentPKey) {
        filtered[buildingId] = state;
      }
    });
    return filtered;
  }, [refreshTrigger, currentPKey]);

  const saved = selected ? savedAll[selected.id] : null;
  const sumQ = saved?.hasil?.sumQ ?? saved?.sumQ ?? 0;
  const qTersedia = saved?.qTersedia ?? selected?.qTersedia ?? 0;
  const faktorKRaw = num(sumQ) > 0 ? num(qTersedia) / num(sumQ) : 0;
  const faktorK = clamp01(faktorKRaw); // ✅ maks 1

  // ✅ petugas/pengelola for public (from AdminUsers)
  const assignees = useMemo(() => {
    if (!selected) return { petugas: [], pengelola: [] };
    return resolveAssignees({ building: selected });
  }, [selected]);

  const filteredBuildings = useMemo(() => {
    const s = searchQuery.trim().toLowerCase();
    if (!s) return buildings;
    return buildings.filter(b =>
      (b.code || "").toLowerCase().includes(s) ||
      (b.name || "").toLowerCase().includes(s) ||
      (b.lokasi || "").toLowerCase().includes(s)
    );
  }, [searchQuery, buildings]);

  return (
    // ✅ FIX: pakai flex column, bukan calc height
    <div className="h-screen w-screen overflow-hidden bg-slate-100 flex flex-col">
      <div className="shrink-0 relative z-[1000]">
        <Topbar
          onPick={(b) => {
            const fullBuilding = getFullBuilding(b, buildings);
            setSelected(fullBuilding);
            setSearchQuery(""); // Clear search on pick
          }}
          buildings={buildings}
          q={searchQuery}
          setQ={setSearchQuery}
        />
      </div>

      {/* ✅ FIX: map ngisi sisa layar, anti kepotong */}
      <div className="relative flex-1 min-h-0 w-full">
        <MapView buildings={filteredBuildings} selected={selected} onSelectBuilding={(b) => setSelected(b)} />

        {selected && (
          <div className="absolute left-3 top-3 z-[999] w-[420px] max-w-[92vw]">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-extrabold">{selected.code}</div>
                    <div className="text-xs text-slate-500">{selected.name}</div>
                  </div>
                  <Badge tone="info">Public</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 text-sm">
                {/* foto + identitas */}
                <div className={selected.fotoUrl ? "grid gap-3 grid-cols-[96px_1fr]" : "block"}>
                  {selected.fotoUrl && (
                    <div className="h-24 w-24 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      <img
                        src={selected.fotoUrl}
                        alt="foto lokasi"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="text-xs text-slate-500">Lokasi</div>
                    <div className="font-semibold">{selected.lokasi}</div>

                    <div className="text-xs text-slate-500 mt-2">Koordinat</div>
                    <div className="text-sm">
                      {selected.lat}, {selected.lng}
                    </div>

                    <div className="text-xs text-slate-500 mt-2">Petugas & Pengelola</div>
                    <div className="text-sm">
                      Petugas:{" "}
                      <b>{assignees.petugas.length ? assignees.petugas.join(", ") : "-"}</b>
                    </div>
                    <div className="text-sm">
                      Pengelola:{" "}
                      <b>{assignees.pengelola.length ? assignees.pengelola.join(", ") : "-"}</b>
                    </div>
                  </div>
                </div>

                {/* Areal layanan */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-700">
                    Informasi areal layanan (Ha)
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <Row label="Padi" value={`${fmt(saved?.data?.luasPadi ?? selected?.luasPadi ?? 0)} Ha`} />

<Row label="Palawija" value={`${fmt(saved?.data?.luasPalawija ?? selected?.luasPalawija ?? 0)} Ha`} />

<Row label="Tebu" value={`${fmt(saved?.data?.luasTebu ?? selected?.luasTebu ?? 0)} Ha`} />

<Row label="Hortikultura" value={`${fmt(saved?.data?.luasHorti ?? selected?.luasHorti ?? 0)} Ha`} />

<Row label="Kolam" value={`${fmt(saved?.data?.luasKolam ?? selected?.luasKolam ?? 0)} Ha`} />
                    <Row
                      label="TOTAL"
                      value={`${fmt(
    Number(saved?.data?.luasPadi ?? selected?.luasPadi ?? 0) +
    Number(saved?.data?.luasPalawija ?? selected?.luasPalawija ?? 0) +
    Number(saved?.data?.luasHorti ?? selected?.luasHorti ?? 0) +
    Number(saved?.data?.luasKolam ?? selected?.luasKolam ?? 0) +
    Number(saved?.data?.luasTebu ?? selected?.luasTebu ?? 0)
)} Ha`}
                      strong
                    />
                  </div>
                </div>

                {/* Debit rencana */}
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="text-xs font-semibold text-slate-700">
                    Informasi debit rencana
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <Row
 label="Debit dibutuhkan (ΣQ)"
 value={`${fmt(saved?.data?.sumQ ?? selected?.sumQ ?? 0)} lt/dt`}
/>

<Row
 label="Debit ketersediaan"
 value={`${fmt(saved?.data?.qTersedia ?? selected?.qTersedia ?? 0)} lt/dt`}
/>

<Row
 label="Faktor K"
 value={`${fmt(saved?.data?.faktorK ?? selected?.faktorK ?? 0)}`}
 strong
/>
                    <Row
                      label="Status"
                      value={faktorK >= 1 ? "CUKUP" : "KURANG"}
                      strong={faktorK < 1}
                    />
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    Faktor K = ketersediaan / kebutuhan (maks 1)
                  </div>
                </div>

                <Button variant="secondary" className="w-full" onClick={() => setSelected(null)}>
                  Tutup
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
      <div className="text-slate-600">{label}</div>
      <div className={strong ? "font-extrabold text-slate-900" : "font-semibold text-slate-900"}>
        {value}
      </div>
    </div>
  );
}