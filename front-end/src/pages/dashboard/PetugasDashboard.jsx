import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, Badge, Button } from "../../components/ui";
import { getAuth } from "../../lib/auth";
import axiosClient from "../../lib/axios";
import { useNavigate } from "react-router-dom";

function num(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return n;
}
function fmt(v) {
  return num(v).toFixed(3).replace(/\.000$/, "");
}

function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatDateID(input) {
  if (!input) return "-";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
function formatTime24(input) {
  if (!input) return "-";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "-";
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${min}`;
}
function formatDateTimeID(input) {
  if (!input) return "-";
  return `${formatDateID(input)} ${formatTime24(input)}`;
}

function periodKeyFromDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const p = date.getDate() <= 15 ? "P1" : "P2";
  return `${y}-${m}-${p}`;
}

function parsePeriodeLabel(label) {
  if (!label) return null;
  const map = {
    januari: 1,
    februari: 2,
    maret: 3,
    april: 4,
    mei: 5,
    juni: 6,
    juli: 7,
    agustus: 8,
    september: 9,
    oktober: 10,
    november: 11,
    desember: 12,
  };

  const s = String(label).trim().toLowerCase();
  const parts = s.split(/\s+/);
  const month = map[parts[0]];
  if (!month) return null;
  const p = s.includes("periode 2") ? "P2" : "P1";
  return { month, p };
}

function safeDateFromRecord(rec) {
  const candidate = rec?.updated_at || rec?.created_at || rec?.data?.updatedAt || rec?.createdAt || rec?.updatedAt || rec?.at;
  const d = candidate ? new Date(candidate) : null;
  if (d && !Number.isNaN(d.getTime())) return d;
  return null;
}

function getRecordYear(rec, fallbackYear) {
  const d = safeDateFromRecord(rec);
  if (d) return d.getFullYear();
  return fallbackYear;
}

function getRecordPeriodKey(rec) {
  if (!rec) return null;
  if (rec.p_key && /^\d{4}-\d{2}-P[12]$/.test(rec.p_key)) {
    return String(rec.p_key);
  }

  if (rec.periode) {
    const parsed = parsePeriodeLabel(rec.periode);
    if (parsed) {
      const year = getRecordYear(rec, new Date().getFullYear());
      return `${year}-${String(parsed.month).padStart(2, "0")}-${parsed.p}`;
    }
  }

  const date = safeDateFromRecord(rec);
  if (date) return periodKeyFromDate(date);

  return periodKeyFromDate(new Date());
}

export default function PetugasDashboard() {
  const nav = useNavigate();
  const [auth, setInternalAuth] = useState(getAuth());
  const [buildings, setBuildings] = useState([]);
  const [apiEvents, setApiEvents] = useState([]);
  const [scope, setScope] = useState("semua");

  // Fetch data from API
  useEffect(() => {
    async function loadData() {
      try {
        const diId = auth?.di_id || 2;
        const [resBuildings, resRecords] = await Promise.all([
          axiosClient.get(`/buildings?di_id=${diId}`),
          axiosClient.get(`/building-records?di_id=${diId}`)
        ]);

        const currentPKey = periodKeyFromDate(new Date());

        // Filter by records created by this user and current period only
        const myRecords = (resRecords.data || [])
          .filter((r) => String(r.user_id) === String(auth?.id))
          .filter((r) => getRecordPeriodKey(r) === currentPKey);

        // Keep only one latest record per building, so history tidak muncul semua duplikat
        const latestByBuilding = new Map();
        const ordered = myRecords.slice().sort((a, b) => {
          const da = new Date(a.updated_at || a.created_at || a.data?.updatedAt || 0).getTime();
          const db = new Date(b.updated_at || b.created_at || b.data?.updatedAt || 0).getTime();
          return db - da;
        });
        ordered.forEach((r) => {
          const bid = String(r.building_id);
          if (!latestByBuilding.has(bid)) latestByBuilding.set(bid, r);
        });
        const uniqueRecords = Array.from(latestByBuilding.values());

        // Logic: Show buildings that are either assigned OR recorded by this user
        const assignedIds = Array.isArray(auth?.building_ids) ? auth.building_ids.map(String) : [];
        const recordedIds = new Set(uniqueRecords.map((r) => String(r.building_id)));
        const unionIds = new Set([...assignedIds, ...recordedIds]);

        const filteredBuildings = (resBuildings.data || []).filter((b) =>
          unionIds.has(String(b.id))
        );

        setBuildings(filteredBuildings);
        setApiEvents(uniqueRecords);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    }

    loadData();

    // Re-load when auth is updated elsewhere
    const onAuthUpdated = () => {
      const refreshed = getAuth();
      setInternalAuth(refreshed);
    };
    window.addEventListener('authUpdated', onAuthUpdated);
    return () => window.removeEventListener('authUpdated', onAuthUpdated);
  }, [auth?.di_id, auth?.building_ids, auth?.id]);

  const enriched = useMemo(() => {
    const byId = new Map(buildings.map((b) => [String(b.id), b]));

    return apiEvents
      .map((x) => {
        const b = byId.get(String(x.building_id));
        const canalId = b?.canal_id;
        const saluran = canalId === 4 ? "kanan" : canalId === 5 ? "kiri" : "";

        // Extract data from the JSON blob AND from building table
        const d = x.data || {};

        // Total Area: dari saved input ATAU dari a_igt_ha di building table
        const totalArea = num(d.totalArea ?? b?.a_igt_ha ?? 0);

        // Debit Kebutuhan: dari saved hasil ATAU dari qkebutuhan_ldt di building table
        const sumQ = num(d.hasil?.sumQ ?? d.sumQ ?? b?.qkebutuhan_ldt ?? 0);

        // Debit Tersedia: dari saved data ATAU dari qtersedia_ldt di building table
        const qTersedia = num(d.qTersedia ?? b?.qtersedia_ldt ?? 0);

        const faktorK = sumQ > 0 ? qTersedia / sumQ : 0;

        return {
          ...x,
          buildingId: x.building_id,
          totalArea,
          sumQ,
          qTersedia,
          _saluran: saluran,
          _lokasi: b?.lokasi ?? "-",
          _code: b?.nomenklatur_bagi ?? "-",
          _hm: b?.hm ?? "",
          _updatedAt: new Date(x.updated_at || x.created_at).getTime(),
          _faktorK: faktorK
        };
      })
      .filter((x) => {
        if (scope === "semua") return true;
        return x._saluran === scope;
      })
      .sort((a, b) => b._updatedAt - a._updatedAt);
  }, [apiEvents, buildings, scope]);

  const now = Date.now();
  const today0 = startOfDay(now);
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  // 1. Total Bangunan yang ditugaskan admin
  const totalAssigned = buildings.length;

  // 2. Berapa banyak bangunan unik yang sudah pernah diinput/disimpan (progres)
  const uniqueBuildingsWithInput = new Set(apiEvents.map(ev => String(ev.building_id))).size;

  const totalInputCount = enriched.length;
  const inputHariIni = enriched.filter((x) => x._updatedAt >= today0).length;
  const input7Hari = enriched.filter((x) => x._updatedAt >= weekAgo).length;

  const lastUpdatedAt = enriched[0]?._updatedAt || 0;
  const lastUpdatedLabel = lastUpdatedAt ? formatDateTimeID(lastUpdatedAt) : "-";

  const [activeView, setActiveView] = useState(null); // 'assigned' | 'input' | null

  const viewData = useMemo(() => {
    if (activeView === 'assigned') {
      return buildings;
    }
    if (activeView === 'input') {
      // Get unique buildings that have inputs
      const inputIds = new Set(apiEvents.map(ev => String(ev.building_id)));
      return buildings.filter(b => inputIds.has(String(b.id)));
    }
    return [];
  }, [activeView, buildings, apiEvents]);

  return (
    <div className="space-y-4">
      {/* Welcome Header */}
      <div className="mb-6 text-center sm:text-left">
        <h1 className="text-2xl font-extrabold text-slate-900">Selamat Datang, {auth?.username || 'Petugas'}</h1>
        <p className="text-sm text-slate-600">
          Anda sedang memantau <span className="font-bold text-blue-700">{auth?.di_name || "Daerah Irigasi"}</span>
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="space-y-4 border-b border-slate-100/60">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
              <div className="text-sm font-bold text-slate-700">Status Pekerjaan</div>
            </div>

            <div className="sm:ml-auto">
              <Button variant="secondary" className="w-full sm:w-auto" onClick={() => nav("/")}>
                Ke Peta Public
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 pt-6">
          <Stat
            title="Total Bangunan Tugas"
            value={totalAssigned}
            sub="Klik untuk lihat daftar"
            color="indigo"
            active={activeView === 'assigned'}
            onClick={() => setActiveView(activeView === 'assigned' ? null : 'assigned')}
          />
          <Stat
            title="Bangunan Diinput"
            value={uniqueBuildingsWithInput}
            sub="Klik untuk lihat progress"
            color="blue"
            active={activeView === 'input'}
            onClick={() => setActiveView(activeView === 'input' ? null : 'input')}
          />
          <Stat
            title="Update Hari Ini"
            value={inputHariIni}
            sub="Laporan hari ini"
            color="emerald"
          />
          <Stat
            title="Update 7 Hari"
            value={input7Hari}
            sub="Ritme pekerjaan"
            color="amber"
          />
        </CardContent>
      </Card>

      {/* Detail List View for Selected Stat */}
      {activeView && (
        <Card className="border-blue-200 bg-blue-50/10 shadow-md animate-in fade-in slide-in-from-top-4 duration-300">
          <CardHeader className="flex flex-row items-center justify-between border-b border-blue-100/50 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {activeView === 'assigned' ? 'Daftar Semua Bangunan Tugas' : 'Daftar Bangunan Sudah Diinput'}
              </h2>
              <p className="text-xs text-slate-500">
                Total: <span className="font-bold text-blue-700">{viewData.length}</span> bangunan
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActiveView(null)}>Tutup</Button>
          </CardHeader>
          <CardContent className="p-0">
            {viewData.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500 italic">
                Belum ada data untuk ditampilkan.
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto overflow-x-hidden p-2">
                <div className="grid gap-2">
                  {viewData.map(b => (
                    <button
                      key={b.id}
                      onClick={() => nav(`/petugas/bangunan/${b.id}`)}
                      className="flex w-full items-center gap-4 rounded-xl border border-white bg-white p-3 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md active:scale-[0.98]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold text-xs">
                        {b.nomenklatur_bagi?.substring(0, 3) || 'B'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-slate-900">{b.nomenklatur_bagi}</div>
                        <div className="truncate text-xs text-slate-500">{b.lokasi}</div>
                      </div>
                      <div className="text-[10px] font-bold text-slate-400">HM {b.hm}</div>
                      <div className="h-6 w-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-500">
                        →
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-4 pt-4">
        <div className="space-y-1">
          <div className="text-base font-extrabold tracking-tight text-slate-900">
            Input Terbaru
          </div>
          <div className="text-sm text-slate-600 leading-relaxed">
            Klik untuk lanjut edit / hitung ulang.
          </div>
        </div>

        {enriched.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 italic">
            Belum ada riwayat input. Mulai dengan memilih bangunan di sidebar atau daftar tugas.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {enriched.slice(0, 8).map((x) => (
              <button
                key={x.buildingId}
                onClick={() => nav(`/petugas/bangunan/${x.buildingId}`)}
                className="group relative flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md hover:ring-2 hover:ring-blue-100"
              >
                <div className="flex w-full items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="text-lg font-extrabold tracking-tight text-slate-900 group-hover:text-blue-700">
                      {x._code}
                    </div>
                    <div className="text-sm font-medium text-slate-700">{x._lokasi}</div>
                    <div className="text-xs text-slate-500">
                      Saluran <span className="font-semibold text-slate-700">{x._saluran || "-"}</span>
                    </div>
                  </div>
                  <Badge tone="ok" className="shrink-0">
                    Updated
                  </Badge>
                </div>

                <div className="grid w-full grid-cols-2 gap-3">
                  <Mini label="Total Area" value={`${fmt(x.totalArea)} Ha`} />
                  <Mini label="Debit Kebutuhan" value={`${fmt(x.sumQ)} lt/dt`} />
                  <Mini label="Debit Tersedia" value={`${fmt(x.qTersedia)} lt/dt`} />
                  <Mini label="Faktor K" value={`${fmt(x._faktorK)}`} />
                </div>

                <div className="mt-auto w-full border-t border-slate-100 pt-3 text-xs text-slate-400">
                  Terakhir update:{" "}
                  <span className="font-semibold text-slate-600">
                    {x._updatedAt ? formatDateTimeID(x._updatedAt) : "-"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full border px-4 py-2 text-sm font-extrabold transition",
        "min-h-[40px]",
        active
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Stat({ title, value, sub, color = "blue", active = false, onClick }) {
  const colors = {
    blue: active ? "border-blue-300 bg-blue-100/50 shadow-inner ring-2 ring-blue-100" : "border-blue-100 bg-blue-50/30 text-blue-700",
    indigo: active ? "border-indigo-300 bg-indigo-100/50 shadow-inner ring-2 ring-indigo-100" : "border-indigo-100 bg-indigo-50/30 text-indigo-700",
    emerald: active ? "border-emerald-300 bg-emerald-100/50 shadow-inner ring-2 ring-emerald-100" : "border-emerald-100 bg-emerald-50/30 text-emerald-700",
    amber: active ? "border-amber-300 bg-amber-100/50 shadow-inner ring-2 ring-amber-100" : "border-amber-100 bg-amber-50/30 text-amber-700",
  };

  const textColors = {
    blue: "text-blue-700",
    indigo: "text-indigo-700",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
  };

  const isClickable = !!onClick;

  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      className={`relative flex flex-col items-start rounded-2xl border p-5 transition-all text-left w-full ${isClickable ? 'hover:shadow-md active:scale-[0.97]' : ''} ${colors[color] || colors.blue}`}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider opacity-60">{title}</div>
      <div className={`mt-1 text-4xl font-black tracking-tight ${textColors[color] || textColors.blue}`}>{value}</div>
      <div className="mt-2 text-[10px] font-medium leading-relaxed opacity-80">{sub}</div>
      {active && (
        <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-current"></div>
      )}
    </button>
  );
}

function Mini({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold text-slate-600">{label}</div>
      <div className="mt-2 text-base font-extrabold tracking-tight text-slate-900">{value}</div>
    </div>
  );
}