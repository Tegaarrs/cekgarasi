import { apiFetch, getToken } from './api';

export interface PendingFavorite {
  type: 'favorit';
  carId: number;
  returnTo: string;
  expiresAt: number;
}

export interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
  action?: {
    label: string;
    onClick: () => void;
  };
}

const STORAGE_PENDING_KEY = 'cg.pending_favorite';
let favoriteIdsCache: number[] = [];
let isInitialized = false;
let isLoading = false;
const listeners = new Set<() => void>();
const toastListeners = new Set<(toast: ToastState) => void>();
let undoTimer: ReturnType<typeof setTimeout> | null = null;

export function sanitizeInternalPath(path: string | null | undefined, fallback = '/'): string {
  if (!path) return fallback;
  const trimmed = path.trim();
  // Must start with single "/" and not "//", and not contain protocols like "http:", "javascript:"
  if (/^(\/)(?!\/)/.test(trimmed) && !trimmed.includes(':') && !trimmed.includes('\\')) {
    return trimmed;
  }
  return fallback;
}

export function savePendingFavorite(carId: number, returnTo: string): void {
  const safeReturnTo = sanitizeInternalPath(returnTo, '/cari');
  const pending: PendingFavorite = {
    type: 'favorit',
    carId,
    returnTo: safeReturnTo,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  };
  try {
    sessionStorage.setItem(STORAGE_PENDING_KEY, JSON.stringify(pending));
  } catch {
    // Ignore storage errors
  }
}

export function getPendingFavorite(): PendingFavorite | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_PENDING_KEY);
    if (!raw) return null;
    const parsed: PendingFavorite = JSON.parse(raw);
    if (!parsed || parsed.type !== 'favorit' || typeof parsed.carId !== 'number') {
      sessionStorage.removeItem(STORAGE_PENDING_KEY);
      return null;
    }
    if (Date.now() > (parsed.expiresAt || 0)) {
      sessionStorage.removeItem(STORAGE_PENDING_KEY);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(STORAGE_PENDING_KEY);
    return null;
  }
}

export function clearPendingFavorite(): void {
  try {
    sessionStorage.removeItem(STORAGE_PENDING_KEY);
  } catch {
    // Ignore storage errors
  }
}

function notifySubscribers() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener error
    }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cekgarasi:favorite_changed'));
  }
}

export function notifyToast(toast: ToastState) {
  toastListeners.forEach((listener) => {
    try {
      listener(toast);
    } catch {
      // Ignore listener error
    }
  });
}

export function subscribeFavorites(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeToast(listener: (toast: ToastState) => void): () => void {
  toastListeners.add(listener);
  return () => {
    toastListeners.delete(listener);
  };
}

export async function fetchFavoriteIds(force = false): Promise<number[]> {
  const token = getToken();
  if (!token) {
    favoriteIdsCache = [];
    isInitialized = true;
    notifySubscribers();
    return [];
  }

  if (isInitialized && !force) {
    return favoriteIdsCache;
  }

  if (isLoading) {
    return favoriteIdsCache;
  }

  isLoading = true;
  try {
    const ids = await apiFetch<number[]>('/favorit/ids');
    if (Array.isArray(ids)) {
      favoriteIdsCache = ids;
      isInitialized = true;
      notifySubscribers();
    }
  } catch {
    // Fail silently if guest or network error
  } finally {
    isLoading = false;
  }
  return favoriteIdsCache;
}

export function getFavoriteIds(): number[] {
  return [...favoriteIdsCache];
}

export function getFavoriteCount(): number {
  return favoriteIdsCache.length;
}

export function isFavorite(carId: number): boolean {
  return favoriteIdsCache.includes(carId);
}

export function requestLoginPrompt(options?: { title?: string; description?: string }) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cekgarasi:show_login_prompt', { detail: options }));
  }
}

export async function toggleFavorite(
  carId: number,
  options?: {
    returnTo?: string;
    onRequireLogin?: () => void;
  }
): Promise<boolean> {
  const token = getToken();
  if (!token) {
    savePendingFavorite(carId, options?.returnTo || (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/cari'));
    if (options?.onRequireLogin) {
      options.onRequireLogin();
    } else {
      requestLoginPrompt();
    }
    return false;
  }

  const alreadyFavorited = isFavorite(carId);
  const previousState = [...favoriteIdsCache];

  if (undoTimer) {
    clearTimeout(undoTimer);
    undoTimer = null;
  }

  if (alreadyFavorited) {
    // Optimistic removal
    favoriteIdsCache = favoriteIdsCache.filter((id) => id !== carId);
    notifySubscribers();

    notifyToast({
      show: true,
      message: 'Dihapus dari Favorit saya',
      type: 'info',
      action: {
        label: 'Urungkan',
        onClick: async () => {
          try {
            await apiFetch('/favorit', {
              method: 'POST',
              body: JSON.stringify({ car_id: carId }),
            });
            if (!favoriteIdsCache.includes(carId)) {
              favoriteIdsCache = [...favoriteIdsCache, carId];
              notifySubscribers();
            }
            notifyToast({
              show: true,
              message: 'Ditambahkan kembali ke Favorit saya',
              type: 'success',
            });
          } catch {
            notifyToast({
              show: true,
              message: 'Gagal mengembalikan favorit',
              type: 'error',
            });
          }
        },
      },
    });

    try {
      await apiFetch(`/favorit/${carId}`, { method: 'DELETE' });
      return false;
    } catch {
      // Rollback on network failure
      favoriteIdsCache = previousState;
      notifySubscribers();
      notifyToast({
        show: true,
        message: 'Gagal menghapus favorit. Silakan coba lagi.',
        type: 'error',
      });
      return true;
    }
  } else {
    // Optimistic addition
    favoriteIdsCache = [...favoriteIdsCache, carId];
    notifySubscribers();

    notifyToast({
      show: true,
      message: 'Ditambahkan ke Favorit saya',
      type: 'success',
    });

    try {
      await apiFetch('/favorit', {
        method: 'POST',
        body: JSON.stringify({ car_id: carId }),
      });
      return true;
    } catch {
      // Rollback on network failure
      favoriteIdsCache = previousState;
      notifySubscribers();
      notifyToast({
        show: true,
        message: 'Gagal menambahkan favorit. Silakan coba lagi.',
        type: 'error',
      });
      return false;
    }
  }
}

export async function processPendingFavorite(navigate?: (to: string) => void): Promise<void> {
  const pending = getPendingFavorite();
  if (!pending) return;

  clearPendingFavorite();
  const token = getToken();
  if (!token) return;

  try {
    await apiFetch('/favorit', {
      method: 'POST',
      body: JSON.stringify({ car_id: pending.carId }),
    });

    if (!favoriteIdsCache.includes(pending.carId)) {
      favoriteIdsCache = [...favoriteIdsCache, pending.carId];
      notifySubscribers();
    }

    notifyToast({
      show: true,
      message: 'Ditambahkan ke Favorit saya',
      type: 'success',
    });
  } catch {
    // non-blocking
  }

  const safeReturn = sanitizeInternalPath(pending.returnTo, '/cari');
  if (navigate && safeReturn) {
    navigate(safeReturn);
  }
}

export async function saveFavoriteNote(carId: number, catatan: string): Promise<void> {
  await apiFetch(`/favorit/${carId}/catatan`, {
    method: 'PUT',
    body: JSON.stringify({ catatan }),
  });
}
