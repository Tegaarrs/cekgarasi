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
const STORAGE_LOCAL_FAVS = 'cg.local_favorites';
const STORAGE_GUEST_FAVS = 'cg.guest_favorites';

let favoriteIdsCache: number[] = [];
let isInitialized = false;
let isLoading = false;
const pendingRemovalIds = new Set<number>();
const pendingAdditionIds = new Set<number>();
const listeners = new Set<() => void>();
const toastListeners = new Set<(toast: ToastState) => void>();
let undoTimer: ReturnType<typeof setTimeout> | null = null;

function readLocalFavorites(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_LOCAL_FAVS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'number') : [];
  } catch {
    return [];
  }
}

function writeLocalFavorites(ids: number[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_LOCAL_FAVS, JSON.stringify(ids));
  } catch {}
}

function readGuestFavorites(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_GUEST_FAVS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'number') : [];
  } catch {
    return [];
  }
}

function writeGuestFavorites(ids: number[]) {
  if (typeof window === 'undefined') return;
  try {
    if (ids.length === 0) {
      localStorage.removeItem(STORAGE_GUEST_FAVS);
    } else {
      localStorage.setItem(STORAGE_GUEST_FAVS, JSON.stringify(ids));
    }
  } catch {}
}

export function isPendingRemoval(carId: number): boolean {
  return pendingRemovalIds.has(carId);
}

export function resetFavoriteCache(): void {
  isInitialized = false;
  pendingRemovalIds.clear();
  pendingAdditionIds.clear();
  favoriteIdsCache = readGuestFavorites();
  writeLocalFavorites(favoriteIdsCache);
  notifySubscribers();
}

export function sanitizeInternalPath(path: string | null | undefined, fallback = '/'): string {
  if (!path) return fallback;
  const trimmed = path.trim();
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
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
  try {
    sessionStorage.setItem(STORAGE_PENDING_KEY, JSON.stringify(pending));
  } catch {}
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
  } catch {}
}

function notifySubscribers() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cekgarasi:favorite_changed'));
  }
}

export function notifyToast(toast: ToastState) {
  toastListeners.forEach((listener) => {
    try {
      listener(toast);
    } catch {}
  });
}

export function subscribeFavorites(listener: () => void): () => void {
  if (!isInitialized) {
    favoriteIdsCache = readLocalFavorites();
  }
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
  const localFavs = readLocalFavorites();
  const guestFavs = readGuestFavorites();
  const token = getToken();

  if (!token) {
    const base = guestFavs.length > 0 ? guestFavs : localFavs;
    favoriteIdsCache = Array.from(
      new Set([
        ...base.filter((id) => !pendingRemovalIds.has(id)),
        ...Array.from(pendingAdditionIds),
      ])
    );
    isInitialized = true;
    notifySubscribers();
    return favoriteIdsCache;
  }

  if (isInitialized && !force) {
    return favoriteIdsCache;
  }

  if (isLoading) {
    return favoriteIdsCache;
  }

  isLoading = true;
  try {
    const serverIds = await apiFetch<number[]>('/favorit/ids');
    if (Array.isArray(serverIds)) {
      const guestToSync = guestFavs.filter(
        (id) => !serverIds.includes(id) && !pendingRemovalIds.has(id)
      );
      if (guestFavs.length > 0) {
        writeGuestFavorites([]);
      }

      if (guestToSync.length > 0) {
        guestToSync.forEach((id) => pendingAdditionIds.add(id));
      }

      const resolved = Array.from(
        new Set([
          ...serverIds.filter((id) => !pendingRemovalIds.has(id)),
          ...guestToSync,
          ...Array.from(pendingAdditionIds),
        ])
      );

      favoriteIdsCache = resolved;
      writeLocalFavorites(resolved);
      isInitialized = true;
      notifySubscribers();

      // Sync any guest favorites that were added before login to the server
      if (guestToSync.length > 0) {
        await Promise.allSettled(
          guestToSync.map((id) =>
            apiFetch('/favorit', {
              method: 'POST',
              body: JSON.stringify({ car_id: id }),
            }).finally(() => {
              pendingAdditionIds.delete(id);
            })
          )
        );
        notifySubscribers();
      }
    }
  } catch {
    // If server call fails, fallback to local storage seamlessly
    favoriteIdsCache = Array.from(
      new Set([
        ...localFavs.filter((id) => !pendingRemovalIds.has(id)),
        ...Array.from(pendingAdditionIds),
      ])
    );
    isInitialized = true;
    notifySubscribers();
  } finally {
    isLoading = false;
  }
  return favoriteIdsCache;
}

export function getFavoriteIds(): number[] {
  if (!isInitialized) {
    favoriteIdsCache = readLocalFavorites().filter((id) => !pendingRemovalIds.has(id));
    isInitialized = true;
  }
  return [...favoriteIdsCache];
}

