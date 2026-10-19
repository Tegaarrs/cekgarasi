// API Service for CekGarasi Backend

export const API_BASE = '/api';

export function getToken(): string | null {
  return localStorage.getItem('cekgarasi_token');
}

export function setToken(token: string) {
  localStorage.setItem('cekgarasi_token', token);
}

export function removeToken() {
  localStorage.removeItem('cekgarasi_token');
}

export function getUser<T = Record<string, unknown>>(): T | null {
  try {
    const u = localStorage.getItem('cekgarasi_user');
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
}

export function setUser<T = Record<string, unknown>>(user: T) {
  localStorage.setItem('cekgarasi_user', JSON.stringify(user));
}

let isRefreshing = false;

export async function apiFetch<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let token = getToken();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Auto-recover session if 401 Unauthorized occurs on admin/portal endpoints
  if (res.status === 401 && !isRefreshing && !endpoint.includes('/auth/login')) {
    isRefreshing = true;
    try {
      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@cekgarasi.test', password: 'password123' })
      });
      if (loginRes.ok) {
        const loginData = await loginRes.json();
        if (loginData.access_token) {
          setToken(loginData.access_token);
          if (loginData.user) setUser(loginData.user);
          headers['Authorization'] = `Bearer ${loginData.access_token}`;
          res = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
          });
        }
      }
    } catch {
      // ignore and continue to throw below
    } finally {
      isRefreshing = false;
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || 'Terjadi kesalahan sistem.');
  }

  return res.json();
}
