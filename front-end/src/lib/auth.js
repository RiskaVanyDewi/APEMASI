const KEY = "apemasi_auth";

export function setAuth(payload) {
  localStorage.setItem(KEY, JSON.stringify(payload));
}

export function getAuth() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function getToken() {
  const auth = getAuth();
  return auth?.token || null;
}

export function clearAuth() {
  localStorage.removeItem(KEY);
}
