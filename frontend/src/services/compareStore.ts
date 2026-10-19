import { notifyToast } from './favoriteStore';

const STORAGE_KEY = 'cg.compare';
const MAX_COMPARE = 4;

let compareIdsCache: number[] = [];
let isInitialized = false;
const listeners = new Set<() => void>();

function readStorage(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((id) => typeof id === 'number').slice(0, MAX_COMPARE);
    }
    return [];
  } catch {
    return [];
  }
}

function writeStorage(ids: number[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage errors
  }
}

function init() {
  if (isInitialized) return;
  compareIdsCache = readStorage();
  isInitialized = true;

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        compareIdsCache = readStorage();
        notifySubscribers();
      }
    });
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
    window.dispatchEvent(new CustomEvent('cekgarasi:compare_changed'));
  }
}

export function subscribeCompare(listener: () => void): () => void {
  init();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCompareIds(): number[] {
  init();
  return [...compareIdsCache];
}

export function isCompared(id: number): boolean {
  init();
  return compareIdsCache.includes(id);
}

export function addCompare(id: number): boolean {
  init();
  if (compareIdsCache.includes(id)) {
    return true;
  }
  if (compareIdsCache.length >= MAX_COMPARE) {
    notifyToast({
      show: true,
      message: `Maksimal ${MAX_COMPARE} mobil untuk dibandingkan sekaligus`,
      type: 'info',
    });
    return false;
  }
  compareIdsCache = [...compareIdsCache, id];
  writeStorage(compareIdsCache);
  notifySubscribers();
  notifyToast({
    show: true,
    message: 'Ditambahkan ke perbandingan',
    type: 'success',
  });
  return true;
}

export function removeCompare(id: number): void {
  init();
  if (!compareIdsCache.includes(id)) return;
  compareIdsCache = compareIdsCache.filter((cId) => cId !== id);
  writeStorage(compareIdsCache);
  notifySubscribers();
}

export function toggleCompare(id: number): boolean {
  init();
  if (compareIdsCache.includes(id)) {
    removeCompare(id);
    return false;
  } else {
    return addCompare(id);
  }
}

export function clearCompare(): void {
  init();
  compareIdsCache = [];
  writeStorage([]);
  notifySubscribers();
}
