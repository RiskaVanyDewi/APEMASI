import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, Button, Input, Badge } from "../../components/ui";
import { BUILDINGS } from "../../lib/mockData";
import axiosClient from "../../lib/axios";

/** ======================
 * LocalStorage Helpers
 * ====================== */
const LS_USERS = "apemasi_users";
const LS_SYNCED_USERS = "apemasi_synced_users"; // Track user IDs yang sudah disync ke DB

function loadUsers() {
  try {
    const raw = localStorage.getItem(LS_USERS);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveUsers(users) {
  localStorage.setItem(LS_USERS, JSON.stringify(users));
}

function loadSyncedUsers() {
  try {
    const raw = localStorage.getItem(LS_SYNCED_USERS);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveSyncedUsers(syncedSet) {
  localStorage.setItem(LS_SYNCED_USERS, JSON.stringify(Array.from(syncedSet)));
}

/** ======================
 * Options
 * ====================== */
const SALURAN_OPTIONS = [
  { value: "kanan", label: "Saluran Kanan" },
  { value: "kiri", label: "Saluran Kiri" },
];

function roleTitle(type) {
  return type === "pengelola" ? "Pengelola DI (Admin)" : "Petugas OP";
}

/** ======================
 * AdminUsers
 * ====================== */
export default function AdminUsers() {
  const [users, setUsers] = useState(() => {
    const saved = loadUsers();
    if (saved && Array.isArray(saved) && saved.length) return saved;

    // default seed
    return [
      {
        id: 1,
        type: "petugas",
        username: "yadi.karno",
        password: "123",
        nama: "Yadi Karno",
        noHp: "08xxxxxxxxxx",
        jabatan: "Petugas OP",
        saluran: ["kanan"],
        hmAwal: "03+90",
        hmAkhir: "02+00",
        buildingIds: [],
        di_id: 2, // ✅ DI yang dipilih
        _synced: false, // Track sync status
      },
      {
        id: 2,
        type: "petugas",
        username: "rockhyat",
        password: "123",
        nama: "Rockhyat",
        noHp: "08xxxxxxxxxx",
        jabatan: "Petugas OP",
        saluran: ["kiri"],
        hmAwal: "02+00",
        hmAkhir: "17+00",
        buildingIds: [],
        di_id: 2, // ✅ DI yang dipilih
        _synced: false, // Track sync status
      },
      {
        id: 3,
        type: "pengelola",
        // ✅ pengelola TIDAK login, jadi ga perlu username/password
        username: "",
        password: "",
        nama: "Admin DI",
        noHp: "",
        jabatan: "Pengelola DI (Admin)",
        saluran: ["kanan", "kiri"],
        hmAwal: "",
        hmAkhir: "",
        buildingIds: [],
        di_id: null,
        _synced: true, // Pengelola tidak perlu sync
      },
    ];
  });

  const [daerahOptions, setDaerahOptions] = useState([{ id: 2, name: "DI. Kedunglimus Arca" }]);
  const [defaultDiId, setDefaultDiId] = useState(2);

  useEffect(() => {
    async function fetchDaerahIrigasi() {
      try {
        const res = await axiosClient.get('/daerah-irigasi');
        const data = Array.isArray(res.data) ? res.data : [];
        if (data.length > 0) {
          setDaerahOptions(data);
          setDefaultDiId(data[0].id);
        }
      } catch (err) {
        console.error('[AdminUsers] Gagal ambil daftar Daerah Irigasi:', err);
      }
    }

    fetchDaerahIrigasi();
  }, []);

  useEffect(() => {
    saveUsers(users);
  }, [users]);
  // ✅ FETCH USERS FROM DATABASE (ekstrak jadi fungsi supaya bisa dipanggil ulang)
  async function fetchFromDB() {
    try {
      const res = await axiosClient.get('/users');
      const dbUsers = res.data?.users || [];

      setUsers(prev => {
        // Merge logic: Prioritize DB users, keep local-only fields if they match
        let merged = [...prev];

        dbUsers.forEach(dbU => {
          const idx = merged.findIndex(u => {
            if (u.username && dbU.username && String(u.username) === String(dbU.username)) return true;
            if (!u.username && u.type === 'pengelola' && dbU.role === 'admin') return true;
            return false;
          });
          const existingUser = idx >= 0 ? merged[idx] : null;
          const dbBuildingIds = Array.isArray(dbU.building_ids) ? dbU.building_ids.map(String) : null;
          const buildingIds = (() => {
            if (dbBuildingIds === null) return existingUser?.buildingIds || [];
            if (dbBuildingIds.length === 0 && existingUser?.buildingIds?.length > 0 && existingUser?._synced === false) {
              return existingUser.buildingIds;
            }
            return dbBuildingIds;
          })();
          const userObj = {
            id: dbU.id,
            type: dbU.role === 'admin' ? 'pengelola' : 'petugas',
            username: dbU.username,
            nama: dbU.name,
            di_id: dbU.di_id ?? existingUser?.di_id ?? null,
            buildingIds,
            _dbOnly: false,
            _synced: true,
          };

          if (idx >= 0) {
            // Update existing local user with DB data while preserving local-only fields
            merged[idx] = { ...merged[idx], ...userObj };
          } else {
            // Add new DB user to local list
            merged.push({
              ...userObj,
              password: "", // We don't have password from GET /api/users
              noHp: existingUser?.noHp || "",
              jabatan: existingUser?.jabatan || (userObj.type === 'pengelola' ? "Pengelola DI (Admin)" : "Petugas OP"),
              saluran: existingUser?.saluran || [],
              hmAwal: existingUser?.hmAwal || "",
              hmAkhir: existingUser?.hmAkhir || "",
            });
          }
        });

        const hasDbAdmin = dbUsers.some((dbU) => dbU.role === 'admin');
        if (hasDbAdmin) {
          // Remove any local default pengelola/admin placeholder if DB admin exists
          merged = merged.filter((u) => !(u.type === 'pengelola' && !u.username));
        }

        return merged;
      });
    } catch (err) {
      console.error("[AdminUsers] Failed to fetch users from DB:", err);
    }
  }

  useEffect(() => {
    fetchFromDB();
  }, []);

  // ✅ AUTO-SYNC: Sinkronkan HANYA petugas yang belum disync
  useEffect(() => {
    const syncToDB = async () => {
      const syncedUserIds = loadSyncedUsers();
      const shouldSync = users.filter(
        u => u.type === "petugas" && u.username && u.password && !syncedUserIds.has(String(u.id)) && !u.id.toString().startsWith('db-')
      );

      if (shouldSync.length === 0) return; // Tidak ada yang perlu disync

      for (const u of shouldSync) {
        try {
          console.log(`[AdminUsers] Syncing petugas: ${u.username}`);
          await axiosClient.post('/users', {
            username: u.username,
            password: u.password,
            name: u.nama,
            role: 'petugas',
            di_id: u.di_id || null, // ✅ Kirim di_id
            building_ids: (u.buildingIds || []), // ✅ Kirim building_ids apa adanya (string/integer)
          });

          // Tandai sebagai sudah disync
          syncedUserIds.add(String(u.id));
          console.log(`✅ Petugas "${u.username}" berhasil disync ke database`);
          // Notify other pages (petugas) to refresh auth/data
          try { window.dispatchEvent(new Event('usersUpdated')); } catch (e) { /* ignore */ }
        } catch (err) {
          console.warn(`⚠️ Sync "${u.username}" gagal:`, err.message);
          // Tidak perlu alert, ini background sync
        }
      }

      // Simpan perubahan sync status
      if (syncedUserIds.size > 0) {
        saveSyncedUsers(syncedUserIds);
      }
    };

    // Delay 1000ms untuk batch sync
    const timer = setTimeout(syncToDB, 1000);
    return () => clearTimeout(timer);
  }, [users]);

  const [q, setQ] = useState("");

  // Modal view buildings
  const [viewUser, setViewUser] = useState(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;

    return users.filter((u) => {
      const username = (u.username || "").toLowerCase();
      const nama = (u.nama || "").toLowerCase();
      const noHp = (u.noHp || "").toLowerCase();
      const jabatan = (u.jabatan || "").toLowerCase();

      return username.includes(s) || nama.includes(s) || noHp.includes(s) || jabatan.includes(s);
    });
  }, [users, q]);

  /** Modal add */
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("petugas"); // "petugas" | "pengelola"
  const [editingUserId, setEditingUserId] = useState(null);
  const [form, setForm] = useState(makeEmpty("petugas"));

  function makeEmpty(type) {
    return {
      type,
      // ✅ untuk pengelola, boleh kosong
      username: "",
      password: "",
      nama: "",
      noHp: "",
      jabatan: roleTitle(type),
      saluran: [],
      hmAwal: "",
      hmAkhir: "",
      buildingIds: [],
      di_id: defaultDiId,
      _synced: false,
    };
  }

  async function openAdd(type) {
    setMode(type);
    setEditingUserId(null);
    setForm(makeEmpty(type));
    // Pastikan data users terbaru dari server sebelum membuka modal
    try { await fetchFromDB(); } catch (e) { /* ignore */ }
    setOpen(true);
    setQBangunan("");
  }

  async function openEdit(user) {
    setMode(user.type);
    setEditingUserId(user.id);
    setForm({
      type: user.type,
      username: user.username || "",
      password: "",
      nama: user.nama || "",
      noHp: user.noHp || "",
      jabatan: user.jabatan || roleTitle(user.type),
      saluran: Array.isArray(user.saluran) ? user.saluran : [],
      hmAwal: user.hmAwal || "",
      hmAkhir: user.hmAkhir || "",
      buildingIds: Array.isArray(user.buildingIds) ? user.buildingIds : [],
      di_id: user.di_id || 2,
      _synced: user._synced || false,
    });
    // Refetch users supaya daftar bangunan yang terassign tercermin
    try { await fetchFromDB(); } catch (e) { /* ignore */ }
    setOpen(true);
    setQBangunan("");
  }

  function toggleSaluran(value) {
    setForm((prev) => {
      const set = new Set(prev.saluran || []);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      return { ...prev, saluran: Array.from(set) };
    });
  }

  /** Assign bangunan */
  const [qBangunan, setQBangunan] = useState("");
  const [apiBuildings, setApiBuildings] = useState([]);

  useEffect(() => {
    async function fetchApiBuildings() {
      try {
        const diId = open ? form.di_id || 2 : viewUser?.di_id || form.di_id || 2;
        if (!diId) return;
        const res = await axiosClient.get(`/buildings?di_id=${diId}`);
        setApiBuildings(res.data || []);
      } catch (err) {
        console.error("Failed to fetch buildings for assignment:", err);
      }
    }
    if (open || viewUser) fetchApiBuildings();
  }, [open, form.di_id, viewUser?.di_id, viewUser]);

  const buildingList = useMemo(() => {
    const s = qBangunan.trim().toLowerCase();
    const sal = new Set(form.saluran || []);

    // Bangunan yang sudah ditugaskan ke user lain tidak boleh muncul di pilihan.
    const assigned = new Set();
    users.forEach((u) => {
      // skip current editing user so their existing assignments remain visible
      if (editingUserId && String(u.id) === String(editingUserId)) return;
      (u.buildingIds || []).forEach((bid) => assigned.add(String(bid)));
    });
    const visible = [];
    let hiddenCount = 0;

    for (const b of apiBuildings) {
      if (assigned.has(String(b.id))) {
        hiddenCount++;
        continue;
      }

      // b.canal_id: 4=kanan, 5=kiri
      const bSaluran = b.canal_id === 4 ? "kanan" : b.canal_id === 5 ? "kiri" : "";
      if (sal.size > 0 && bSaluran && !sal.has(bSaluran)) continue;

      if (s) {
        const match = (
          String(b.nomenklatur_bagi || "").toLowerCase().includes(s) ||
          String(b.lokasi || "").toLowerCase().includes(s) ||
          String(b.hm || "").toLowerCase().includes(s)
        );
        if (!match) continue;
      }

      visible.push({
        id: b.id,
        code: b.nomenklatur_bagi,
        lokasi: b.lokasi,
        hm: b.hm,
        saluran: bSaluran,
      });
      if (visible.length >= 100) break;
    }

    return { list: visible, hiddenCount };
  }, [qBangunan, form.saluran, apiBuildings, users, editingUserId]);

  function toggleBuildingId(buildingId) {
    setForm((prev) => {
      const set = new Set(prev.buildingIds || []);
      const id = String(buildingId);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, buildingIds: Array.from(set) };
    });
  }

  function addUser() {
    const isPengelola = form.type === "pengelola";

    // ✅ petugas wajib username, password hanya wajib jika menambah user baru
    if (!isPengelola) {
      if (!form.username) return alert("Username wajib diisi (untuk Petugas).");
      if (!editingUserId && !form.password) return alert("Password wajib diisi untuk Petugas baru.");
      if (!form.di_id) return alert("Pilih Daerah Irigasi (DI) untuk petugas.");
    }

    if (!form.nama) return alert("Nama wajib diisi.");
    if (!form.saluran || form.saluran.length === 0) return alert("Pilih minimal 1 saluran (kanan/kiri).");

    // ✅ cek duplicate username hanya kalau petugas (atau kalau pengelola kamu isi username)
    const uName = String(form.username || "").trim();
    if (!isPengelola && uName) {
      const exists = users.some((u) => u.id !== editingUserId && String(u.username || "").trim() === uName);
      if (exists) return alert("Username sudah dipakai.");
    }

    // Simpan: pengelola username/password dipaksa kosong biar bersih
    const payload = {
      ...form,
      username: isPengelola ? "" : form.username,
      password: isPengelola ? "" : form.password,
      _synced: false, // Mark as not synced
    };

    const tempId = editingUserId || Date.now();
    if (editingUserId) {
      setUsers((prev) => prev.map((user) => (user.id === editingUserId ? { ...user, ...payload, _synced: false } : user)));
    } else {
      setUsers((prev) => [...prev, { id: tempId, ...payload }]);
    }

    // ✅ Sync petugas ke database (hanya petugas yang bisa login)
    if (!isPengelola && form.username) {
      const userData = {
        username: form.username.trim(),
        password: form.password ? form.password.trim() : undefined,
        name: form.nama.trim(),
        role: 'petugas',
        di_id: form.di_id || null, // ✅ Kirim DI ID
        building_ids: (form.buildingIds || []), // ✅ Kirim daftar bangunan apa adanya
      };

      console.log('[AdminUsers] Sending to API:', userData);

      axiosClient.post('/users', userData)
        .then(res => {
          console.log('✅ Petugas berhasil disimpan ke database:', res.data);

          setUsers((prev) => prev.map((user) => {
            if (user.id === tempId || user.id === editingUserId) {
              return {
                ...user,
                id: res.data.user.id,
                _synced: true,
                _dbOnly: false,
              };
            }
            return user;
          }));

          // Tandai user sebagai sudah disync
          const syncedUserIds = loadSyncedUsers();
          if (res.data.user?.id) {
            syncedUserIds.add(String(res.data.user.id));
          }
          saveSyncedUsers(syncedUserIds);
          // Notify other pages (petugas) to refresh auth/data
          try { window.dispatchEvent(new Event('usersUpdated')); } catch (e) { /* ignore */ }

          const diName = daerahOptions.find(d => String(d.id) === String(form.di_id))?.name || "DI";
          const buildingCount = (form.buildingIds || []).length;
          const buildingInfo = buildingCount > 0 ? `\n\nBangunan yang ditambahkan: ${buildingCount}` : "";
          const action = editingUserId ? 'diperbarui' : 'ditambahkan';
          const passwordInfo = editingUserId ? '' : `\n\nSekarang bisa login dengan:\nUsername: ${form.username}\nPassword: ${form.password}`;
          alert(`✅ Petugas "${form.nama}" berhasil ${action} ke ${diName}!${buildingInfo}${passwordInfo}`);
        })
        .catch(err => {
          console.error('❌ Error response:', err.response);
          console.error('❌ Error message:', err.message);
          const errorMsg = err.response?.data?.message || err.response?.data?.errors?.[Object.keys(err.response?.data?.errors || {})[0]]?.[0] || err.message || 'Unknown error';
          alert(`⚠️ Petugas disimpan lokal, tapi gagal sync ke database.\n\nError: ${errorMsg}\n\nBuka DevTools (F12) untuk detail lebih lanjut.`);
        });
    }

    setOpen(false);
    setEditingUserId(null);
    setQBangunan("");
  }

  async function removeUser(id) {
    const u = users.find((x) => x.id === id);
    if (!u) return;
    if (!confirm(`Hapus user "${u.nama || u.username || "user"}"?`)) return;

    if (u._synced && u.username) {
      try {
        await axiosClient.delete(`/users/${id}`);
      } catch (err) {
        console.error('[AdminUsers] Gagal hapus user di server:', err);
        return alert('Gagal menghapus user di database. Coba lagi.');
      }
    }

    setUsers((x) => x.filter((y) => y.id !== id));

    const syncedUserIds = loadSyncedUsers();
    syncedUserIds.delete(String(id));
    saveSyncedUsers(syncedUserIds);
  }

  const countPetugas = users.filter((u) => u.type === "petugas").length;
  const countPengelola = users.filter((u) => u.type === "pengelola").length;

  return (
    <div className="space-y-4">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-extrabold text-slate-900">Manajemen Pengguna</h1>
              <p className="mt-1 text-sm text-slate-600">
                Kelola Petugas OP & Pengelola DI.
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1">Petugas: {countPetugas}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">Pengelola: {countPengelola}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">Total: {users.length}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / username / jabatan..." />
              <Button onClick={() => openAdd("petugas")}>Tambah Petugas</Button>
              <Button variant="secondary" onClick={() => openAdd("pengelola")}>
                Tambah Pengelola
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              Tidak ada user.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filtered.map((u) => (
                <UserCard
                  key={u.id}
                  u={u}
                  daerahOptions={daerahOptions}
                  onDelete={() => removeUser(u.id)}
                  onView={() => setViewUser(u)}
                  onEdit={() => openEdit(u)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL TAMBAH */}
      {open && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl bg-white">
            <Card className="shadow-none border-0">
              <CardHeader className="sticky top-0 bg-white z-10 border-b border-slate-100">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-base font-extrabold text-slate-900">
                      {editingUserId
                        ? mode === "petugas"
                          ? "Edit Petugas OP"
                          : "Edit Pengelola DI (Admin)"
                        : mode === "petugas"
                          ? "Tambah Petugas OP"
                          : "Tambah Pengelola DI (Admin)"}
                    </div>
                    <div className="text-xs text-slate-500">
                      
                    </div>
                  </div>
                  <Button variant="secondary" onClick={() => setOpen(false)}>
                    Tutup
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="grid gap-3 md:grid-cols-2 p-4 sm:p-6">
                <Field label="Jabatan / Pos">
                  <Input value={form.jabatan} onChange={(e) => setForm({ ...form, jabatan: e.target.value })} />
                </Field>

                <Field label="No. HP">
                  <Input value={form.noHp} onChange={(e) => setForm({ ...form, noHp: e.target.value })} />
                </Field>

                {/* ✅ DAERAH IRIGASI - hanya untuk PETUGAS */}
                {mode !== "pengelola" && (
                  <Field label="Daerah Irigasi (DI)">
                    <select
                      value={form.di_id || ""}
                      onChange={(e) => setForm({ ...form, di_id: parseInt(e.target.value) || null })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">-- Pilih DI --</option>
                      {daerahOptions.map((di) => (
                        <option key={di.id} value={di.id}>
                          {di.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                {/* ✅ username/password hanya untuk PETUGAS */}
                {mode !== "pengelola" && (
                  <>
                    <Field label="Username">
                      <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                    </Field>

                    <Field label="Password">
                      <Input
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                      />
                    </Field>
                  </>
                )}

                <div className="md:col-span-2">
                  <Field label="Nama Lengkap">
                    <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
                  </Field>
                </div>

                {/* MULTI SALURAN */}
                <div className="md:col-span-2">
                  <div className="text-xs font-semibold text-slate-600">Saluran (boleh pilih lebih dari 1)</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {SALURAN_OPTIONS.map((o) => {
                      const active = (form.saluran || []).includes(o.value);
                      return (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => toggleSaluran(o.value)}
                          className={[
                            "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold",
                            active
                              ? "border-blue-200 bg-blue-50 text-blue-800"
                              : "border-slate-200 bg-white text-slate-700",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "h-4 w-4 rounded border",
                              active ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300",
                            ].join(" ")}
                          />
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* HM */}
                <Field label="HM Awal (opsional)">
                  <Input value={form.hmAwal} onChange={(e) => setForm({ ...form, hmAwal: e.target.value })} />
                </Field>

                <Field label="HM Akhir (opsional)">
                  <Input value={form.hmAkhir} onChange={(e) => setForm({ ...form, hmAkhir: e.target.value })} />
                </Field>

                {/* Assign Bangunan */}
                <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-extrabold text-slate-700">Tanggung Jawab Bangunan (opsional)</div>
                  <div className="mt-1 text-xs text-slate-500">
                  </div>

                  <div className="mt-3">
                    <Input
                      value={qBangunan}
                      onChange={(e) => setQBangunan(e.target.value)}
                      placeholder="Cari bangunan (kode / lokasi / hm)..."
                    />
                  </div>

                  <div className="mt-3 max-h-[220px] overflow-auto rounded-xl border border-slate-200 bg-white">
                    {buildingList.list.length === 0 ? (
                      <div className="p-3 text-sm text-slate-600">Tidak ada bangunan cocok.</div>
                    ) : (
                      buildingList.list.map((b) => {
                        const id = String(b.id);
                        const checked = (form.buildingIds || []).includes(id);
                        return (
                          <label
                            key={id}
                            className="flex cursor-pointer items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0"
                          >
                            <div className="min-w-0">
                              <div className="font-extrabold text-slate-900">{b.code}</div>
                              <div className="text-xs text-slate-500 truncate">
                                {b.lokasi} • Saluran {b.saluran} • HM {b.hm}
                              </div>
                            </div>

                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleBuildingId(id)}
                              className="h-4 w-4"
                            />
                          </label>
                        );
                      })
                    )}
                  </div>
                  {buildingList.hiddenCount > 0 && (
                    <div className="mt-2 text-xs text-slate-500">Tersembunyi: <b>{buildingList.hiddenCount}</b> bangunan sudah ditugaskan ke petugas lain dan tidak dapat dipilih.</div>
                  )}

                  <div className="mt-2 text-xs text-slate-500">
                    Dipilih: <b>{(form.buildingIds || []).length}</b> bangunan
                  </div>
                </div>

                <div className="md:col-span-2 flex gap-2 justify-end pt-4 border-t border-slate-100 sticky bottom-0 bg-white">
                  <Button variant="secondary" onClick={() => setOpen(false)}>
                    Batal
                  </Button>
                  <Button onClick={addUser}>Simpan</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* MODAL VIEW BANGUNAN */}
      {viewUser && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setViewUser(null)} />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl bg-white">
            <Card className="shadow-none border-0">
              <CardHeader className="sticky top-0 bg-white z-10 border-b border-slate-100">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-base font-extrabold text-slate-900">Bangunan — {viewUser.nama || viewUser.username}</div>
                    <div className="text-xs text-slate-500">Menampilkan bangunan yang ditugaskan ke petugas</div>
                  </div>
                  <Button variant="secondary" onClick={() => setViewUser(null)}>Tutup</Button>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-6">
                {(viewUser.buildingIds || []).length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Petugas ini belum memiliki bangunan yang ditugaskan.</div>
                ) : (
                  <div className="grid gap-2">
                    {(viewUser.buildingIds || []).map((bid) => {
                      const b = apiBuildings.find(x => String(x.id) === String(bid));
                      return (
                        <div key={bid} className="rounded-lg border border-slate-200 p-3 bg-white">
                          <div className="font-extrabold text-sm text-slate-900">{b ? (b.nomenklatur_bagi || `ID ${bid}`) : `ID ${bid}`}</div>
                          <div className="text-xs text-slate-500">{b ? `${b.lokasi || ''} • HM ${b.hm || ''} • Saluran ${b.canal_id === 4 ? 'Kanan' : 'Kiri'}` : 'Detail bangunan tidak ditemukan di data API.'}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

/** ======================
 * UI Pieces
 * ====================== */
function UserCard({ u, daerahOptions, onDelete, onView, onEdit }) {
  const isPetugas = u.type === "petugas";
  const roleLabel = isPetugas ? "PETUGAS OP" : "PENGELOLA DI";
  const tone = isPetugas ? "info" : "warn";

  const saluranLabel =
    (u.saluran || []).map((s) => (s === "kanan" ? "Kanan" : "Kiri")).join(" + ") || "-";

  const diName = daerahOptions.find(d => String(d.id) === String(u.di_id))?.name || "-";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-base font-extrabold text-slate-900 truncate">{u.nama || u.username || "-"}</div>
            <Badge tone={tone}>{roleLabel}</Badge>
          </div>

          {/* ✅ tampilkan username hanya jika ada */}
          <div className="mt-1 text-xs text-slate-500">
            {u.username ? `@${u.username}` : ""} {u.noHp ? `${u.username ? "• " : ""}${u.noHp}` : ""}
          </div>

          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-600">Penempatan</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{u.jabatan || "-"}</div>

            <div className="mt-1 flex flex-wrap gap-2 text-xs">
              {isPetugas && (
                <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-700">
                  DI: <b>{diName}</b>
                </span>
              )}
              <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-700">
                Saluran: <b>{saluranLabel}</b>
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-700">
                HM: <b>{u.hmAwal || "-"}</b> s/d <b>{u.hmAkhir || "-"}</b>
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-700">
                Bangunan: <b>{(u.buildingIds || []).length || 0}</b>
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onView}
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            title="Lihat Bangunan"
            aria-label="Lihat Bangunan"
          >
            👁️
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            title="Edit"
            aria-label="Edit"
          >
            ✏️
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-red-50 hover:text-red-700"
            title="Hapus"
            aria-label="Hapus"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-600">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}