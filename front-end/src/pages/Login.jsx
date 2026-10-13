import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardHeader, CardContent, Button, Input, Select, Badge } from "../components/ui";
import { setAuth } from "../lib/auth";
import logo from "../assets/logo.png";

import axiosClient from "../lib/axios";

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation();
  const [params] = useSearchParams();
  const roleParam = params.get("role") || "petugas";
  const isLocked = !!params.get("role");

  const [role, setRole] = useState(roleParam);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [daerah, setDaerah] = useState("");
  const [daerahOptions, setDaerahOptions] = useState([]);
  const [diLoading, setDiLoading] = useState(true);
  const [openDaerah, setOpenDaerah] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");

  // Sync role with URL query param
  useMemo(() => {
    if (roleParam && roleParam !== role) {
      setRole(roleParam);
    }
  }, [roleParam]);

  const redirectTo = useMemo(
    () => loc.state?.from || (role === "admin" ? "/admin" : "/petugas"),
    [loc.state, role]
  );

  useEffect(() => {
    async function fetchDiOptions() {
      try {
        const response = await axiosClient.get('/daerah-irigasi');
        const options = Array.isArray(response.data) ? response.data : [];
        setDaerahOptions(options);
        if (options.length > 0) {
          setDaerah(options[0].id);
        }
      } catch (error) {
        console.error('[Login] Gagal ambil daftar Daerah Irigasi:', error);
      } finally {
        setDiLoading(false);
      }
    }

    fetchDiOptions();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setErr("");

    if (!role) return setErr("Role wajib dipilih.");
    if (!username || !password) return setErr("Username & password wajib diisi.");
    if (!daerah) return setErr("Daerah Irigasi wajib dipilih.");

    try {
      const response = await axiosClient.post('/login', {
        username: username,
        password: password,
        role: role,
        di_id: daerah,
      });

      const { user, token } = response.data;
      const normalizedRole = String(user.role || "").toLowerCase().trim();

      const diId = user.di_id || daerah;
      const diName = user.di_name || daerahOptions.find(d => String(d.id) === String(diId))?.name || "Daerah Irigasi";

      setAuth({
        role: normalizedRole,
        username: user.username,
        name: user.name,
        token: token,
        di_id: diId,
        di_name: diName,
        building_ids: user.building_ids || [],
        id: user.id
      });
      window.dispatchEvent(new Event("authUpdated"));

      nav(redirectTo, { replace: true });
    } catch (error) {
      console.error(error);
      setErr(error.response?.data?.message || "Login gagal. Periksa username & password.");
    }
  }

  // Theme colors based on role
  const isAlt = role === 'admin';
  const themeClass = isAlt ? 'amber' : 'blue';
  const primaryGradient = isAlt ? 'from-amber-500 to-amber-600' : 'from-blue-600 to-blue-700';
  const accentColor = isAlt ? 'text-amber-600' : 'text-blue-700';
  const bgColor = isAlt ? 'bg-amber-400/20' : 'bg-blue-400/20';
  const shadowColor = isAlt ? 'hover:shadow-amber-500/25' : 'hover:shadow-blue-500/25';

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#f8fafc] flex items-center justify-center p-4">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className={`absolute top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full ${bgColor} blur-[120px] animate-pulse transition-colors duration-700`} />
        <div className={`absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full ${isAlt ? 'bg-orange-400/20' : 'bg-sky-400/20'} blur-[120px] animation-delay-2000 transition-colors duration-700`} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full bg-slate-500/5 blur-[160px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm animate-in fade-in zoom-in duration-500">
        {/* Branding Section */}
        <div className="mb-6 text-center">
          <div className="flex justify-center">
  <img
    src={logo}
    alt="Logo APEMASI"
    className="h-24 w-24 object-contain drop-shadow-xl"
  />
</div>
          <p className="mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
            Balai PSDA Serayu Bogowonto
          </p>
        </div>

        {/* Login Card */}
        <div className="overflow-hidden rounded-[2rem] border border-white/40 bg-white/70 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.1)] backdrop-blur-xl ring-1 ring-slate-900/5">
          <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100/60">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Masuk ke Sistem</h2>
                <p className="text-[10px] font-medium text-slate-500 mt-0.5">Silakan gunakan akun Anda</p>
              </div>
              <div className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider transition-colors duration-500 ${isAlt ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                {role}
              </div>
            </div>
          </div>

          <div className="p-6">
            <form onSubmit={submit} className="space-y-4">
              {/* Role Selection Tabs */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pilih Jabatan</label>
                  {isLocked && (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                      <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 17a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M18 10V7a6 6 0 10-12 0v3H5a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2v-8a2 2 0 00-2-2h-1zM7 10V7a5 5 0 0110 0v3H7z" clipRule="evenodd" />
                      </svg>
                      Terkunci
                    </span>
                  )}
                </div>
                <div className={`grid grid-cols-2 gap-1 rounded-xl p-0.5 ring-1 ring-slate-200/50 ${isLocked ? 'bg-slate-200/50 cursor-not-allowed' : 'bg-slate-100/80'}`}>
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => { setRole('petugas'); nav({ search: '?role=petugas' }, { replace: true }); }}
                    className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${role === 'petugas' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'} ${isLocked && role !== 'petugas' ? 'opacity-40 grayscale' : ''}`}
                  >
                    Petugas OP
                  </button>
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => { setRole('admin'); nav({ search: '?role=admin' }, { replace: true }); }}
                    className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${role === 'admin' ? 'bg-white text-amber-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'} ${isLocked && role !== 'admin' ? 'opacity-40 grayscale' : ''}`}
                  >
                    Admin DI
                  </button>
                </div>
              </div>

              {/* Daerah Irigasi Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Daerah Irigasi</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenDaerah(!openDaerah)}
                    className={`flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white/50 px-3.5 py-2.5 text-xs font-semibold transition-all hover:bg-white focus:ring-4 active:scale-[0.99] ${isAlt ? 'hover:border-amber-300 focus:ring-amber-500/10' : 'hover:border-blue-300 focus:ring-blue-500/10'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`h-1.5 w-1.5 rounded-full transition-colors ${isAlt ? 'bg-amber-500' : 'bg-blue-500'}`} />
                      <span className="truncate">{daerahOptions.find((d) => String(d.id) === String(daerah))?.name || "Pilih Daerah Irigasi"}</span>
                    </div>
                    <svg className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-300 ${openDaerah ? "rotate-90" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {openDaerah && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenDaerah(false)} />
                      <div className="absolute left-0 right-0 z-50 mt-2 max-h-52 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="mb-1 p-1">
                          <input
                            type="text"
                            autoFocus
                            placeholder="Cari daerah..."
                            className={`w-full rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium outline-none border border-slate-100 focus:border-${themeClass}-400`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                        <div className="overflow-auto max-h-[160px] space-y-0.5">
                          {daerahOptions.filter((d) => d.name.toLowerCase().includes(searchTerm.toLowerCase())).map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors ${String(daerah) === String(d.id) ? `bg-${themeClass}-50 text-${themeClass}-700` : `text-slate-600 hover:bg-slate-50 hover:text-${themeClass}-600`}`}
                              onClick={() => { setDaerah(d.id); setOpenDaerah(false); setSearchTerm(""); }}
                            >
                              <div className={`h-1 w-1 rounded-full ${daerah === d.id ? `bg-${themeClass}-500` : "bg-transparent"}`} />
                              {d.name}
                            </button>
                          ))}
                          {daerahOptions.length === 0 && !diLoading && (
                            <div className="px-3 py-2 text-xs text-slate-500">Daerah Irigasi tidak tersedia.</div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Username</label>
                <div className="group relative">
                  <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:${accentColor}`}>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    className={`w-full rounded-xl border border-slate-200 bg-white/50 py-2.5 pl-10 pr-4 text-xs font-semibold shadow-sm transition-all outline-none focus:bg-white focus:ring-4 focus:ring-${themeClass}-500/5 placeholder:text-slate-300 focus:border-${themeClass}-400`}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Password</label>
                <div className="group relative">
                  <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:${accentColor}`}>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Kata sandi"
                    className={`w-full rounded-xl border border-slate-200 bg-white/50 py-2.5 pl-10 pr-10 text-xs font-semibold shadow-sm transition-all outline-none focus:bg-white focus:ring-4 focus:ring-${themeClass}-500/5 placeholder:text-slate-300 focus:border-${themeClass}-400`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.076m1.406-1.407A10.014 10.014 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21m-4.228-4.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {err && (
                <div className="flex animate-in fade-in slide-in-from-top-1 items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 p-3 text-[10px] font-bold text-red-700 leading-tight shadow-sm">
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  {err}
                </div>
              )}

              <div className="pt-1">
                <button
                  type="submit"
                  className="w-full relative group"
                >
                  <div className={`absolute inset-0 rounded-xl ${isAlt ? 'bg-amber-600' : 'bg-blue-600'} blur transition-all group-hover:blur-md opacity-40`} />
                  <div className={`relative flex h-11 items-center justify-center rounded-xl bg-gradient-to-r ${primaryGradient} font-bold text-sm text-white shadow-lg transition-all hover:translate-y-[-1px] hover:shadow-xl ${shadowColor} active:translate-y-[0.5px] active:scale-[0.99]`}>
                    Masuk Sekarang
                  </div>
                </button>
              </div>

              <button
                type="button"
                onClick={() => nav("/")}
                className="w-full h-8 flex items-center justify-center text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                ← Kembali ke Peta
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] opacity-80">
            &copy; 2026 APEMASI • SISTEM PEMANTAUAN IRIGASI
          </p>
        </div>
      </div>
    </div>
  );
}