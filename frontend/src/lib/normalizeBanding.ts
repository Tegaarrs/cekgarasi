// Shared helpers to normalize comparison & alternative responses from the backend.
// Backend shapes:
//   GET /bandingkan?ids=..          -> { cars: [{ mobil, posisi_harga, fitur: [{id,kode,nama,tersedia}] }], ... }
//   GET /mobil/{id}/alternatif-hemat -> [{ mobil, hemat_rp }]
import { apiFetch } from '@/services/api';
import { removeCompare } from '@/services/compareStore';

export interface CompareFeature {
  id: number;
  kode: string;
  nama_id: string;
  aktif: boolean;
}

export interface PosisiHarga {
  q1: number | null;
  median: number | null;
  q3: number | null;
  verdict: string;
  selisih_median_rp: number;
}

export interface NormalizedCompareCar {
  id: number;
  nama_mobil: string;
  merk?: string;
  model?: string;
  tahun: number;
  harga_rp: number;
  jarak_tempuh_ribu_km: number;
  lokasi: string;
  transmisi: string;
  bahan_bakar?: string;
  tipe_plat?: string;
  jenis_plat?: string;
  klaster: number;
  nama_segmen?: string;
  warna_segmen?: string;
  total_fitur: number;
  foto?: string | null;
  features?: CompareFeature[];
  fitur_list?: string[];
  posisi_harga?: PosisiHarga;
}

export interface NormalizedAlternative {
  id: number;
  nama_mobil: string;
  tahun: number;
  harga_rp: number;
  jarak_tempuh_ribu_km: number;
  hemat_rp: number;
  klaster: number;
  foto?: string | null;
}

type Raw = Record<string, unknown>;

const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);

/** Format a number as Indonesian Rupiah digits without crashing on null/undefined. */
export function formatAngka(v: unknown): string {
  return num(v).toLocaleString('id-ID');
}

function pickFoto(m: Raw): string | null {
  if (typeof m.foto === 'string' && m.foto) return m.foto;
  if (typeof m.foto_url === 'string' && m.foto_url) return m.foto_url;
  const gallery = m.foto_gallery;
  if (Array.isArray(gallery) && typeof gallery[0] === 'string') return gallery[0];
  return null;
}

/** Flatten a single car item (either flat or wrapped in `mobil`). */
export function normalizeCompareCar(entry: Raw): NormalizedCompareCar | null {
  if (!entry || typeof entry !== 'object') return null;
  const m = (entry.mobil && typeof entry.mobil === 'object' ? entry.mobil : entry) as Raw;
  const id = num(m.id, NaN);
  if (!Number.isFinite(id)) return null;

  const rawFitur = (Array.isArray(entry.fitur) ? entry.fitur : Array.isArray(m.features) ? m.features : null) as Raw[] | null;
  const features: CompareFeature[] | undefined = rawFitur
    ? rawFitur.map((f) => ({
        id: num(f.id),
        kode: str(f.kode),
        nama_id: str(f.nama_id) || str(f.nama),
        aktif: typeof f.aktif === 'boolean' ? f.aktif : !!f.tersedia,
      }))
    : undefined;

  const posisi = (entry.posisi_harga || m.posisi_harga) as PosisiHarga | undefined;

  return {
    id,
    nama_mobil: str(m.nama_mobil, 'Mobil'),
    merk: str(m.merk) || str(m.merek) || undefined,
    model: str(m.model_mobil) || str(m.model) || undefined,
    tahun: num(m.tahun),
    harga_rp: num(m.harga_rp),
    jarak_tempuh_ribu_km: num(m.jarak_tempuh_ribu_km),
    lokasi: str(m.lokasi),
    transmisi: str(m.transmisi),
    bahan_bakar: str(m.bahan_bakar) || undefined,
    tipe_plat: str(m.tipe_plat) || undefined,
    jenis_plat: str(m.jenis_plat) || undefined,
    klaster: num(m.klaster),
    nama_segmen: str(m.nama_segmen) || str(m.segmen_nama) || undefined,
    warna_segmen: str(m.warna_segmen) || str(m.warna_hex) || undefined,
    total_fitur: num(m.total_fitur),
    foto: pickFoto(m),
    features,
    posisi_harga: posisi && typeof posisi === 'object' ? posisi : undefined,
  };
}

/** Accepts `{cars: [...]}` or a plain array and returns flat compare cars. */
export function normalizeCompareResponse(data: unknown): NormalizedCompareCar[] {
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as Raw).cars)
    ? ((data as Raw).cars as unknown[])
    : [];
  return list
    .map((e) => normalizeCompareCar(e as Raw))
    .filter((c): c is NormalizedCompareCar => c !== null);
}

/**
 * Fetch comparison data for the given ids.
 * - Backend requires 2..4 ids, so fewer than 2 returns [] without a request.
 * - If a car is no longer listed (backend 400 `mobil_id_X_tidak_ditemukan`),
 *   it is removed from the compare store and the request is retried.
 */
export async function fetchCompareCars(ids: number[]): Promise<NormalizedCompareCar[]> {
  let current = ids.slice(0, 4);
  for (let attempt = 0; attempt < 4; attempt++) {
    if (current.length < 2) return [];
    try {
      const data = await apiFetch<unknown>(`/bandingkan?ids=${current.join(',')}`);
      return normalizeCompareResponse(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const match = /mobil_id_(\d+)_tidak_ditemukan/.exec(msg);
      if (!match) throw err;
      const staleId = Number(match[1]);
      removeCompare(staleId);
      current = current.filter((id) => id !== staleId);
    }
  }
  return [];
}

/** Flatten `[{ mobil, hemat_rp }]` into alternative items. */
export function normalizeAlternatives(data: unknown): NormalizedAlternative[] {
  if (!Array.isArray(data)) return [];
  const out: NormalizedAlternative[] = [];
  for (const raw of data as Raw[]) {
    if (!raw || typeof raw !== 'object') continue;
    const m = (raw.mobil && typeof raw.mobil === 'object' ? raw.mobil : raw) as Raw;
    const id = num(m.id, NaN);
    if (!Number.isFinite(id)) continue;
    out.push({
      id,
      nama_mobil: str(m.nama_mobil, 'Mobil'),
      tahun: num(m.tahun),
      harga_rp: num(m.harga_rp),
      jarak_tempuh_ribu_km: num(m.jarak_tempuh_ribu_km),
      hemat_rp: num(raw.hemat_rp),
      klaster: num(m.klaster),
      foto: pickFoto(m),
    });
  }
  return out;
}
