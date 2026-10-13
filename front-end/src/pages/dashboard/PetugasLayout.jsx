import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Input, Badge } from "../../components/ui";
import { getAuth, setAuth } from "../../lib/auth";
import axiosClient from "../../lib/axios";
import { BUILDINGS } from "../../lib/mockData";
import logo from "../../assets/logo.png";


function IconMenu({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconClose({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconHome({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconLogout({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M10 17l-1 0a4 4 0 0 1-4-4V11a4 4 0 0 1 4-4h1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 7l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 12H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function PetugasLayout() {
  const nav = useNavigate();
  const loc = useLocation();
  const [auth, setInternalAuth] = useState(getAuth());

  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [buildings, setBuildings] = useState([]);

  const [saluran, setSaluran] = useState("semua");
  const [q, setQ] = useState("");

  // Refresh auth from server so we have latest building_ids (after admin changes)
  useEffect(() => {
    async function refreshAuth() {
      try {
        const res = await axiosClient.get('/me');
        const user = res.data || {};
        const current = getAuth() || {};
        const newAuth = {
          ...current,
          username: user.username || current.username,
          name: user.name || current.name,
          di_id: user.di_id ?? current.di_id,
          di_name: user.di_name || current.di_name,
          building_ids: user.building_ids || current.building_ids || [],
          id: user.id || current.id,
        };
        setAuth(newAuth);
        setInternalAuth(newAuth);
        console.log('[PetugasLayout] Auth refreshed from /me', user);
        // Notify other components to reload auth-dependent data
        try { window.dispatchEvent(new Event('authUpdated')); } catch (e) { /* ignore */ }
      } catch (err) {
        console.warn('[PetugasLayout] Failed to refresh auth:', err?.message || err);
      }
    }
    refreshAuth();

    // Periodic refresh and event listeners so building assignments propagate
    const interval = setInterval(refreshAuth, 30 * 1000); // every 30s
    window.addEventListener('focus', refreshAuth);
    window.addEventListener('usersUpdated', refreshAuth);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refreshAuth);
      window.removeEventListener('usersUpdated', refreshAuth);
    };
  }, []);

  // Fetch buildings from API
  useEffect(() => {
    async function loadBuildings() {
      try {
        const diId = auth?.di_id || 2;
        const userBuildingIds = auth?.building_ids || []; // ✅ Get user's assigned buildings
        console.log('[PetugasLayout] Loading buildings for di_id:', diId);
        console.log('[PetugasLayout] User building_ids:', userBuildingIds);

        const [resBuildings, resRecords] = await Promise.all([
          axiosClient.get(`/buildings?di_id=${diId}`),
          axiosClient.get(`/building-records?di_id=${diId}`)
        ]);

        const buildingsRes = (resBuildings.data && resBuildings.data.length > 0)
          ? resBuildings.data
          : BUILDINGS;

        const buildingsData = buildingsRes.map(b => ({
          id: b.id,
          code: b.nomenklatur_bagi,
          name: b.nomenklatur_bagi,
          lokasi: b.lokasi,
          hm: b.hm,
          saluran: b.canal_id === 4 ? "kanan" : b.canal_id === 5 ? "kiri" : "",
          aliases: [b.nomenklatur_bagi],
          unit: "",
          posisi: [],
          canal_id: b.canal_id
        }));

        // Logic: Show buildings that are either assigned OR recorded by this user
        const currentAuth = getAuth() || auth || {};
        const myRecords = (resRecords.data || []).filter(r => String(r.user_id) === String(currentAuth?.id));
        const recordedIds = new Set(myRecords.map(r => String(r.building_id)));
        const assignedIds = Array.isArray(currentAuth?.building_ids)
          ? currentAuth.building_ids.map(String)
          : [];

        const unionIds = new Set([...assignedIds, ...recordedIds]);

        if (unionIds.size === 0) {
          console.log('[PetugasLayout] No buildings assigned or recorded -> showing none');
          setBuildings([]);
        } else {
          const filtered = buildingsData.filter(b => unionIds.has(String(b.id)));
          console.log('[PetugasLayout] Showing relevant buildings (assigned+recorded). Count:', filtered.length);
          setBuildings(filtered);
        }
      } catch (err) {
        console.error('[PetugasLayout] Failed to load buildings:', err);
        console.log('[PetugasLayout] Applying strict filter to mock data');

        const currentAuth = getAuth() || auth || {};
        const assignedIds = new Set((currentAuth?.building_ids || []).map(String));

        // In fallback, we might not have latest records, but we MUST still filter
        const filtered = BUILDINGS.filter(b => assignedIds.has(String(b.id)));
        setBuildings(filtered);
      }
    }
    loadBuildings();
  }, [auth?.di_id, auth?.building_ids]);

  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 768) setDrawerOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return buildings.filter((b) => {
      const okSaluran = saluran === "semua" || (b.saluran || "").toLowerCase() === saluran;
      const okSearch =
        !s ||
        (b.code || "").toLowerCase().includes(s) ||
        (b.name || "").toLowerCase().includes(s) ||
        (b.lokasi || "").toLowerCase().includes(s) ||
        (Array.isArray(b.aliases) && b.aliases.join(" ").toLowerCase().includes(s));
      return okSaluran && okSearch;
    });
  }, [buildings, saluran, q]);

  const listKanan = useMemo(() => list.filter((b) => (b.saluran || "") === "kanan"), [list]);
  const listKiri = useMemo(() => list.filter((b) => (b.saluran || "") === "kiri"), [list]);

  function Section({ title, tone = "red", items = [] }) {
    const headerBg = tone === "red" ? "bg-red-50 border-red-100" : "bg-sky-50 border-sky-100";
    const badgeBg = tone === "red" ? "bg-red-100 text-red-700" : "bg-sky-100 text-sky-700";
    return (
      <div>
        <div className={["mb-2 flex items-center justify-between rounded-md px-3 py-2 text-xs font-semibold", headerBg].join(" ")}>
          <div>{title}</div>
          <div className="text-[11px] text-slate-500">{items.length} items</div>
        </div>

        <div className="space-y-0.5">
          {items.map((b) => {
            const isActive = loc.pathname === `/petugas/bangunan/${b.id}`;
            return (
              <button
                key={b.id}
                onClick={() => nav(`/petugas/bangunan/${b.id}`)}
                className={`w-full border px-3 py-2 text-left flex items-start justify-between transition ${isActive
                  ? "bg-blue-50 border-blue-200 ring-1 ring-blue-200 z-10 rounded-xl mb-1"
                  : "border-slate-100 hover:bg-slate-50 rounded-none first:rounded-t-xl last:rounded-b-xl"
                  }`}
              >
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-slate-900">{b.code}</div>
                  <div className="text-[12px] text-slate-600">
                    {(b.aliases || []).map((a, i) => (
                      <div key={i} className="leading-tight">{a}</div>
                    ))}
                  </div>
                  <div className="text-xs text-slate-500">{b.lokasi}</div>
                </div>

                <div className="ml-3 flex flex-col items-end gap-1">
                  <div className="text-xs font-semibold text-slate-600">{b.hm}</div>
                  <div className="flex gap-1">
                    <div className={["rounded-full px-2 py-0.5 text-[11px] font-semibold", "bg-slate-100 text-slate-700"].join(" ")}>U{b.unit ?? "-"}</div>
                    {(b.posisi || []).map((p, i) => (
                      <div key={i} className={["rounded-full px-2 py-0.5 text-[11px] font-semibold", badgeBg].join(" ")}>{p}</div>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
          {items.length === 0 && <div className="p-3 text-sm text-slate-500">Tidak ada.</div>}
        </div>
      </div>
    );
  }

  function logout() {
    if (!confirm("Yakin keluar?")) return;
    localStorage.removeItem("apemasi_auth");
    window.dispatchEvent(new Event("authUpdated"));
    nav("/");
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* TOPBAR */}
      <header className="fixed left-0 right-0 top-0 z-50 h-16 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50"
              onClick={() => setDrawerOpen(true)}
              aria-label="Buka menu"
              title="Buka menu"
            >
              <IconMenu />
            </button>

            <img src={logo} alt="Logo APEMASI" className="h-10 w-10 rounded-2xl object-cover" />

            <div className="leading-tight">
              <div className="text-sm font-extrabold text-slate-900">APEMASI • Petugas</div>
              <div className="text-[11px] text-slate-500">Input & perhitungan bangunan</div>
            </div>
          </div>

          <Badge tone="info">PETUGAS</Badge>
        </div>
      </header>

      {/* SIDEBAR desktop (tema putih, mirip drawer) */}
      <aside
        className={[
          "hidden md:flex fixed left-0 top-16 bottom-0 z-40 bg-white text-slate-900 border-r border-slate-200",
          collapsed ? "w-[84px]" : "w-[330px]",
        ].join(" ")}
      >
        <div className="flex h-full w-full flex-col">
          {/* header */}
          <div className="flex items-center justify-between p-3 border-b border-slate-200">
            {!collapsed ? (
              <div>
                <div className="text-base font-extrabold text-slate-900">Panel Petugas</div>
                <div className="text-[11px] text-slate-500">Pilih bangunan & input data</div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-bold">MENU</div>
            )}

            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50"
              onClick={() => setCollapsed((v) => !v)}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <IconMenu />
            </button>
          </div>

          {!collapsed && (
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col p-3 space-y-3">
              {/* DASHBOARD PALING ATAS */}
              <button
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3"
                onClick={() => nav("/petugas")}
              >
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-700 text-white">
                  <IconHome />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-slate-900">Dashboard</div>
                  <div className="text-xs text-slate-500">Ringkasan & status input</div>
                </div>
              </button>

              {/* FILTERS */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <div>
                  <div className="text-xs font-semibold text-slate-600">Saluran</div>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    value={saluran}
                    onChange={(e) => setSaluran(e.target.value)}
                  >
                    <option value="semua">Semua Saluran</option>
                    <option value="kanan">Saluran Kanan</option>
                    <option value="kiri">Saluran Kiri</option>
                  </select>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-600">Cari bangunan</div>
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="B.ACN.1 / lokasi..."
                  />
                </div>
              </div>

              {/* LIST */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white flex flex-col flex-1 min-h-0">
                <div className="border-b border-slate-200 px-4 py-3">
                  <div className="text-xs font-semibold text-slate-600">Daftar bangunan</div>
                  <div className="text-[11px] text-slate-500">Klik untuk buka detail</div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
                  <Section title="SALURAN ARCA KANAN" tone="red" items={listKanan} />
                  <div className="my-3" />
                  <Section title="SALURAN ARCA KIRI" tone="blue" items={listKiri} />
                </div>
              </div>
            </div>
          )}

          {/* KELUAR PALING BAWAH (MERAH) */}
          <div className="mt-auto p-3 border-t border-slate-200">
            <button
              className={[
                "w-full rounded-2xl border border-red-200 bg-red-50 hover:bg-red-100",
                collapsed ? "p-3 grid place-items-center" : "px-4 py-3 flex items-center gap-3 text-left",
              ].join(" ")}
              onClick={logout}
              title="Keluar"
            >
              <IconLogout className="h-5 w-5 text-red-700" />
              {!collapsed && (
                <div>
                  <div className="text-sm font-extrabold text-red-700">Keluar</div>
                  <div className="text-xs text-red-600"></div>
                </div>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* CONTENT */}
      <main className={["pt-16", "md:ml-[330px]", collapsed ? "md:ml-[84px]" : "md:ml-[330px]"].join(" ")}>
        <div className="mx-auto max-w-[1600px] p-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 min-h-[calc(100vh-96px)]">
            <Outlet />
          </div>
        </div>
      </main>

      {/* MOBILE DRAWER */}
      {/* MOBILE DRAWER (tema putih + dashboard paling atas) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[999] md:hidden">
          {/* overlay */}
          <div
            className="absolute inset-0 bg-slate-900/30"
            onClick={() => setDrawerOpen(false)}
          />

          {/* panel */}
          <div className="absolute left-0 top-0 h-full w-[90%] max-w-[360px] bg-white shadow-2xl">
            {/* header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
              <div className="leading-tight">
                <div className="text-base font-extrabold text-slate-900">Panel Petugas</div>
                <div className="text-[11px] text-slate-500"></div>
              </div>

              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50"
                onClick={() => setDrawerOpen(false)}
                aria-label="Tutup"
                title="Tutup"
              >
                <IconClose className="h-5 w-5 text-slate-700" />
              </button>
            </div>

            {/* content */}
            <div className="p-3 space-y-3">
              {/* DASHBOARD PALING ATAS */}
              <button
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3"
                onClick={() => {
                  setDrawerOpen(false);
                  nav("/petugas");
                }}
              >
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-700 text-white font-extrabold">
                  <IconHome />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-slate-900">Dashboard</div>
                  <div className="text-xs text-slate-500">Ringkasan & status input</div>
                </div>
              </button>

              {/* FILTERS */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <div>
                  <div className="text-xs font-semibold text-slate-600">Saluran</div>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    value={saluran}
                    onChange={(e) => setSaluran(e.target.value)}
                  >
                    <option value="semua">Semua Saluran</option>
                    <option value="kanan">Saluran Kanan</option>
                    <option value="kiri">Saluran Kiri</option>
                  </select>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-600">Cari bangunan</div>
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="B.ACN.1 / lokasi..."
                  />
                </div>
              </div>

              {/* LIST */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-4 py-3">
                  <div className="text-xs font-semibold text-slate-600">Daftar bangunan</div>
                  <div className="text-[11px] text-slate-500">Tap untuk buka detail</div>
                </div>

                <div className="max-h-[52vh] overflow-auto px-3 py-3">
                  <div>
                    <div className="mb-2 flex items-center justify-between rounded-md px-3 py-2 text-xs font-semibold bg-red-50 border-red-100">
                      <div>SALURAN ARCA KANAN</div>
                      <div className="text-[11px] text-slate-500">{listKanan.length} items</div>
                    </div>

                    <div className="space-y-0.5">
                      {listKanan.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => {
                            setDrawerOpen(false);
                            nav(`/petugas/bangunan/${b.id}`);
                          }}
                          className="w-full border border-slate-100 px-3 py-2 text-left hover:bg-slate-50 flex items-start justify-between"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-extrabold text-slate-900">{b.code}</div>
                            <div className="text-[12px] text-slate-600">{(b.aliases || []).map((a, i) => (<div key={i}>{a}</div>))}</div>
                            <div className="text-xs text-slate-500">{b.lokasi}</div>
                          </div>

                          <div className="ml-3 flex flex-col items-end gap-1">
                            <div className="text-xs font-semibold text-slate-600">{b.hm}</div>
                            <div className="flex gap-1">
                              <div className="rounded-full px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700">U{b.unit ?? "-"}</div>
                              {(b.posisi || []).map((p, i) => (<div key={i} className="rounded-full px-2 py-0.5 text-[11px] font-semibold bg-red-100 text-red-700">{p}</div>))}
                            </div>
                          </div>
                        </button>
                      ))}
                      {listKanan.length === 0 && <div className="p-3 text-sm text-slate-500">Tidak ada.</div>}
                    </div>
                  </div>

                  <div className="my-3" />

                  <div>
                    <div className="mb-2 flex items-center justify-between rounded-md px-3 py-2 text-xs font-semibold bg-sky-50 border-sky-100">
                      <div>SALURAN ARCA KIRI</div>
                      <div className="text-[11px] text-slate-500">{listKiri.length} items</div>
                    </div>

                    <div className="space-y-0.5">
                      {listKiri.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => {
                            setDrawerOpen(false);
                            nav(`/petugas/bangunan/${b.id}`);
                          }}
                          className="w-full border border-slate-100 px-3 py-2 text-left hover:bg-slate-50 flex items-start justify-between"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-extrabold text-slate-900">{b.code}</div>
                            <div className="text-[12px] text-slate-600">{(b.aliases || []).map((a, i) => (<div key={i}>{a}</div>))}</div>
                            <div className="text-xs text-slate-500">{b.lokasi}</div>
                          </div>

                          <div className="ml-3 flex flex-col items-end gap-1">
                            <div className="text-xs font-semibold text-slate-600">{b.hm}</div>
                            <div className="flex gap-1">
                              <div className="rounded-full px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700">U{b.unit ?? "-"}</div>
                              {(b.posisi || []).map((p, i) => (<div key={i} className="rounded-full px-2 py-0.5 text-[11px] font-semibold bg-sky-100 text-sky-700">{p}</div>))}
                            </div>
                          </div>
                        </button>
                      ))}
                      {listKiri.length === 0 && <div className="p-3 text-sm text-slate-500">Tidak ada.</div>}
                    </div>
                  </div>
                </div>
              </div>

              {/* KELUAR PALING BAWAH */}
              <div className="pt-2">
                <button
                  className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left hover:bg-red-100 flex items-center gap-3"
                  onClick={() => {
                    setDrawerOpen(false);
                    logout();
                  }}
                >
                  <IconLogout className="h-5 w-5 text-red-700" />
                  <div>
                    <div className="text-sm font-extrabold text-red-700">Keluar</div>
                    <div className="text-xs text-red-600">Logout dari akun petugas</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}