import { useMemo, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { PARAM_DEFAULT, BUILDINGS } from "../../lib/mockData";
import { Card, CardHeader, CardContent, Button, Input, Select, Badge } from "../../components/ui";
import axiosClient from "../../lib/axios";

// Helper numbers
function num(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return n;
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function format3(v) {
  const n = num(v);
  return n.toFixed(3);
}

function periodOptions() {
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  const out = [];
  for (const m of months) {
    out.push(`${m} Periode 1`);
    out.push(`${m} Periode 2`);
  }
  return out;
}

/** ✅ penting: ubah label "Maret Periode 2" => YYYY-03-P2 */
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
  // format: "maret periode 2"
  const parts = s.split(/\s+/);
  const monthName = parts[0] || "";
  const month = map[monthName] || "01";

  const p = s.includes("periode 2") ? "P2" : "P1";
  return `${year}-${month}-${p}`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function BuildingDetail() {
  const { id } = useParams();

  const [saved, setSaved] = useState(null);
  const [building, setBuilding] = useState(null);
  const [loading, setLoading] = useState(true);

  const b = building; // Define early for use in state initializers

  // Move mockB lookup above useEffect to avoid ReferenceError
  const mockB = useMemo(() => BUILDINGS.find(x => String(x.id) === String(id)), [id]);

  // Load building from API
  useEffect(() => {
    if (!id) return;
    setLoading(true);

    async function fetchData() {
      try {
        // Use allSettled to prevent one failure from blocking everything
        const results = await Promise.allSettled([
          axiosClient.get(`/buildings/${id}`),
          axiosClient.get(`/building-records/${id}`)
        ]);

        const bRes = results[0];
        const rRes = results[1];

        let bData = null;
        if (bRes.status === "fulfilled") {
          bData = bRes.value.data;
          console.log("Building data from API:", bData);
        } else {
          console.warn("Building API failed, using mock fallback:", bRes.reason);
          bData = mockB;
        }

        // If even API returned success but empty data, use mock
        if (!bData) bData = mockB;

        if (bData) {
          bData.code = bData.code || bData.nomenklatur_bagi || (mockB ? mockB.code : "");
        }
        setBuilding(bData);

        if (rRes.status === "fulfilled") {
          console.log("Record data from API:", rRes.value.data);
          setSaved(rRes.value.data || null);
        } else {
          console.warn("Record API failed or empty:", rRes.reason);
          setSaved(null);
        }
      } catch (err) {
        console.error("Gagal load data:", err);
        setBuilding(mockB);
        setSaved(null);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, mockB]);

  // Calculate derived values safely
  const sadapCount = building ? num(building.sadapCount ?? saved?.sadapCount ?? 1) : 1;
  const isDoubleSadap = sadapCount === 2;

  // ===== state =====
  const [periode, setPeriode] = useState("Januari Periode 1");
  const [fotoUrl, setFotoUrl] = useState("");
  const [totalArea, setTotalArea] = useState(10);

  // Update state when saved data loaded
  useEffect(() => {
    if (saved) {
      setPeriode(saved.periode || "Januari Periode 1");
      setFotoUrl(saved.fotoUrl || "");
      setTotalArea(saved.totalArea ?? 10);
      setFasePadi(saved.fasePadi || "pengolahan");
      setLuasPadi(saved.luasPadi ?? 6);
      setJenisPalawija(saved.jenisPalawija || "palawija_sedikit");
      setFasePalawija(saved.fasePalawija || "pengolahan");
      setLuasPalawija(saved.luasPalawija ?? 0);
      setLuasHorti(saved.luasHorti ?? 0);
      setLuasKolam(saved.luasKolam ?? 0);
      setFaseTebu(saved.faseTebu || "pengolahan");
      setLuasTebu(saved.luasTebu ?? 0);
      setFaktorTersier(saved.faktorTersier ?? 1.25);

      const loss = saved.kehilanganAirPct !== undefined
        ? String(saved.kehilanganAirPct)
        : (saved.kehilanganAir !== undefined ? String(saved.kehilanganAir * 100) : "");
      setKehilanganAirPct(loss);

      setQTersedia(saved.qTersedia ?? (b?.qtersedia_ldt ?? 0));
      setSadapKanan(saved.sadapKanan ?? true);
      setSadapKiri(saved.sadapKiri ?? true);
      setHasil(saved.hasil || null);

      // Per-posisi
      setLebarPintuKanan(saved.lebarPintuKanan ?? "");
      setElevasiKanan(saved.elevasiKanan ?? "");
      setKoefLossKanan(saved.koefLossKanan ?? "");
      setLebarPintuKiri(saved.lebarPintuKiri ?? "");
      setElevasiKiri(saved.elevasiKiri ?? "");
      setKoefLossKiri(saved.koefLossKiri ?? "");

      // Koordinat
      setKoordinatLat(saved.koordinatLat ?? "");
      setKoordinatLng(saved.koordinatLng ?? "");
    }
  }, [saved, building]);

  // Padi
  const [fasePadi, setFasePadi] = useState(saved?.fasePadi || "pengolahan");
  const [luasPadi, setLuasPadi] = useState(saved?.luasPadi ?? 6);

  // Palawija
  const [jenisPalawija, setJenisPalawija] = useState(saved?.jenisPalawija || "palawija_sedikit");
  const [fasePalawija, setFasePalawija] = useState(saved?.fasePalawija || "pengolahan");
  const [luasPalawija, setLuasPalawija] = useState(saved?.luasPalawija ?? 0);

  const [luasHorti, setLuasHorti] = useState(saved?.luasHorti ?? 0);
  const [luasKolam, setLuasKolam] = useState(saved?.luasKolam ?? 0);

  // Tebu
  const [faseTebu, setFaseTebu] = useState(saved?.faseTebu || "pengolahan");
  const [luasTebu, setLuasTebu] = useState(saved?.luasTebu ?? 0);

  const [faktorTersier, setFaktorTersier] = useState(
    saved?.faktorTersier ?? PARAM_DEFAULT.faktor_tersier_list?.[1] ?? 1.25
  );

  const savedLossPct =
    saved?.kehilanganAirPct !== undefined
      ? String(saved.kehilanganAirPct)
      : saved?.kehilanganAir !== undefined
        ? String(num(saved.kehilanganAir) * 100)
        : "";

  const [kehilanganAirPct, setKehilanganAirPct] = useState(savedLossPct);

  const [qTersedia, setQTersedia] = useState(saved?.qTersedia ?? (b?.qtersedia_ldt ?? 0));

  // Koordinat (latitude and longitude) - lookup from mock data if not in API
  const defaultLat = saved?.koordinatLat ?? b?.lat ?? mockB?.lat ?? "";
  const defaultLng = saved?.koordinatLng ?? b?.lng ?? mockB?.lng ?? "";

  const [koordinatLat, setKoordinatLat] = useState(defaultLat);
  const [koordinatLng, setKoordinatLng] = useState(defaultLng);

  // Sync if saved/b/mockB changes
  useEffect(() => {
    const lat = saved?.koordinatLat ?? b?.lat ?? mockB?.lat ?? "";
    const lng = saved?.koordinatLng ?? b?.lng ?? mockB?.lng ?? "";
    setKoordinatLat(lat);
    setKoordinatLng(lng);
  }, [saved, b, mockB]);

  const [sadapKanan, setSadapKanan] = useState(saved?.sadapKanan ?? true);
  const [sadapKiri, setSadapKiri] = useState(saved?.sadapKiri ?? true);

  const [hasil, setHasil] = useState(saved?.hasil || null);

  const sadapLabel = useMemo(() => {
    if (isDoubleSadap) {
      if (sadapKanan && sadapKiri) return "2 (Kanan & Kiri)";
      if (sadapKanan) return "Kanan";
      if (sadapKiri) return "Kiri";
      return "0";
    }
    if (b && Array.isArray(b.posisi)) {
      if (b.posisi.includes("Kanan") && !b.posisi.includes("Kiri")) return "Kanan";
      if (b.posisi.includes("Kiri") && !b.posisi.includes("Kanan")) return "Kiri";
    }
    return "1";
  }, [isDoubleSadap, sadapKanan, sadapKiri, b?.posisi]);

  // Per-posisi khusus (kanan / kiri) - input berbeda per sisi
  const [lebarPintuKanan, setLebarPintuKanan] = useState(saved?.lebarPintuKanan ?? "");
  const [elevasiKanan, setElevasiKanan] = useState(saved?.elevasiKanan ?? "");
  const [koefLossKanan, setKoefLossKanan] = useState(saved?.koefLossKanan ?? "");

  const [lebarPintuKiri, setLebarPintuKiri] = useState(saved?.lebarPintuKiri ?? "");
  const [elevasiKiri, setElevasiKiri] = useState(saved?.elevasiKiri ?? "");
  const [koefLossKiri, setKoefLossKiri] = useState(saved?.koefLossKiri ?? "");

  // ===== KIRI: duplicate form state for full form (when needed) =====
  const [periodeKiri, setPeriodeKiri] = useState(saved?.periode || "Januari Periode 1");
  const [fotoUrlKiri, setFotoUrlKiri] = useState(saved?.fotoUrl || "");
  const [totalAreaKiri, setTotalAreaKiri] = useState(saved?.totalArea ?? 10);

  const [fasePadiKiri, setFasePadiKiri] = useState(saved?.fasePadi || "pengolahan");
  const [luasPadiKiri, setLuasPadiKiri] = useState(saved?.luasPadi ?? 6);

  const [jenisPalawijaKiri, setJenisPalawijaKiri] = useState(saved?.jenisPalawija || "palawija_sedikit");
  const [fasePalawijaKiri, setFasePalawijaKiri] = useState(saved?.fasePalawija || "pengolahan");
  const [luasPalawijaKiri, setLuasPalawijaKiri] = useState(saved?.luasPalawija ?? 0);

  const [luasHortiKiri, setLuasHortiKiri] = useState(saved?.luasHorti ?? 0);
  const [luasKolamKiri, setLuasKolamKiri] = useState(saved?.luasKolam ?? 0);

  const [faseTebuKiri, setFaseTebuKiri] = useState(saved?.faseTebu || "pengolahan");
  const [luasTebuKiri, setLuasTebuKiri] = useState(saved?.luasTebu ?? 0);

  const [faktorTersierKiri, setFaktorTersierKiri] = useState(
    saved?.faktorTersier ?? PARAM_DEFAULT.faktor_tersier_list?.[1] ?? 1.25
  );

  const savedLossPctKiri =
    saved?.kehilanganAirPct !== undefined
      ? String(saved.kehilanganAirPct)
      : saved?.kehilanganAir !== undefined
        ? String(num(saved.kehilanganAir) * 100)
        : "";

  const [kehilanganAirPctKiri, setKehilanganAirPctKiri] = useState(savedLossPctKiri);
  const [qTersediaKiri, setQTersediaKiri] = useState(saved?.qTersedia ?? (b?.qtersedia_ldt ?? 0));

  // ===== rates =====
  const KA = PARAM_DEFAULT.kebutuhan_air || {};

  const padiRates = {
    pengolahan: (KA.padi?.pengolahan ?? 0),
    pertumbuhan: (KA.padi?.pertumbuhan ?? 0),
    panen: 0,
  };

  const palawijaSedikitObj =
    typeof KA.palawija_sedikit === "object" && KA.palawija_sedikit
      ? KA.palawija_sedikit
      : { pengolahan: KA.palawija_sedikit ?? 0.2, pertumbuhan: KA.palawija_sedikit ?? 0.2 };

  const palawijaBanyakObj =
    typeof KA.palawija_banyak === "object" && KA.palawija_banyak
      ? KA.palawija_banyak
      : { pengolahan: KA.palawija_banyak ?? 0.3, pertumbuhan: KA.palawija_banyak ?? 0.3 };

  const palawijaRatesByJenis = {
    palawija_sedikit: {
      pengolahan: num(palawijaSedikitObj.pengolahan),
      pertumbuhan: num(palawijaSedikitObj.pertumbuhan),
    },
    palawija_banyak: {
      pengolahan: num(palawijaBanyakObj.pengolahan),
      pertumbuhan: num(palawijaBanyakObj.pertumbuhan),
    },
  };

  const tebuRates = {
    pengolahan: 0.85,
    muda: (KA.tebu?.muda ?? 0.36),
    tua: (KA.tebu?.tua ?? 0.125),
  };

  async function onPickFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await fileToDataUrl(file);
      setFotoUrl(url);
    } catch {
      alert("Gagal membaca file foto.");
    }
  }

  function getLossDecimal() {
    const s = String(kehilanganAirPct ?? "").trim();
    if (!s) return 0;
    const pct = num(s);
    const safePct = clamp(pct, 0, 60);
    return safePct / 100;
  }

  function hitungCore() {
    const hortiRate = num(KA.hortikultura ?? 0);
    const kolamRate = num(KA.kolam ?? 0);

    const padiRate = num(padiRates[fasePadi] ?? 0);
    const palRate = num(palawijaRatesByJenis[jenisPalawija]?.[fasePalawija] ?? 0);
    const tebuRate = num(tebuRates[faseTebu] ?? tebuRates.pengolahan);

    const loss = getLossDecimal();
    const mult = num(faktorTersier) * (1 + loss);

    const qPadi = num(luasPadi) * padiRate * mult;
    const qPalawija = num(luasPalawija) * palRate * mult;
    const qHorti = num(luasHorti) * hortiRate * mult;
    const qKolam = num(luasKolam) * kolamRate * mult;
    const qTebu = num(luasTebu) * tebuRate * mult;

    const sumQ = qPadi + qPalawija + qHorti + qKolam + qTebu;

    const rawK = sumQ > 0 ? num(qTersedia) / sumQ : 0;
    const faktorK = clamp(rawK, 0, 1);

    return { qPadi, qPalawija, qHorti, qKolam, qTebu, sumQ, faktorK, rawK };
  }

  // ✅ Auto-save form state to localStorage so MapShell sidebar shows current input values
  useEffect(() => {
    if (!id) return;

    const yearNow = new Date().getFullYear();
    const state = {
      periode,
      periodKey: periodeLabelToPKey(periode, yearNow),
      fotoUrl,
      totalArea: num(totalArea),
      fasePadi,
      luasPadi: num(luasPadi),
      jenisPalawija,
      fasePalawija,
      luasPalawija: num(luasPalawija),
      luasHorti: num(luasHorti),
      luasKolam: num(luasKolam),
      faseTebu,
      luasTebu: num(luasTebu),
      faktorTersier: num(faktorTersier),
      kehilanganAirPct: kehilanganAirPct ? num(kehilanganAirPct) : 0,
      qTersedia: num(qTersedia),
      koordinatLat: koordinatLat,
      koordinatLng: koordinatLng,
    };

    try {
      const allInputs = JSON.parse(localStorage.getItem("apemasi_building_inputs") || "{}");
      allInputs[String(id)] = state;
      localStorage.setItem("apemasi_building_inputs", JSON.stringify(allInputs));
    } catch (err) {
      console.warn("Failed to save building input to localStorage:", err);
    }
  }, [id, periode, fotoUrl, totalArea, fasePadi, luasPadi, jenisPalawija, fasePalawija, luasPalawija, luasHorti, luasKolam, faseTebu, luasTebu, faktorTersier, kehilanganAirPct, qTersedia, koordinatLat, koordinatLng]);

  function hitungDanSimpan() {
    const s = String(kehilanganAirPct ?? "").trim();
    if (s) {
      const pct = num(s);
      if (pct > 60) {
        alert("Faktor kehilangan air maksimal 60%.");
        setKehilanganAirPct("60");
        return;
      }
      if (pct < 0) {
        alert("Faktor kehilangan air minimal 0%.");
        setKehilanganAirPct("0");
        return;
      }
    }

    if (isDoubleSadap && !sadapKanan && !sadapKiri) {
      alert("Untuk 2 sadap, minimal pilih salah satu: Kanan atau Kiri.");
      return;
    }

    const core = hitungCore();
    const lossPctNumber = s ? clamp(num(s), 0, 60) : 0;

    const ts = Date.now();
    const at = new Date(ts).toISOString();

    // ✅ pKey harus konsisten sama filter admin
    const yearNow = new Date().getFullYear();
    const pKey = periodeLabelToPKey(periode, yearNow);

    const record = {
      building_id: String(id), // match backend snake_case
      code: building?.code || mockB?.code || "Unknown",
      lokasi: building?.lokasi || mockB?.lokasi || "-",
      hm: building?.hm || mockB?.hm || "-",
      saluran: building?.saluran || mockB?.saluran || "-",

      periode,
      p_key: pKey,       // ✅ match backend snake_case

      // Data JSON blob
      data: {
        at,         // ✅ timestamp ISO
        fotoUrl: fotoUrl || "",

        // Koordinat
        koordinatLat: num(koordinatLat),
        koordinatLng: num(koordinatLng),

        sadapCount: isDoubleSadap ? 2 : 1,
        sadapKanan: isDoubleSadap ? !!sadapKanan : true,
        sadapKiri: isDoubleSadap ? !!sadapKiri : false,

        totalArea: num(totalArea),

        fasePadi,
        luasPadi: num(luasPadi),

        jenisPalawija,
        fasePalawija,
        luasPalawija: num(luasPalawija),

        luasHorti: num(luasHorti),
        luasKolam: num(luasKolam),

        faseTebu,
        luasTebu: num(luasTebu),

        faktorTersier: num(faktorTersier),

        kehilanganAirPct: lossPctNumber,
        kehilanganAir: lossPctNumber / 100,

        // per-posisi khusus
        lebarPintuKanan: num(lebarPintuKanan),
        elevasiKanan: num(elevasiKanan),
        koefLossKanan: num(koefLossKanan),

        lebarPintuKiri: num(lebarPintuKiri),
        elevasiKiri: num(elevasiKiri),
        koefLossKiri: num(koefLossKiri),

        qTersedia: num(qTersedia),

        hasil: {
          qPadi: core.qPadi,
          qPalawija: core.qPalawija,
          qHorti: core.qHorti,
          qKolam: core.qKolam,
          qTebu: core.qTebu,
          sumQ: core.sumQ,
          faktorK: core.faktorK,
        },

        sumQ: core.sumQ,
        faktorK: core.faktorK,
        updatedAt: ts,
      }
    };

    // Save to API
    console.log('[BuildingDetail] Saving record:', record);
    axiosClient.post('/building-records', record)
      .then((res) => {
        console.log('[BuildingDetail] Save success:', res.data);
        setHasil(core);
        setSaved(record.data); // Update local state for UI consistency
        alert("Berhasil dihitung & disimpan ke server.");
      })
      .catch(err => {
        console.error('[BuildingDetail] Save error:', err);
        console.error('[BuildingDetail] Error response:', err.response?.data);
        alert("Gagal menyimpan ke server: " + (err.response?.data?.message || err.message));
      });
  }

  // Hitung & simpan untuk sisi Kiri (snapshot terpisah)
  function hitungDanSimpanKiri() {
    const s = String(kehilanganAirPctKiri ?? "").trim();
    if (s) {
      const pct = num(s);
      if (pct > 60) {
        alert("Faktor kehilangan air maksimal 60%.");
        setKehilanganAirPctKiri("60");
        return;
      }
      if (pct < 0) {
        alert("Faktor kehilangan air minimal 0%.");
        setKehilanganAirPctKiri("0");
        return;
      }
    }

    if (isDoubleSadap && !sadapKanan && !sadapKiri) {
      alert("Untuk 2 sadap, minimal pilih salah satu: Kanan atau Kiri.");
      return;
    }

    const core = { qPadi, qPalawija, qHorti, qKolam, qTebu, sumQ, faktorK, rawK };
    const lossPctNumber = s ? clamp(num(s), 0, 60) : 0;

    const ts = Date.now();
    const at = new Date(ts).toISOString();
    const yearNow = new Date().getFullYear();
    const pKey = periodeLabelToPKey(periodeKiri, yearNow);

    const record = {
      building_id: String(id),
      side: "kiri", // penting
      code: building?.code || mockB?.code || "Unknown",
      lokasi: building?.lokasi || mockB?.lokasi || "-",
      hm: building?.hm || mockB?.hm || "-",
      saluran: building?.saluran || mockB?.saluran || "-",

      periode: periodeKiri,
      p_key: pKey,

      data: {
        at,
        fotoUrl: fotoUrlKiri || "",

        // Koordinat
        koordinatLat: num(koordinatLat),
        koordinatLng: num(koordinatLng),

        sadapCount: isDoubleSadap ? 2 : 1,
        sadapKanan: isDoubleSadap ? !!sadapKanan : true,
        sadapKiri: isDoubleSadap ? !!sadapKiri : false,

        totalArea: num(totalAreaKiri),

        fasePadi: fasePadiKiri,
        luasPadi: num(luasPadiKiri),

        jenisPalawija: jenisPalawijaKiri,
        fasePalawija: fasePalawijaKiri,
        luasPalawija: num(luasPalawijaKiri),

        luasHorti: num(luasHortiKiri),
        luasKolam: num(luasKolamKiri),

        faseTebu: faseTebuKiri,
        luasTebu: num(luasTebuKiri),

        faktorTersier: num(faktorTersierKiri),

        kehilanganAirPct: lossPctNumber,
        kehilanganAir: lossPctNumber / 100,

        // per-posisi tetap disimpan
        lebarPintuKanan: num(lebarPintuKanan),
        elevasiKanan: num(elevasiKanan),
        koefLossKanan: num(koefLossKanan),

        lebarPintuKiri: num(lebarPintuKiri),
        elevasiKiri: num(elevasiKiri),
        koefLossKiri: num(koefLossKiri),

        qTersedia: num(qTersediaKiri),

        hasil: {
          qPadi,
          qPalawija,
          qHorti,
          qKolam,
          qTebu,
          sumQ,
          faktorK,
        },

        sumQ,
        faktorK,
        updatedAt: ts,
      }
    };

    axiosClient.post('/building-records', record)
      .then((res) => {
        console.log('[BuildingDetail] Save (kiri) success:', res.data);
        setHasil(core);
        alert("Berhasil dihitung & disimpan (kiri).");
      })
      .catch((err) => {
        console.error('[BuildingDetail] Save (kiri) error:', err);
        console.error('[BuildingDetail] Error response (kiri):', err.response?.data);
        alert("Gagal menyimpan (kiri): " + (err.response?.data?.message || err.message));
      });
  }

  // Early returns with conditional rendering
  if (loading) {
    return <div className="text-sm text-slate-600">Memuat...</div>;
  }

  if (!building) {
    return <div className="text-sm text-slate-600">Bangunan tidak ditemukan.</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-lg font-extrabold text-slate-900">{b.code}</div>
              <div className="text-sm text-slate-600">
                {b.lokasi} • HM {b.hm} • Saluran {b.saluran}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Sadap: {sadapLabel}
              </div>
            </div>
            <Badge tone="info">Input & Hitung</Badge>
          </div>
        </CardHeader>

        <CardContent className="grid gap-3 md:grid-cols-3">
          <Field label="Periode masa tanam">
            <Select value={periode} onChange={(e) => setPeriode(e.target.value)}>
              {periodOptions().map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </Field>


          <Field label="Koordinat (Otomatis)">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                {koordinatLat || "-"} (Lat)
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                {koordinatLng || "-"} (Lng)
              </div>
            </div>
          </Field>


          <Field label="Total Area (Ha)">
            <Input type="number" value={totalArea} onChange={(e) => setTotalArea(e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      {/* Foto */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-bold text-slate-900">Foto Bangunan (opsional)</h2>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div>
            <Input type="file" accept="image/*" onChange={onPickFoto} />
            {fotoUrl ? (
              <Button variant="secondary" className="mt-2" onClick={() => setFotoUrl("")}>
                Hapus foto
              </Button>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            {fotoUrl ? (
              <img src={fotoUrl} alt="foto bangunan" className="h-48 w-full rounded-xl object-cover" />
            ) : (
              <div className="text-sm text-slate-600">Belum ada foto.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sadap selector */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-bold text-slate-900">Sadap</h2>
          <p className="mt-1 text-xs text-slate-500">
            Konfigurasi sadap mengikuti data bangunan.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {!isDoubleSadap ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold">
              Sadap: {sadapLabel}
            </div>
          ) : (
            <>
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                <input type="checkbox" checked={sadapKanan} onChange={(e) => setSadapKanan(e.target.checked)} />
                Sadap Kanan
              </label>
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                <input type="checkbox" checked={sadapKiri} onChange={(e) => setSadapKiri(e.target.checked)} />
                Sadap Kiri
              </label>
            </>
          )}
        </CardContent>
      </Card>

      {/* Input per-posisi (kanan / kiri) */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-bold text-slate-900">Data Posisi Khusus</h2>
          <p className="mt-1 text-xs text-slate-500">Isi data khusus per sisi jika ada (Kanan / Kiri).</p>
        </CardHeader>

        <CardContent className="space-y-4">
          {Array.isArray(b.posisi) && b.posisi.includes("Kanan") && (
            <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
              <div className="font-semibold">Kanan</div>
              <Field label="Lebar pintu kanan (m)">
                <Input type="number" value={lebarPintuKanan} onChange={(e) => setLebarPintuKanan(e.target.value)} />
              </Field>
              <Field label="Elevasi kanan (m)">
                <Input type="number" value={elevasiKanan} onChange={(e) => setElevasiKanan(e.target.value)} />
              </Field>
              <Field label="Koef. kehilangan kanan">
                <Input type="number" value={koefLossKanan} onChange={(e) => setKoefLossKanan(e.target.value)} />
              </Field>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Input Komoditas */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-bold text-slate-900">Areal Layanan (langsung per komoditas)</h2>
          <p className="mt-1 text-xs text-slate-500"></p>
        </CardHeader>

        <CardContent className="grid gap-4 md:grid-cols-2">
          {/* Padi */}
          <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Padi</div>
              <Badge tone="info">lt/dt/ha</Badge>
            </div>

            <Field label="Fase padi">
              <Select value={fasePadi} onChange={(e) => setFasePadi(e.target.value)}>
                <option value="pengolahan">Pengolahan</option>
                <option value="pertumbuhan">Pertumbuhan</option>
                <option value="panen">Panen (0)</option>
              </Select>
            </Field>

            <Field label="Luas padi (Ha)">
              <Input type="number" value={luasPadi} onChange={(e) => setLuasPadi(e.target.value)} />
            </Field>
          </div>

          {/* Palawija */}
          <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Palawija</div>
              <Badge tone="info">lt/dt/ha</Badge>
            </div>

            <Field label="Jenis palawija">
              <Select value={jenisPalawija} onChange={(e) => setJenisPalawija(e.target.value)}>
                <option value="palawija_sedikit">Palawija Sedikit Air</option>
                <option value="palawija_banyak">Palawija Banyak Air</option>
              </Select>
            </Field>

            <Field label="Fase palawija">
              <Select value={fasePalawija} onChange={(e) => setFasePalawija(e.target.value)}>
                <option value="pengolahan">Pengolahan</option>
                <option value="pertumbuhan">Pertumbuhan</option>
              </Select>
            </Field>

            <Field label="Luas palawija (Ha)">
              <Input type="number" value={luasPalawija} onChange={(e) => setLuasPalawija(e.target.value)} />
            </Field>
          </div>

          {/* Hortikultura */}
          <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="font-semibold">Hortikultura</div>
            <Field label="Luas hortikultura (Ha)">
              <Input type="number" value={luasHorti} onChange={(e) => setLuasHorti(e.target.value)} />
            </Field>
          </div>

          {/* Kolam */}
          <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="font-semibold">Kolam</div>
            <Field label="Luas kolam (Ha)">
              <Input type="number" value={luasKolam} onChange={(e) => setLuasKolam(e.target.value)} />
            </Field>
          </div>

          {/* Tebu */}
          <div className="rounded-2xl border border-slate-200 p-4 space-y-3 md:col-span-2">
            <div className="font-semibold">Tebu</div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Fase tebu">
                <Select value={faseTebu} onChange={(e) => setFaseTebu(e.target.value)}>
                  <option value="pengolahan">Pengolahan (0.85)</option>
                  <option value="muda">Muda</option>
                  <option value="tua">Tua</option>
                </Select>
              </Field>
              <Field label="Luas tebu (Ha)">
                <Input type="number" value={luasTebu} onChange={(e) => setLuasTebu(e.target.value)} />
              </Field>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parameter */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-bold text-slate-900">Parameter</h2>
          <p className="mt-1 text-xs text-slate-500"></p>
        </CardHeader>

        <CardContent className="grid gap-3 md:grid-cols-3">
          <Field label="Faktor tersier">
            <Select value={faktorTersier} onChange={(e) => setFaktorTersier(Number(e.target.value))}>
              {(PARAM_DEFAULT.faktor_tersier_list || [1.2, 1.25, 1.3, 1.33, 1.35]).map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </Select>
          </Field>

          <Field label="Faktor kehilangan air (%) (0–60)">
            <Input
              type="number"
              min={0}
              max={60}
              value={kehilanganAirPct}
              placeholder=""
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  setKehilanganAirPct("");
                  return;
                }
                const next = Number(raw);
                if (Number.isNaN(next)) return;

                if (next > 60) {
                  alert("Maksimal kehilangan air 60%.");
                  setKehilanganAirPct("60");
                  return;
                }
                if (next < 0) {
                  setKehilanganAirPct("0");
                  return;
                }

                setKehilanganAirPct(raw);
              }}
            />
            <div className="mt-1 text-xs text-slate-500">Boleh kosong. Contoh: 10 berarti 10%.</div>
          </Field>

          <Field label="Debit ketersediaan (lt/dt)">
            <Input type="number" value={qTersedia} onChange={(e) => setQTersedia(e.target.value)} />
          </Field>

          <div className="md:col-span-3 flex justify-end">
            <Button onClick={hitungDanSimpan}>Hitung & Simpan</Button>
          </div>
        </CardContent>
      </Card>

      {/* Output */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Hasil (lt/dt)</h2>
            {hasil ? <Badge tone="ok">Terhitung</Badge> : <Badge tone="neutral">Belum</Badge>}
          </div>
        </CardHeader>

        <CardContent>
          {!hasil ? (
            <div className="text-sm text-slate-600">
              Klik <b>Hitung & Simpan</b> untuk melihat hasil.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              <Result title="Q Padi" value={hasil.qPadi} />
              <Result title="Q Palawija" value={hasil.qPalawija} />
              <Result title="Q Hortikultura" value={hasil.qHorti} />
              <Result title="Q Kolam" value={hasil.qKolam} />
              <Result title="Q Tebu" value={hasil.qTebu} />

              <div className="rounded-2xl border border-slate-200 bg-blue-50 p-4">
                <div className="text-xs text-slate-600">TOTAL (ΣQ)</div>
                <div className="mt-1 text-2xl font-extrabold text-slate-900">{format3(hasil.sumQ)}</div>

                <div className="mt-3 text-xs text-slate-600">Faktor K (maks 1)</div>
                <div className="mt-1 text-lg font-extrabold text-slate-900">
                  {format3(clamp(num(hasil.faktorK), 0, 1))}
                </div>

                {Number(format3(hasil.faktorK)) >= 1 ? (
                  <div className="mt-2 text-xs font-semibold text-emerald-700">Status: CUKUP</div>
                ) : (
                  <div className="mt-2 text-xs font-semibold text-red-700">Status: KURANG</div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Jika ada Kiri, tampilkan form Kiri lagi di bawah Hasil */}
      {Array.isArray(b.posisi) && b.posisi.includes("Kiri") && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Form Input (Kiri)</h2>
                <Badge tone="info">Kiri</Badge>
              </div>
            </CardHeader>

            <CardContent className="grid gap-3 md:grid-cols-3">
              <Field label="Periode masa tanam">
                <Select value={periodeKiri} onChange={(e) => setPeriodeKiri(e.target.value)}>
                  {periodOptions().map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Koordinat (Otomatis)">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                    {koordinatLat || "-"} (Lat)
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                    {koordinatLng || "-"} (Lng)
                  </div>
                </div>
              </Field>

              <Field label="Total Area (Ha)">
                <Input type="number" value={totalAreaKiri} onChange={(e) => setTotalAreaKiri(e.target.value)} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-slate-900">Foto Bangunan (opsional) — Kiri</h2>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div>
                <Input type="file" accept="image/*" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const url = await fileToDataUrl(file);
                    setFotoUrlKiri(url);
                  } catch {
                    alert("Gagal membaca file foto.");
                  }
                }} />
                {fotoUrlKiri ? (
                  <Button variant="secondary" className="mt-2" onClick={() => setFotoUrlKiri("")}>Hapus foto</Button>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                {fotoUrlKiri ? (
                  <img src={fotoUrlKiri} alt="foto bangunan kiri" className="h-48 w-full rounded-xl object-cover" />
                ) : (
                  <div className="text-sm text-slate-600">Belum ada foto.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Per-posisi kiri (tetap) */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-slate-900">Data Posisi Khusus — Kiri</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Lebar pintu kiri (m)">
                <Input type="number" value={lebarPintuKiri} onChange={(e) => setLebarPintuKiri(e.target.value)} />
              </Field>
              <Field label="Elevasi kiri (m)">
                <Input type="number" value={elevasiKiri} onChange={(e) => setElevasiKiri(e.target.value)} />
              </Field>
              <Field label="Koef. kehilangan kiri">
                <Input type="number" value={koefLossKiri} onChange={(e) => setKoefLossKiri(e.target.value)} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-slate-900">Areal Layanan (Kiri)</h2>
              <p className="mt-1 text-xs text-slate-500">Isi luas (Ha) untuk sisi kiri.</p>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Padi</div>
                  <Badge tone="info">lt/dt/ha</Badge>
                </div>

                <Field label="Fase padi">
                  <Select value={fasePadiKiri} onChange={(e) => setFasePadiKiri(e.target.value)}>
                    <option value="pengolahan">Pengolahan</option>
                    <option value="pertumbuhan">Pertumbuhan</option>
                    <option value="panen">Panen (0)</option>
                  </Select>
                </Field>

                <Field label="Luas padi (Ha)">
                  <Input type="number" value={luasPadiKiri} onChange={(e) => setLuasPadiKiri(e.target.value)} />
                </Field>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Palawija</div>
                  <Badge tone="info">lt/dt/ha</Badge>
                </div>

                <Field label="Jenis palawija">
                  <Select value={jenisPalawijaKiri} onChange={(e) => setJenisPalawijaKiri(e.target.value)}>
                    <option value="palawija_sedikit">Palawija Sedikit Air</option>
                    <option value="palawija_banyak">Palawija Banyak Air</option>
                  </Select>
                </Field>

                <Field label="Fase palawija">
                  <Select value={fasePalawijaKiri} onChange={(e) => setFasePalawijaKiri(e.target.value)}>
                    <option value="pengolahan">Pengolahan</option>
                    <option value="pertumbuhan">Pertumbuhan</option>
                  </Select>
                </Field>

                <Field label="Luas palawija (Ha)">
                  <Input type="number" value={luasPalawijaKiri} onChange={(e) => setLuasPalawijaKiri(e.target.value)} />
                </Field>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="font-semibold">Hortikultura</div>
                <Field label="Luas hortikultura (Ha)">
                  <Input type="number" value={luasHortiKiri} onChange={(e) => setLuasHortiKiri(e.target.value)} />
                </Field>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="font-semibold">Kolam</div>
                <Field label="Luas kolam (Ha)">
                  <Input type="number" value={luasKolamKiri} onChange={(e) => setLuasKolamKiri(e.target.value)} />
                </Field>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 space-y-3 md:col-span-2">
                <div className="font-semibold">Tebu</div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Fase tebu">
                    <Select value={faseTebuKiri} onChange={(e) => setFaseTebuKiri(e.target.value)}>
                      <option value="pengolahan">Pengolahan (0.85)</option>
                      <option value="muda">Muda</option>
                      <option value="tua">Tua</option>
                    </Select>
                  </Field>
                  <Field label="Luas tebu (Ha)">
                    <Input type="number" value={luasTebuKiri} onChange={(e) => setLuasTebuKiri(e.target.value)} />
                  </Field>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-slate-900">Parameter (Kiri)</h2>
              <p className="mt-1 text-xs text-slate-500">Faktor tersier + kehilangan air + debit ketersediaan untuk sisi kiri.</p>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <Field label="Faktor tersier">
                <Select value={faktorTersierKiri} onChange={(e) => setFaktorTersierKiri(Number(e.target.value))}>
                  {(PARAM_DEFAULT.faktor_tersier_list || [1.2, 1.25, 1.3, 1.33, 1.35]).map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Faktor kehilangan air (%) (0–60)">
                <Input
                  type="number"
                  min={0}
                  max={60}
                  value={kehilanganAirPctKiri}
                  onChange={(e) => setKehilanganAirPctKiri(e.target.value)}
                />
                <div className="mt-1 text-xs text-slate-500">Boleh kosong. Contoh: 10 berarti 10%.</div>
              </Field>

              <Field label="Debit ketersediaan (lt/dt)">
                <Input type="number" value={qTersediaKiri} onChange={(e) => setQTersediaKiri(e.target.value)} />
              </Field>

              <div className="md:col-span-3 flex justify-end">
                <Button onClick={hitungDanSimpanKiri}>Hitung & Simpan (Kiri)</Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-slate-600">{label}</div>
      {children}
    </div>
  );
}

function Result({ title, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="mt-1 text-xl font-extrabold text-slate-900">{format3(value)}</div>
    </div>
  );
}