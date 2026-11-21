import { apiFetch, getToken, getUser } from './api';

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
// Legacy unscoped keys purged on load so old cross-account/stale favorites never leak
const LEGACY_LOCAL_FAVS = 'cg.local_favorites';
const LEGACY_GUEST_FAVS = 'cg.guest_favorites';
// V2 user-scoped storage keys
const STORAGE_USER_FAVS_PREFIX = 'cg.favs.v2.user.';
const STORAGE_GUEST_FAVS_V2 = 'cg.favs.v2.guest';

let activeScopeKey: string | null = null;
let favoriteIdsCache: number[] = [];
let isInitialized = false;
let isLoading = false;
const pendingRemovalIds = new Set<number>();
const pendingAdditionIds = new Set<number>();
const listeners = new Set<() => void>();
const toastListeners = new Set<(toast: ToastState) => void>();
let undoTimer: ReturnType<typeof setTimeout> | null = null;

function purgeLegacyStorage() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LEGACY_LOCAL_FAVS);
    localStorage.removeItem(LEGACY_GUEST_FAVS);
  } catch {}
}

purgeLegacyStorage();

function getCurrentScopeKey(): string {
  const token = getToken();
  if (!token) return 'guest';
  const user = getUser<{ id?: number; email?: string }>();
  if (user?.id !== undefined && user?.id !== null) {
    return `user:${user.id}`;
  }
  if (user?.email) {
    return `user:${user.email.toLowerCase()}`;
  }
  return 'user:auth';
}

function getStorageKeyForScope(scope: string): string {
  if (scope === 'guest') return STORAGE_GUEST_FAVS_V2;
  return `${STORAGE_USER_FAVS_PREFIX}${scope.slice(5)}`;
}

function readIdsFromKey(storageKey: string): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? Array.from(new Set(parsed.filter((id) => typeof id === 'number' && Number.isFinite(id))))
      : [];
  } catch {
    return [];
  }
}

function writeIdsToKey(storageKey: string, ids: number[]) {
  if (typeof window === 'undefined') return;
  try {
    const unique = Array.from(new Set(ids.filter((id) => typeof id === 'number' && Number.isFinite(id))));
    if (unique.length === 0) {
      localStorage.removeItem(storageKey);
    } else {
      localStorage.setItem(storageKey, JSON.stringify(unique));
    }
  } catch {}
}

function readGuestFavorites(): number[] {
  return readIdsFromKey(STORAGE_GUEST_FAVS_V2);
}

function writeGuestFavorites(ids: number[]) {
  writeIdsToKey(STORAGE_GUEST_FAVS_V2, ids);
}

function ensureScopeSynced(): string {
  const scope = getCurrentScopeKey();
  if (activeScopeKey !== scope) {
    activeScopeKey = scope;
    isInitialized = false;
    isLoading = false;
    pendingRemovalIds.clear();
    pendingAdditionIds.clear();
    // For guests, load explicit v2 guest favorites only.
    // For logged-in users, start from that specific user's v2 cache until server responds.
    favoriteIdsCache = readIdsFromKey(getStorageKeyForScope(scope));
  }
  return scope;
}

function areIdListsEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((id) => setA.has(id));
}

export function isPendingRemoval(carId: number): boolean {
  ensureScopeSynced();
  return pendingRemovalIds.has(carId);
}

export function getPendingAdditionIds(): number[] {
  ensureScopeSynced();
  return Array.from(pendingAdditionIds);
}

export function resetFavoriteCache(): void {
  purgeLegacyStorage();
  activeScopeKey = getCurrentScopeKey();
  isInitialized = false;
  isLoading = false;
  pendingRemovalIds.clear();
  pendingAdditionIds.clear();
  favoriteIdsCache = readIdsFromKey(getStorageKeyForScope(activeScopeKey));
  notifySubscribers();
}