export function getFavoriteCount(): number {
  if (!isInitialized) {
    favoriteIdsCache = readLocalFavorites().filter((id) => !pendingRemovalIds.has(id));
    isInitialized = true;
  }
  return favoriteIdsCache.length;
}

export function isFavorite(carId: number): boolean {
  if (!isInitialized) {
    favoriteIdsCache = readLocalFavorites().filter((id) => !pendingRemovalIds.has(id));
    isInitialized = true;
  }
  return favoriteIdsCache.includes(carId) && !pendingRemovalIds.has(carId);
}

export function requestLoginPrompt(options?: { title?: string; description?: string }) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cekgarasi:show_login_prompt', { detail: options }));
  }
}

async function applyAddFavorite(
  carId: number,
  options?: { returnTo?: string; silentToast?: boolean; toastMessage?: string }
): Promise<boolean> {
  const token = getToken();
  pendingAdditionIds.add(carId);
  pendingRemovalIds.delete(carId);

  if (!favoriteIdsCache.includes(carId)) {
    favoriteIdsCache = [...favoriteIdsCache, carId];
  }
  writeLocalFavorites(favoriteIdsCache);

  if (!token) {
    const guest = readGuestFavorites();
    if (!guest.includes(carId)) {
      writeGuestFavorites([...guest, carId]);
    }
  }

  notifySubscribers();

  if (!options?.silentToast) {
    notifyToast({
      show: true,
      message: options?.toastMessage || 'Ditambahkan ke Favorit saya',
      type: 'success',
    });
  }

  if (token) {
    try {
      await apiFetch('/favorit', {
        method: 'POST',
        body: JSON.stringify({ car_id: carId }),
      });
    } catch {
      // keep optimistic local state if network hiccups
    } finally {
      pendingAdditionIds.delete(carId);
      notifySubscribers();
    }
  } else {
    savePendingFavorite(
      carId,
      options?.returnTo ||
        (typeof window !== 'undefined'
          ? window.location.pathname + window.location.search
          : '/cari')
    );
    pendingAdditionIds.delete(carId);
  }
  return true;
}

async function applyRemoveFavorite(carId: number): Promise<boolean> {
  const token = getToken();
  pendingRemovalIds.add(carId);
  pendingAdditionIds.delete(carId);

  favoriteIdsCache = favoriteIdsCache.filter((id) => id !== carId);
  writeLocalFavorites(favoriteIdsCache);
  writeGuestFavorites(readGuestFavorites().filter((id) => id !== carId));
  notifySubscribers();

  notifyToast({
    show: true,
    message: 'Dihapus dari Favorit saya',
    type: 'info',
    action: {
      label: 'Urungkan',
      onClick: async () => {
        await applyAddFavorite(carId, {
          toastMessage: 'Ditambahkan kembali ke Favorit saya',
        });
      },
    },
  });

  if (token) {
    try {
      await apiFetch(`/favorit/${carId}`, { method: 'DELETE' });
    } catch {
      // ignore error so optimistic delete remains removed unless restored
    } finally {
      pendingRemovalIds.delete(carId);
      notifySubscribers();
    }
  } else {
    pendingRemovalIds.delete(carId);
  }
  return false;
}

export async function removeFavorite(carId: number): Promise<void> {
  if (!isInitialized) {
    favoriteIdsCache = readLocalFavorites();
    isInitialized = true;
  }
  await applyRemoveFavorite(carId);
}

export async function toggleFavorite(
  carId: number,
  options?: {
    returnTo?: string;
    onRequireLogin?: () => void;
  }
): Promise<boolean> {
  if (!isInitialized) {
    favoriteIdsCache = readLocalFavorites();
    isInitialized = true;
  }

  const alreadyFavorited = favoriteIdsCache.includes(carId) && !pendingRemovalIds.has(carId);

  if (undoTimer) {
    clearTimeout(undoTimer);
    undoTimer = null;
  }

  if (alreadyFavorited) {
    return applyRemoveFavorite(carId);
  } else {
    return applyAddFavorite(carId, { returnTo: options?.returnTo });
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
      writeLocalFavorites(favoriteIdsCache);
      notifySubscribers();
    }

    notifyToast({
      show: true,
      message: 'Ditambahkan ke Favorit saya',
      type: 'success',
    });
  } catch {}

  const safeReturn = sanitizeInternalPath(pending.returnTo, '/cari');
  if (navigate && safeReturn) {
    navigate(safeReturn);
  }
}

export async function saveFavoriteNote(carId: number, catatan: string): Promise<void> {
  const token = getToken();
  if (!token) return;
  try {
    await apiFetch(`/favorit/${carId}/catatan`, {
      method: 'PUT',
      body: JSON.stringify({ catatan }),
    });
  } catch {}
}
