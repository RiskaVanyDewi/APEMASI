import { useMemo, useState, useEffect } from "react";
import { Card, CardHeader, CardContent, Button, Select, Badge } from "../../components/ui";
import { getAuth } from "../../lib/auth";
import axiosClient from "../../lib/axios";
import { BUILDINGS } from "../../lib/mockData";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";


function readAllInputs() {
  try {
    const raw = localStorage.getItem("apemasi_building_inputs");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function num(v) {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function fmt(v, d = 2) {
  return num(v).toFixed(d);
}

function periodKeyFromDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const p = date.getDate() <= 15 ? "1" : "2";
  return `${y}-${m}-P${p}`; // contoh: 2026-01-P1
}

function periodLabelFromKey(key) {

  const [, m, p] = key.split("-");
  const idx = Number(m) - 1;
  const names = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const roman = p === "P1" ? "I" : "II";
  return `${names[idx]} ${roman}`;
}

function makeYearPeriods(year) {
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const out = [];
  for (const m of months) {
    out.push(`${year}-${m}-P1`);
    out.push(`${year}-${m}-P2`);
  }
  return out; 
}

// parse "Januari Periode 1" => { month:1..12, p:"P1"/"P2" }
function parsePeriodeLabel(periodeStr) {
  if (!periodeStr) return null;
  const s = String(periodeStr).trim().toLowerCase();
  const monthMap = {
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
  const parts = s.split(/\s+/);
  const mm = monthMap[parts[0]];
  if (!mm) return null;

  // cari "periode" dan angka 1/2
  const idxPer = parts.findIndex((x) => x === "periode");
  const n = idxPer >= 0 ? parts[idxPer + 1] : null;
  const p = n === "2" ? "P2" : "P1";
  return { mm, p };
}

function safeDateFromRecord(rec) {
  const at = rec?.at || rec?.updatedAt || rec?.createdAt || rec?.timestamp;
  const d = at ? new Date(at) : null;
  if (d && !Number.isNaN(d.getTime())) return d;

  // fallback: updatedAt numeric
  if (typeof rec?.updatedAt === "number" && rec.updatedAt > 0) {
    const d2 = new Date(rec.updatedAt);
    if (!Number.isNaN(d2.getTime())) return d2;
  }
  return null;
}

function getRecordYear(rec, fallbackYear) {
  const d = safeDateFromRecord(rec);
  if (d) return d.getFullYear();
  return fallbackYear;
}

function getPeriodKeyFromRecord(rec, fallbackYear) {
  // 1) kalau sudah ada periodKey
  if (rec?.periodKey && /^\d{4}-\d{2}-P[12]$/.test(rec.periodKey)) return rec.periodKey;

  // 2) kalau ada "periode" model: "Januari Periode 1"
  const parsed = parsePeriodeLabel(rec?.periode);
  if (parsed) {
    const y = getRecordYear(rec, fallbackYear);
    const m = String(parsed.mm).padStart(2, "0");
    return `${y}-${m}-${parsed.p}`;
  }

  // 3) fallback dari tanggal input
  const d = safeDateFromRecord(rec);
  if (d) return periodKeyFromDate(d);

  // 4) last fallback: pakai year fallback + Jan P1
  return `${fallbackYear}-01-P1`;
}

/** ======================
 * Export Helpers
 * ====================== */
async function downloadExcel({ filename, sheets }) {
  const wb = new ExcelJS.Workbook();

  sheets.forEach((s) => {
    const ws = wb.addWorksheet(s.name);
    ws.columns = s.columns;
    ws.addRows(s.rows);

    ws.getRow(1).font = { bold: true };

    ws.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPDF({ filename, title, metaLines = [], columns, rows }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  let y = 48;
  const maxY = doc.internal.pageSize.getHeight() - 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, 40, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  metaLines.forEach((line) => {
    if (y > maxY) {
      doc.addPage();
      y = 48;
    }
    doc.text(line, 40, y);
    y += 14;
  });

  y += 10;

  doc.setFont("helvetica", "bold");
  if (y > maxY) {
    doc.addPage();
    y = 48;
  }
  doc.text(columns.join(" | "), 40, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  rows.forEach((r) => {
    const line = r.map(String).join(" | ");
    if (y > maxY) {
      doc.addPage();
      y = 48;
    }
    doc.text(line, 40, y);
    y += 14;
  });

  doc.save(filename);
}

/** ======================
 * SVG Neraca Air (2 warna)
 * ====================== */
function SvgNeracaChart({
  title = "Neraca Air - DI ...",
  data, // [{ label, kebutuhan, ketersediaan }]
  colorKebutuhan = "#F59E0B", // amber
  colorTersedia = "#2563EB", // blue
}) {
  const w = 980;
  const h = 340;

  const padL = 74;
  const padR = 18;
  const padT = 48;
  const padB = 78;

  const maxV = Math.max(1, ...data.map((d) => Math.max(num(d.kebutuhan), num(d.ketersediaan))));

  const xStep = data.length > 1 ? (w - padL - padR) / (data.length - 1) : 0;
  const x = (i) => padL + i * xStep;
  const y = (v) => padT + (1 - v / maxV) * (h - padT - padB);

  const pathFor = (key) =>
    data
      .map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(num(d[key])).toFixed(2)}`)
      .join(" ");

  const pKeb = pathFor("kebutuhan");
  const pTers = pathFor("ketersediaan");
  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full min-w-[980px]">
        <text x={padL} y={24} fontSize="14" fontWeight="800" fill="#0f172a">
          {title}
        </text>

        <g transform={`translate(18 ${h / 2}) rotate(-90)`}>
          <text fontSize="12" fontWeight="700" fill="#334155">
            Debit Q (lt/dt)
          </text>
        </g>

        {gridLevels.map((t, idx) => {
          const yy = padT + (1 - t) * (h - padT - padB);
          const val = maxV * t;
          return (
            <g key={idx}>
              <line x1={padL} y1={yy} x2={w - padR} y2={yy} stroke="#0f172a" opacity="0.08" />
              <text x={padL - 10} y={yy + 4} fontSize="10" textAnchor="end" fill="#475569">
                {fmt(val, 1)}
              </text>
            </g>
          );
        })}

        <line x1={padL} y1={padT} x2={padL} y2={h - padB} stroke="#0f172a" opacity="0.18" />
        <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} stroke="#0f172a" opacity="0.18" />

        <text
          x={(padL + (w - padR)) / 2}
          y={h - 18}
          fontSize="12"
          fontWeight="700"
          textAnchor="middle"
          fill="#334155"
        >
          Periode
        </text>

        <path d={pKeb} fill="none" stroke={colorKebutuhan} strokeWidth="3" />
        <path d={pTers} fill="none" stroke={colorTersedia} strokeWidth="3" />

        {data.map((d, i) => (
          <g key={`${d.label}-${i}`}>
            <circle cx={x(i)} cy={y(num(d.kebutuhan))} r="3.6" fill={colorKebutuhan} />
            <circle cx={x(i)} cy={y(num(d.ketersediaan))} r="3.6" fill={colorTersedia} />
            <text x={x(i)} y={h - padB + 26} fontSize="10" textAnchor="middle" fill="#475569">
              {d.label}
            </text>
          </g>
        ))}

        <g transform={`translate(${w - 280} ${padT - 10})`}>
          <circle cx="0" cy="0" r="5" fill={colorKebutuhan} />
          <text x="12" y="4" fontSize="11" fontWeight="700" fill="#334155">
            Q keb. (lt/dt)
          </text>

          <circle cx="0" cy="20" r="5" fill={colorTersedia} />
          <text x="12" y="24" fontSize="11" fontWeight="700" fill="#334155">
            Q tersedia (lt/dt)
          </text>
        </g>
      </svg>
    </div>
  );
}

/** ======================
 * AdminDashboard
 * ====================== */

// ... existing helpers (num, clamp, fmt, etc.) ...

export default function AdminDashboard() {
  const auth = getAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [buildings, setBuildings] = useState([]);
  const [apiEvents, setApiEvents] = useState([]);

  useEffect(() => {
    async function fetchData() {
      // Jika tidak ada auth atau di_id, show error
      if (!auth) {
        setError("Anda tidak login");
        setLoading(false);
        return;
      }

      setError("");
      setLoading(true);

      try {
        let diId = auth.di_id;

        // Jika di_id adalah string (code like "ACN"), resolve ke ID numerik
        if (typeof diId === 'string' && isNaN(diId)) {
          const allDis = await axiosClient.get('/daerah-irigasi');
          const found = allDis.data.find(d => d.code === auth.di_id);
          if (found) {
            diId = found.id;
          } else {
            // Jika tidak ketemu, gunakan yang pertama atau beri warning
            console.warn(`DI code "${auth.di_id}" not found, using first DI`);
            diId = allDis.data[0]?.id;
          }
        }

        if (!diId) {
          setError("Daerah Irigasi tidak ditemukan. Silakan login ulang.");
          setLoading(false);
          return;
        }

        const [resBuildings, resRecords] = await Promise.all([
          axiosClient.get(`/buildings?di_id=${diId}`),
          axiosClient.get(`/building-records?di_id=${diId}`)
        ]);

        setBuildings(resBuildings.data || []);
        setApiEvents(resRecords.data || []);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError(`Error: ${err.response?.data?.message || err.message || "Gagal memuat data"}`);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [auth?.di_id]);

  const now = new Date();
  const nowYear = now.getFullYear();

  const totalBangunan = buildings.length;
  const kanan = buildings.filter((b) => b.canal_id === 4 || b.saluran === "kanan").length;
  const kiri = buildings.filter((b) => b.canal_id === 5 || b.saluran === "kiri").length;

  // Transform API records into the event format expected by the dashboard
  const events = useMemo(() => {
    return apiEvents.map(rec => ({
      ...rec,
      buildingId: String(rec.building_id),
      // mapping 'data' blob to the flat structure if needed, 
      // but dashboard seems to read results from 'rec.hasil' or similar
      ...rec.data,
      updatedAt: rec.updated_at
    }));
  }, [apiEvents]);

  // Progres input "per bangunan": hitung berapa bangunan minimal pernah input
  const buildingsEverInput = useMemo(() => {
    const s = new Set();
    events.forEach((e) => s.add(String(e.buildingId)));
    return s;
  }, [events]);

  const sudah = buildingsEverInput.size;
  const belum = Math.max(0, totalBangunan - sudah);

  const [year, setYear] = useState(String(nowYear));
  const [period, setPeriod] = useState("ALL");

  const yearOptions = useMemo(() => {
    const ys = new Set();
    events.forEach((rec) => {
      const y = getRecordYear(rec, nowYear);
      ys.add(y);
    });

    if (ys.size === 0) {
      ys.add(nowYear);
      ys.add(nowYear - 1);
    }
    return Array.from(ys).sort((a, b) => b - a).map(String);
  }, [events, nowYear]);

  /**
   * INTI PERBAIKAN:
   * - Untuk tiap PERIODE, tiap BANGUNAN cuma 1 baris: yang TERBARU di periode itu.
   * - ALL: tetap 24 periode tampil (walau kosong).
   */
  const latestByPeriod = useMemo(() => {
    const y = Number(year);
    const periods = makeYearPeriods(y);

    // mapPeriod: { [pKey]: Map(buildingId -> latestRecord) }
    const mapPeriod = new Map(periods.map((pKey) => [pKey, new Map()]));

    for (const rec of events) {
      const pKey = getPeriodKeyFromRecord(rec, y);

      // hanya ambil yang tahun ini
      if (!String(pKey).startsWith(`${y}-`)) continue;
      if (!mapPeriod.has(pKey)) continue;

      const bId = String(rec.buildingId ?? "");
      if (!bId) continue;

      // tentukan waktu rec (buat compare terbaru)
      const d = safeDateFromRecord(rec);
      const t = d ? d.getTime() : num(rec.updatedAt || 0);

      const bucket = mapPeriod.get(pKey);
      const prev = bucket.get(bId);
      if (!prev) {
        bucket.set(bId, { ...rec, __t: t });
      } else {
        const prevD = safeDateFromRecord(prev);
        const prevT = prevD ? prevD.getTime() : num(prev.__t || prev.updatedAt || 0);
        if (t >= prevT) bucket.set(bId, { ...rec, __t: t });
      }
    }

    return { periods, mapPeriod };
  }, [events, year]);

  // Detail rows untuk period terpilih: 1 bangunan 1 baris (TERBARU di periode itu)
  const filteredDetail = useMemo(() => {
    const y = Number(year);
    if (period === "ALL") return []; // mode ALL pakai tabel rekap per periode, bukan tabel detail
    const bucket = latestByPeriod.mapPeriod.get(period);
    if (!bucket) return [];

    const byId = new Map(buildings.map((b) => [String(b.id), b]));

    const rows = Array.from(bucket.entries()).map(([buildingId, rec]) => {
      const b = byId.get(String(buildingId));
      const qKeb = num(rec?.hasil?.sumQ ?? rec?.sumQ ?? rec?.qkebutuhan_ldt ?? 0);
      const qTers = num(rec?.qTersedia ?? rec?.qTers ?? rec?.qtersedia_ldt ?? 0);
      const rawK = qKeb > 0 ? qTers / qKeb : 0;
      const k = clamp(rawK, 0, 1);

      return {
        pKey: period,
        tahun: String(y),
        buildingId,
        code: b?.nomenklatur_bagi || rec?.code || buildingId,
        lokasi: b?.lokasi || rec?.lokasi || "-",
        saluran: b?.canal_id === 4 ? "kanan" : b?.canal_id === 5 ? "kiri" : rec?.saluran || "-",
        qKeb,
        qTers,
        k,
      };
    });

    // rapihin urutan: K terkecil dulu biar kelihatan defisitnya
    rows.sort((a, b) => a.k - b.k);
    return rows;
  }, [year, period, latestByPeriod.mapPeriod, buildings]);

  // Rekap 24 periode: total Q & count berdasarkan "latest per building per period"
  const periodSeries = useMemo(() => {
    const y = Number(year);
    const { periods, mapPeriod } = latestByPeriod;
    const byId = new Map(buildings.map((b) => [String(b.id), b])); // use database buildings

    return periods.map((pKey) => {
      const bucket = mapPeriod.get(pKey) || new Map();
      let kebutuhan = 0;
      let ketersediaan = 0;

      bucket.forEach((rec) => {
        // (opsional) kalau buildingId gak ada di buildings, tetap dihitung juga:
        const qKeb = num(rec?.hasil?.sumQ ?? rec?.sumQ ?? rec?.qkebutuhan_ldt ?? 0);
        const qTers = num(rec?.qTersedia ?? rec?.qTers ?? rec?.qtersedia_ldt ?? 0);
        kebutuhan += qKeb;
        ketersediaan += qTers;
      });

      return {
        pKey,
        label: periodLabelFromKey(pKey),
        kebutuhan,
        ketersediaan,
        count: bucket.size,
      };
    });
  }, [year, latestByPeriod, buildings]);

  // totals: kalau ALL => totals dari semua periode (akumulasi 24 periode)
  // kalau period tertentu => totals dari detail periode itu (1 bangunan 1 data terbaru)
  const totals = useMemo(() => {
    if (period === "ALL") {
      const qKeb = periodSeries.reduce((a, r) => a + num(r.kebutuhan), 0);
      const qTers = periodSeries.reduce((a, r) => a + num(r.ketersediaan), 0);
      const rawK = qKeb > 0 ? qTers / qKeb : 0;
      const k = clamp(rawK, 0, 1);
      const count = periodSeries.reduce((a, r) => a + num(r.count), 0);
      return { qKeb, qTers, k, count };
    }

    const qKeb = filteredDetail.reduce((a, r) => a + num(r.qKeb), 0);
    const qTers = filteredDetail.reduce((a, r) => a + num(r.qTers), 0);
    const rawK = qKeb > 0 ? qTers / qKeb : 0;
    const k = clamp(rawK, 0, 1);
    return { qKeb, qTers, k, count: filteredDetail.length };
  }, [period, filteredDetail, periodSeries]);

  // PRIORITAS:
  // - ALL: tampil prioritas per-periode (berdasarkan data terbaru per bangunan di tiap periode)
  // - Periode: prioritas hanya periode itu (1 bangunan 1 baris terbaru)
  const prioritasList = useMemo(() => {
    if (period === "ALL") {
      const rows = [];
      const byId = new Map(buildings.map((b) => [String(b.id), b]));

      latestByPeriod.periods.forEach((pKey) => {
        const bucket = latestByPeriod.mapPeriod.get(pKey) || new Map();
        bucket.forEach((rec, buildingId) => {
          const b = byId.get(String(buildingId));
          const qKeb = num(rec?.hasil?.sumQ ?? rec?.sumQ ?? rec?.qkebutuhan_ldt ?? 0);
          const qTers = num(rec?.qTersedia ?? rec?.qTers ?? rec?.qtersedia_ldt ?? 0);
          const rawK = qKeb > 0 ? qTers / qKeb : 0;
          const k = clamp(rawK, 0, 1);
          const kFormatted = Number(fmt(k, 3));

          if (k > 0 && kFormatted < 1) {
            rows.push({
              pKey,
              tahun: year,
              buildingId: String(buildingId),
              code: b?.nomenklatur_bagi || rec?.code || String(buildingId),
              lokasi: b?.lokasi || rec?.lokasi || "-",
              saluran: b?.canal_id === 4 ? "kanan" : b?.canal_id === 5 ? "kiri" : rec?.saluran || "-",
              qKeb,
              qTers,
              k,
            });
          }
        });
      });

      // urut per periode lalu K terkecil
      rows.sort((a, b) => {
        if (a.pKey === b.pKey) return a.k - b.k;
        return a.pKey.localeCompare(b.pKey);
      });
      return rows;
    }

    // periode tertentu: dari filteredDetail saja
    return filteredDetail
      .filter((r) => r.k > 0 && Number(fmt(r.k, 3)) < 1)
      .slice()
      .sort((a, b) => a.k - b.k);
  }, [period, filteredDetail, latestByPeriod, year, buildings]);

  const prioritasGrouped = useMemo(() => {
    if (period !== "ALL") return [];
    const groups = {};
    prioritasList.forEach((r) => {
      if (!groups[r.pKey]) groups[r.pKey] = [];
      groups[r.pKey].push(r);
    });

    const order = makeYearPeriods(Number(year));
    return order
      .filter((p) => (groups[p] || []).length > 0)
      .map((p) => ({
        pKey: p,
        label: periodLabelFromKey(p),
        rows: groups[p],
      }));
  }, [prioritasList, period, year]);

  async function onDownloadExcel() {
    // Rekap 24 periode (selalu 24 baris)
    const sheetRekap = periodSeries.map((m) => {
      const rawK = m.kebutuhan > 0 ? m.ketersediaan / m.kebutuhan : 0;
      const k = clamp(rawK, 0, 1);
      return {
        periode: m.label,
        qTersedia: Number(fmt(m.ketersediaan, 3)),
        qKebutuhan: Number(fmt(m.kebutuhan, 3)),
        faktorK: Number(fmt(k, 3)),
        jumlahBangunan: m.count,
      };
    });

    // Detail sesuai filter (1 periode): 1 bangunan 1 data terbaru
    const sheetDetailFilter =
      period === "ALL"
        ? []
        : filteredDetail.map((r) => ({
          periode: periodLabelFromKey(r.pKey),
          kode: r.code,
          lokasi: r.lokasi,
          saluran: r.saluran,
          qTersedia: Number(fmt(r.qTers, 3)),
          qKebutuhan: Number(fmt(r.qKeb, 3)),
          faktorK: Number(fmt(r.k, 3)),
        }));

    // Prioritas (K<1) sesuai filter
    const sheetPrioritas = prioritasList.map((r) => ({
      periode: periodLabelFromKey(r.pKey),
      kode: r.code,
      lokasi: r.lokasi,
      saluran: r.saluran,
      qTersedia: Number(fmt(r.qTers, 3)),
      qKebutuhan: Number(fmt(r.qKeb, 3)),
      faktorK: Number(fmt(r.k, 3)),
    }));

    const name =
      period === "ALL"
        ? `neraca-air_${year}_24-periode.xlsx`
        : `neraca-air_${year}_${periodLabelFromKey(period).replace(" ", "-")}.xlsx`;

    const sheets = [
      {
        name: "Rekap_24_Periode",
        columns: [
          { header: "Periode", key: "periode", width: 14 },
          { header: "Q tersedia (lt/dt)", key: "qTersedia", width: 18 },
          { header: "Q keb. (lt/dt)", key: "qKebutuhan", width: 18 },
          { header: "Faktor K (maks 1)", key: "faktorK", width: 14 },
          { header: "Jumlah Bangunan", key: "jumlahBangunan", width: 16 },
        ],
        rows: sheetRekap,
      },
    ];

    if (period !== "ALL") {
      sheets.push({
        name: "Detail_Filter",
        columns: [
          { header: "Periode", key: "periode", width: 14 },
          { header: "Kode", key: "kode", width: 10 },
          { header: "Lokasi", key: "lokasi", width: 26 },
          { header: "Saluran", key: "saluran", width: 10 },
          { header: "Q tersedia", key: "qTersedia", width: 14 },
          { header: "Q keb.", key: "qKebutuhan", width: 14 },
          { header: "Faktor K (maks 1)", key: "faktorK", width: 14 },
        ],
        rows: sheetDetailFilter,
      });
    }

    sheets.push({
      name: period === "ALL" ? "Prioritas_Tahun" : "Prioritas_Period",
      columns: [
        { header: "Periode", key: "periode", width: 14 },
        { header: "Kode", key: "kode", width: 10 },
        { header: "Lokasi", key: "lokasi", width: 26 },
        { header: "Saluran", key: "saluran", width: 10 },
        { header: "Q tersedia", key: "qTersedia", width: 14 },
        { header: "Q keb.", key: "qKebutuhan", width: 14 },
        { header: "Faktor K (maks 1)", key: "faktorK", width: 14 },
      ],
      rows: sheetPrioritas,
    });

    await downloadExcel({ filename: name, sheets });
  }

  function onDownloadPDF() {
    const title =
      period === "ALL"
        ? `Rekap Neraca Air (24 Periode) - ${year}`
        : `Rekap Neraca Air - ${periodLabelFromKey(period)} (${year})`;

    const meta = [
      `Total baris: ${totals.count}`,
      `Total Q tersedia: ${fmt(totals.qTers, 3)} lt/dt`,
      `Total Q keb.: ${fmt(totals.qKeb, 3)} lt/dt`,
      `Faktor K (maks 1): ${fmt(totals.k, 3)}`,
    ];

    if (period === "ALL") {
      downloadPDF({
        filename: `neraca-air_${year}_24-periode.pdf`,
        title,
        metaLines: meta,
        columns: ["Periode", "Q tersedia", "Q keb.", "K (maks 1)", "Jumlah"],
        rows: periodSeries.map((m) => {
          const rawK = m.kebutuhan > 0 ? m.ketersediaan / m.kebutuhan : 0;
          const k = clamp(rawK, 0, 1);
          return [m.label, fmt(m.ketersediaan, 3), fmt(m.kebutuhan, 3), fmt(k, 3), String(m.count)];
        }),
      });
      return;
    }

    downloadPDF({
      filename: `neraca-air_${period}.pdf`,
      title,
      metaLines: meta,
      columns: ["Kode", "Lokasi", "Saluran", "Q tersedia", "Q keb.", "K (maks 1)"],
      rows: filteredDetail.map((r) => [
        r.code,
        r.lokasi,
        r.saluran,
        fmt(r.qTers, 3),
        fmt(r.qKeb, 3),
        fmt(r.k, 3),
      ]),
    });
  }

  return (
    <div className="space-y-4">
      {/* Welcome Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Selamat Datang di Dashboard Admin</h1>
        <p className="text-sm text-slate-600">
          Anda sedang memantau <span className="font-bold text-blue-700">{auth?.di_name || "Daerah Irigasi"}</span>
        </p>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <div className="text-lg text-red-600">⚠️</div>
            <div>
              <div className="font-semibold text-red-900">{error}</div>
              <div className="mt-1 text-sm text-red-700">
                Silakan <button className="underline hover:no-underline" onClick={() => window.location.reload()}>reload halaman</button> atau <button className="underline hover:no-underline" onClick={() => { localStorage.removeItem("apemasi_auth"); window.location.href = "/"; }}>login ulang</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <div className="text-sm font-semibold text-slate-500">Memuat data dari server...</div>
          </div>
        </div>
      ) : (
        <>
          {/* Row 1 */}
          <div className="grid gap-4">
            <Card className="shadow-lg">
              <CardContent className="p-5">
                <DonutChart
                  done={sudah}
                  pending={belum}
                  title="Progres Input"
                  subtitle="Proporsi bangunan yang sudah pernah diinput vs belum."
                  size={170}
                  stroke={18}
                />
              </CardContent>
            </Card>
          </div>

          {/* Neraca Air */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-base font-extrabold text-slate-900">Neraca Air</div>
                  <div className="mt-1 text-sm text-slate-600">Hubungan antara Q Kebutuhan dan Q Ketersediaan</div>
                  <div className="mt-2 text-xs text-slate-500">
                    Catatan: Grafik selalu tampil 24 periode. Filter hanya untuk tabel & prioritas.
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Select
                    value={year}
                    onChange={(e) => {
                      const y = e.target.value;
                      setYear(y);
                      setPeriod("ALL");
                    }}
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        Tahun {y}
                      </option>
                    ))}
                  </Select>

                  <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
                    <option value="ALL">1 Tahun (24 Periode)</option>
                    {makeYearPeriods(Number(year)).map((p) => (
                      <option key={p} value={p}>
                        {periodLabelFromKey(p)}
                      </option>
                    ))}
                  </Select>

                  <Button type="button" onClick={onDownloadExcel}>
                    Download Excel
                  </Button>
                  <Button type="button" variant="secondary" onClick={onDownloadPDF}>
                    Download PDF
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Stat title="Total Q tersedia (lt/dt)" value={`${fmt(totals.qTers, 3)} lt/dt`} />
                <Stat title="Total Q keb. (lt/dt)" value={`${fmt(totals.qKeb, 3)} lt/dt`} />
                <Stat
                  title="Faktor K (maks 1)"
                  value={fmt(totals.k, 3)}
                  tone={Number(fmt(totals.k, 3)) >= 1 ? "ok" : (totals.k > 0 ? "danger" : "neutral")}
                />
              </div>

              {/* GRAFIK: selalu 24 periode */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <SvgNeracaChart title={`Neraca Air (${year})`} data={periodSeries} />
              </div>

              {/* TABEL */}
              {period === "ALL" ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="grid grid-cols-5 gap-2 border-b border-slate-100 px-4 py-3 text-xs font-extrabold text-slate-700">
                    <div>Periode</div>
                    <div>Q tersedia (lt/dt)</div>
                    <div>Q keb. (lt/dt)</div>
                    <div>Faktor K (maks 1)</div>
                    <div>Jumlah</div>
                  </div>

                  {periodSeries.map((m, idx) => {
                    const rawK = m.kebutuhan > 0 ? m.ketersediaan / m.kebutuhan : 0;
                    const k = clamp(rawK, 0, 1);
                    return (
                      <div
                        key={m.pKey}
                        className={[
                          "grid grid-cols-5 gap-2 px-4 py-3 text-sm",
                          idx !== periodSeries.length - 1 ? "border-b border-slate-50" : "",
                        ].join(" ")}
                      >
                        <div className="font-semibold text-slate-800">{m.label}</div>
                        <div className="text-slate-700">{fmt(m.ketersediaan, 3)}</div>
                        <div className="text-slate-700">{fmt(m.kebutuhan, 3)}</div>
                        <div className={["font-extrabold", Number(fmt(k, 3)) < 1 ? "text-red-700" : "text-emerald-700"].join(" ")}>
                          {fmt(k, 3)}
                        </div>
                        <div className="text-slate-700">{m.count}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="grid grid-cols-6 gap-2 border-b border-slate-100 px-4 py-3 text-xs font-extrabold text-slate-700">
                    <div>Kode</div>
                    <div>Lokasi</div>
                    <div>Saluran</div>
                    <div>Q tersedia</div>
                    <div>Q keb.</div>
                    <div>K (maks 1)</div>
                  </div>

                  {filteredDetail.length === 0 ? (
                    <div className="px-4 py-4 text-sm text-slate-600">
                      Belum ada data pada periode {periodLabelFromKey(period)}.
                    </div>
                  ) : (
                    filteredDetail.map((r, idx) => (
                      <div
                        key={`${r.buildingId}-${idx}`}
                        className={[
                          "grid grid-cols-6 gap-2 px-4 py-3 text-sm",
                          idx !== filteredDetail.length - 1 ? "border-b border-slate-50" : "",
                        ].join(" ")}
                      >
                        <div className="font-semibold text-slate-800">{r.code}</div>
                        <div className="text-slate-700 truncate">{r.lokasi}</div>
                        <div className="text-slate-700">{r.saluran}</div>
                        <div className="text-slate-700">{fmt(r.qTers, 3)}</div>
                        <div className="text-slate-700">{fmt(r.qKeb, 3)}</div>
                        <div className={["font-extrabold", Number(fmt(r.k, 3)) < 1 ? "text-red-700" : "text-emerald-700"].join(" ")}>
                          {fmt(r.k, 3)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* PRIORITAS (ikut filter) */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-extrabold text-slate-900">
                    {period === "ALL" ? `Prioritas Tahun ${year}` : `Prioritas Periode: ${periodLabelFromKey(period)}`}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Menampilkan bangunan dengan Faktor K &lt; 1{" "}
                    {period === "ALL" ? " (Ditampilkan per periode sepanjang tahun)" : " (Hanya periode terpilih)"}
                  </div>
                </div>
                <Chip
                  tone={prioritasList.length > 0 ? "warn" : "ok"}
                  text={prioritasList.length > 0 ? `BUTUH PERHATIAN (${prioritasList.length})` : "AMAN"}
                />
              </div>
            </CardHeader>

            <CardContent>
              {prioritasList.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Tidak ada bangunan defisit (K &lt; 1).
                </div>
              ) : period !== "ALL" ? (
                // MODE PERIODE: 1 bangunan 1 baris terbaru
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {prioritasList.map((x, idx) => (
                    <div
                      key={`${x.buildingId}-${idx}`}
                      className={[
                        "flex items-center justify-between gap-3 px-4 py-4",
                        idx !== prioritasList.length - 1 ? "border-b border-slate-100" : "",
                      ].join(" ")}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-slate-900">{x.code}</div>
                        <div className="mt-1 text-xs text-slate-500 truncate">
                          {x.lokasi} • Saluran {x.saluran}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Pill label={`Q keb. ${fmt(x.qKeb, 3)} lt/dt`} />
                          <Pill label={`Q tersedia ${fmt(x.qTers, 3)} lt/dt`} />
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-xs font-semibold text-slate-600">Faktor K</div>
                        <div className={["mt-1 text-2xl font-extrabold", x.k >= 1 ? "text-emerald-700" : "text-red-700"].join(" ")}>
                          {fmt(x.k, 3)}
                        </div>
                        <div className="mt-1">
                          <Chip tone={x.k >= 1 ? "ok" : "danger"} text={x.k >= 1 ? "CUKUP" : "KURANG"} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // MODE ALL: group per periode
                <div className="space-y-4">
                  {prioritasGrouped.map((g) => (
                    <div key={g.pKey} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <div className="text-sm font-extrabold text-slate-900">{g.label}</div>
                        <Chip tone="warn" text={`KURANG (${g.rows.length})`} />
                      </div>

                      {g.rows.map((x, idx) => (
                        <div
                          key={`${x.buildingId}-${idx}`}
                          className={[
                            "flex items-center justify-between gap-3 px-4 py-4",
                            idx !== g.rows.length - 1 ? "border-b border-slate-100" : "",
                          ].join(" ")}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-extrabold text-slate-900">{x.code}</div>
                            <div className="mt-1 text-xs text-slate-500 truncate">
                              {x.lokasi} • Saluran {x.saluran}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Pill label={`Q keb. ${fmt(x.qKeb, 3)} lt/dt`} />
                              <Pill label={`Q tersedia ${fmt(x.qTers, 3)} lt/dt`} />
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <div className="text-xs font-semibold text-slate-600">Faktor K</div>
                            <div className={["mt-1 text-2xl font-extrabold", x.k >= 1 ? "text-emerald-700" : "text-red-700"].join(" ")}>
                              {fmt(x.k, 3)}
                            </div>
                            <div className="mt-1">
                              <Chip tone={x.k >= 1 ? "ok" : "danger"} text={x.k >= 1 ? "CUKUP" : "KURANG"} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/** ======================
 * UI Pieces
 * ====================== */
function Stat({ title, value, tone = "neutral" }) {
  const box =
    tone === "danger" ? "border-red-200 bg-red-50" :
      tone === "ok" ? "border-emerald-200 bg-emerald-50" :
        "border-slate-200 bg-white";

  const val =
    tone === "danger" ? "text-red-800" :
      tone === "ok" ? "text-emerald-800" :
        "text-slate-900";

  return (
    <div className={["rounded-2xl border p-4", box].join(" ")}>
      <div className="text-xs text-slate-500">{title}</div>
      <div className={["mt-1 text-2xl font-extrabold", val].join(" ")}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-blue-200 bg-white/70 p-3">
      <div className="text-xs text-blue-700">{label}</div>
      <div className="mt-1 text-lg font-extrabold text-blue-900">{value}</div>
    </div>
  );
}

function Pill({ label }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700">
      {label}
    </span>
  );
}

function Chip({ tone = "warn", text }) {
  const styles = {
    warn: "bg-amber-100 text-amber-800 border-amber-200",
    ok: "bg-emerald-100 text-emerald-800 border-emerald-200",
    danger: "bg-red-100 text-red-800 border-red-200",
    info: "bg-blue-100 text-blue-800 border-blue-200",
  };

  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-extrabold tracking-wide",
        styles[tone],
      ].join(" ")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {text}
    </span>
  );
}

function pct(a, b) {
  if (!b) return 0;
  return Math.round((a / b) * 100);
}

function DonutChart({
  done = 0,
  pending = 0,
  title = "Progres Input",
  subtitle = "Proporsi sudah input vs belum.",
  size = 170,
  stroke = 18,
}) {
  const total = done + pending || 1;
  const pctDone = Math.round((done / total) * 100);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  const doneLen = (done / total) * c;
  const pendingLen = c - doneLen;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-base font-extrabold text-slate-900">{title}</div>
        <div className="mt-1 text-sm text-slate-600">{subtitle}</div>
      </div>

      <div className="grid gap-5 md:grid-cols-[210px_1fr] items-center">
        <div className="flex items-center justify-center">
          <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="block">
              <g transform={`translate(${size / 2},${size / 2})`}>
                <circle r={r} fill="none" strokeWidth={stroke} className="stroke-slate-100" />
                <circle
                  r={r}
                  fill="none"
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  className="stroke-slate-300"
                  strokeDasharray={`${pendingLen} ${doneLen}`}
                  transform="rotate(-90)"
                />
                <circle
                  r={r}
                  fill="none"
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  className="stroke-blue-600"
                  strokeDasharray={`${doneLen} ${pendingLen}`}
                  transform="rotate(-90)"
                />
              </g>
            </svg>

            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="text-3xl font-extrabold text-slate-900 leading-none">{pctDone}%</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Sudah input</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <LegendRow color="bg-blue-600" label="Sudah diinput" value={done} />
          <LegendRow color="bg-slate-300" label="Belum" value={pending} />
          <div className="pt-2 border-t border-slate-200 text-sm text-slate-600">
            Total: <span className="font-extrabold text-slate-900">{total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendRow({ color, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className={["h-2.5 w-2.5 rounded-full", color].join(" ")} />
        <span className="text-sm font-semibold text-slate-700 truncate">{label}</span>
      </div>
      <span className="text-sm font-extrabold text-slate-900">{value}</span>
    </div>
  );
}