import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BUILDINGS } from "../lib/mockData";
import { getAuth, clearAuth } from "../lib/auth";
import { Button } from "./ui";
import { ChevronDown, LogOut, MapPin } from "lucide-react";
import logo from "../assets/logo.png";

export default function Topbar({ onPick, buildings = [], q = "", setQ }) {
  const nav = useNavigate();
  const [auth, setAuth] = useState(getAuth());

  useEffect(() => {
    const handleAuthUpdated = () => setAuth(getAuth());
    window.addEventListener("authUpdated", handleAuthUpdated);
    return () => window.removeEventListener("authUpdated", handleAuthUpdated);
  }, []);

  const [openSug, setOpenSug] = useState(false);
  const [openLogin, setOpenLogin] = useState(false);

  // Use buildings from prop if provided, fallback to BUILDINGS
  const buildingsList = buildings.length > 0 ? buildings : BUILDINGS;

  const suggestions = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return buildingsList
      .filter(b => b.lat != null && b.lng != null) // Only suggest items with coordinates
      .filter(
        (b) =>
          (b.code || "").toLowerCase().includes(s) ||
          (b.name || "").toLowerCase().includes(s) ||
          (b.lokasi || "").toLowerCase().includes(s)
      ).slice(0, 7);
  }, [q, buildingsList]);

  return (
    <div className="w-full border-b border-slate-200 bg-white">
      {/* wrapper responsive */}
      <div className="mx-auto max-w-[1400px] px-3 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          {/* Brand (lebih gede) */}
          <button
            onClick={() => nav("/")}
            className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-slate-50"
          >
            <img
  src={logo}
  alt="Logo APEMASI"
  className="h-12 w-12 object-contain"
/>
            <div className="text-left leading-tight">
              <div className="text-base font-extrabold text-slate-900 md:text-lg">APEMASI</div>
              <div className="text-[12px] text-slate-500 md:text-[13px]">
                Balai PSDA Serayu Bogowonto
              </div>
            </div>
          </button>

          {/* Search (fix HP: full width & kebaca) */}
          <div className="relative w-full md:flex-1">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:ring-2 focus-within:ring-blue-200">
              <MapPin size={18} className="text-slate-500 shrink-0" />
              <input
                className="w-full bg-transparent text-[15px] outline-none md:text-[16px]"
                placeholder="Cari bangunan (contoh: B.ACN.1 / Arcawinangun)…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setOpenSug(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && suggestions.length > 0) {
                    onPick?.(suggestions[0]);
                    setOpenSug(false);
                    setQ("");
                  }
                }}
                onFocus={() => setOpenSug(true)}
                onBlur={() => setTimeout(() => setOpenSug(false), 200)}
              />
            </div>

            {openSug && suggestions.length > 0 && (
              <div className="absolute mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg z-[999]">
                {suggestions.map((b) => (
                  <button
                    key={b.id}
                    onMouseDown={(e) => {
                      // Prevent onBlur from firing before this interaction
                      e.preventDefault();
                    }}
                    onClick={() => {
                      setQ("");
                      setOpenSug(false);
                      onPick?.(b);
                    }}
                    className="flex w-full items-center justify-between px-3 py-3 text-left hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{b.code}</div>
                      <div className="text-xs text-slate-500 truncate">
                        {b.lokasi} • Saluran {b.saluran}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 shrink-0">{b.hm}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right */}
          {!auth ? (
            <div className="relative md:shrink-0">
              <Button
                variant="secondary"
                className="gap-2 px-5 py-3 w-full md:w-auto"
                onClick={() => setOpenLogin((v) => !v)}
              >
                Login <ChevronDown size={16} />
              </Button>

              {openLogin && (
                <div className="absolute right-0 mt-2 w-full md:w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg z-[999]">
                  <button
                    onClick={() => nav("/login?role=petugas")}
                    className="w-full px-3 py-3 text-left hover:bg-slate-50"
                  >
                    Petugas
                  </button>
                  <button
                    onClick={() => nav("/login?role=admin")}
                    className="w-full px-3 py-3 text-left hover:bg-slate-50"
                  >
                    Admin
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 md:shrink-0">
              {auth.role === "petugas" && <Button variant="secondary" onClick={() => nav("/petugas")}>Dashboard</Button>}
              {auth.role === "admin" && <Button variant="secondary" onClick={() => nav("/admin")}>Admin</Button>}

              <Button
                variant="ghost"
                className="gap-2"
                onClick={() => {
                  clearAuth();
                  window.dispatchEvent(new Event("authUpdated"));
                  nav("/");
                }}
              >
                <LogOut size={16} /> Keluar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}