export function syncFavoriteIdsFromServer(serverIds: number[]): void {
  const scope = ensureScopeSynced();
  if (scope === 'guest') return;
  const resolved = Array.from(
    new Set([
      ...serverIds.filter((id) => !pendingRemovalIds.has(id)),
      ...Array.from(pendingAdditionIds),
    ])
  );
  const changed = !areIdListsEqual(favoriteIdsCache, resolved);
  favoriteIdsCache = resolved;
  writeIdsToKey(getStorageKeyForScope(scope), resolved);
  isInitialized = true;
  if (changed) {
    notifySubscribers();
  }
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
  ensureScopeSynced();
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
  const scope = ensureScopeSynced();
  const token = getToken();

  if (!token || scope === 'guest') {
    const guestFavs = readGuestFavorites();
    const resolved = Array.from(
      new Set([
        ...guestFavs.filter((id) => !pendingRemovalIds.has(id)),
        ...Array.from(pendingAdditionIds),
      ])
    );
    const changed = !areIdListsEqual(favoriteIdsCache, resolved);
    favoriteIdsCache = resolved;
    isInitialized = true;
    if (changed) {
      notifySubscribers();
    }
    return [...favoriteIdsCache];
  }

  if (isInitialized && !force) {
    return [...favoriteIdsCache];
  }

  if (isLoading) {
    return [...favoriteIdsCache];
  }

  isLoading = true;
  try {
    const serverIds = await apiFetch<number[]>('/favorit/ids');
    // Ignore stale response if user logged out or switched accounts mid-flight
    if (getCurrentScopeKey() !== scope) {
      return [...favoriteIdsCache];
    }

    if (Array.isArray(serverIds)) {
      const guestFavs = readGuestFavorites();
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
      writeIdsToKey(getStorageKeyForScope(scope), resolved);
      isInitialized = true;
      notifySubscribers();

      // Sync only explicit v2 guest favorites added before login
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
    // Keep only this user's own v2 cache if server is temporarily unreachable
    if (getCurrentScopeKey() === scope) {
      const ownCached = readIdsFromKey(getStorageKeyForScope(scope));
      favoriteIdsCache = Array.from(
        new Set([
          ...ownCached.filter((id) => !pendingRemovalIds.has(id)),
          ...Array.from(pendingAdditionIds),
        ])
      );
      isInitialized = true;
      notifySubscribers();
    }
  } finally {
    isLoading = false;
  }
  return [...favoriteIdsCache];
}

export function getFavoriteIds(): number[] {
  ensureScopeSynced();
  return favoriteIdsCache.filter((id) => !pendingRemovalIds.has(id));
}

export function getFavoriteCount(): number {
  return getFavoriteIds().length;
}

export function isFavorite(carId: number): boolean {
  ensureScopeSynced();
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
  const scope = ensureScopeSynced();
  const token = getToken();
  pendingAdditionIds.add(carId);
  pendingRemovalIds.delete(carId);

  if (!favoriteIdsCache.includes(carId)) {
    favoriteIdsCache = [...favoriteIdsCache, carId];
  }
  writeIdsToKey(getStorageKeyForScope(scope), favoriteIdsCache);

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
      // Revert optimistic add if backend rejects it
      if (getCurrentScopeKey() === scope) {
        favoriteIdsCache = favoriteIdsCache.filter((id) => id !== carId);
        writeIdsToKey(getStorageKeyForScope(scope), favoriteIdsCache);
      }
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
  const scope = ensureScopeSynced();
  const token = getToken();
  pendingRemovalIds.add(carId);
  pendingAdditionIds.delete(carId);

  favoriteIdsCache = favoriteIdsCache.filter((id) => id !== carId);
  writeIdsToKey(getStorageKeyForScope(scope), favoriteIdsCache);
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
  ensureScopeSynced();
  await applyRemoveFavorite(carId);
}

export async function toggleFavorite(
  carId: number,
  options?: {
    returnTo?: string;
    onRequireLogin?: () => void;
  }
): Promise<boolean> {
  ensureScopeSynced();
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

  const scope = ensureScopeSynced();
  try {
    await apiFetch('/favorit', {
      method: 'POST',
      body: JSON.stringify({ car_id: pending.carId }),
    });

    if (getCurrentScopeKey() === scope && !favoriteIdsCache.includes(pending.carId)) {
      favoriteIdsCache = [...favoriteIdsCache, pending.carId];
      writeIdsToKey(getStorageKeyForScope(scope), favoriteIdsCache);
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
