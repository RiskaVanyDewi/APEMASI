import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import logo from "../../assets/logo.png";


/** ====== ICONS (SVG) ====== */
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
function IconUsers({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M16 21v-1.5a3.5 3.5 0 0 0-3.5-3.5h-1A3.5 3.5 0 0 0 8 19.5V21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="2" />
      <path d="M20 21v-2a3 3 0 0 0-2-2.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 3.2a4 4 0 0 1 0 7.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconLogout({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M10 17l-1 0a4 4 0 0 1-4-4V11a4 4 0 0 1 4-4h1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M14 7l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 12H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
import { getAuth } from "../../lib/auth";

export default function AdminLayout() {
  const auth = getAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 768) setDrawerOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const items = useMemo(
    () => [
      { label: "Dashboard", path: "/admin", icon: IconHome },
      { label: "Users", path: "/admin/users", icon: IconUsers },
    ],
    []
  );

  function logout() {
    if (!confirm("Yakin keluar?")) return;
    localStorage.removeItem("apemasi_auth");
    window.dispatchEvent(new Event("authUpdated"));
    nav("/");
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* TOPBAR fixed (tema petugas: logo biru) */}
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
              <div className="text-sm font-extrabold text-slate-900">APEMASI • Admin</div>
              <div className="text-[11px] text-slate-500">Manajemen & monitoring</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-extrabold text-slate-900">{auth?.name || "Admin"}</div>
              <div className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">
                {auth?.di_name || "Dashboard"}
              </div>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
              ADMIN
            </span>
          </div>
        </div>
      </header>

      {/* SIDEBAR desktop (tema terang seperti petugas) */}
      <aside
        className={[
          "hidden md:flex fixed left-0 top-16 bottom-0 z-40 bg-white text-slate-900 border-r border-slate-200",
          collapsed ? "w-[84px]" : "w-[280px]",
        ].join(" ")}
      >
        <div className="flex h-full w-full flex-col">
          <div className="flex items-center justify-between p-3 border-b border-slate-200">
            {!collapsed ? (
              <div>
                <div className="text-sm font-extrabold text-slate-900">Menu</div>
                <div className="text-[11px] text-slate-500">Navigasi admin</div>
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

          <nav className="p-3 space-y-1">
            {items.map((it) => (
              <SideItem
                key={it.path}
                collapsed={collapsed}
                active={loc.pathname === it.path}
                label={it.label}
                Icon={it.icon}
                onClick={() => nav(it.path)}
              />
            ))}
          </nav>

          {/* KELUAR DI PALING BAWAH */}
          <div className="mt-auto p-3 border-t border-slate-200">
            <button
              className={[
                "w-full rounded-xl border border-slate-200 hover:bg-slate-50",
                collapsed ? "p-3 grid place-items-center" : "px-3 py-3 flex items-center gap-3",
              ].join(" ")}
              onClick={logout}
              title="Keluar"
            >
              <IconLogout />
              {!collapsed && <span className="text-sm font-semibold">Keluar</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* CONTENT */}
      <main className={["pt-16", collapsed ? "md:ml-[84px]" : "md:ml-[280px]"].join(" ")}>
        <div className="mx-auto max-w-[1600px] p-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 min-h-[calc(100vh-96px)]">
            <Outlet />
          </div>
        </div>
      </main>

      {/* MOBILE DRAWER (tema terang) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[999] md:hidden">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[86%] max-w-[320px] bg-white text-slate-900 shadow-2xl">
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <img src={logo} alt="Logo APEMASI" className="h-10 w-10 rounded-2xl object-cover" />
                <div className="leading-tight">
                  <div className="text-sm font-extrabold">APEMASI</div>
                  <div className="text-[11px] text-slate-500">Admin</div>
                </div>
              </div>

              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50"
                onClick={() => setDrawerOpen(false)}
                aria-label="Tutup"
                title="Tutup"
              >
                <IconClose />
              </button>
            </div>

            <nav className="p-3 space-y-1">
              {items.map((it) => (
                <SideItem
                  key={it.path}
                  collapsed={false}
                  active={loc.pathname === it.path}
                  label={it.label}
                  Icon={it.icon}
                  onClick={() => {
                    setDrawerOpen(false);
                    nav(it.path);
                  }}
                />
              ))}
            </nav>

            <div className="mt-auto p-3 border-t border-slate-200">
              <button
                className="w-full rounded-xl border border-slate-200 hover:bg-slate-50 px-3 py-3 flex items-center gap-3"
                onClick={() => {
                  setDrawerOpen(false);
                  logout();
                }}
              >
                <IconLogout />
                <span className="text-sm font-semibold">Keluar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SideItem({ collapsed, active, label, Icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full rounded-xl transition border",
        active
          ? "bg-blue-50 border-blue-100 text-blue-800"
          : "bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-200 text-slate-900",
        collapsed ? "p-3 grid place-items-center" : "px-3 py-3 flex items-center gap-3",
      ].join(" ")}
      title={label}
    >
      <Icon />
      {!collapsed && <span className="text-sm font-semibold">{label}</span>}
    </button>
  );
}