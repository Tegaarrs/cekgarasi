import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  ArrowUpDown,
  LayoutGrid,
  List,
  Calendar,
  Gauge,
  MapPin,
  ExternalLink,
  Edit3,
  Check,
  TrendingDown,
  Sparkles,
  Search,
  Scale,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { getToken, apiFetch } from '@/services/api';
import {
  toggleFavorite,
  subscribeFavorites,
  saveFavoriteNote,
  notifyToast,
} from '@/services/favoriteStore';
import {
  getCompareIds,
  toggleCompare,
  isCompared,
  subscribeCompare,
  clearCompare,
} from '@/services/compareStore';
import { getCarPhoto } from '@/utils/carPhoto';
import { formatInstallment } from '@/lib/finance';
import { SegmentBadge } from '@/components/motion/SegmentBadge';
import { Skeleton } from '@/components/motion/Skeleton';
import { CarPlaceholder } from '@/components/common/CarPlaceholder';

interface CarItem {
  id: number;
  nama_mobil: string;
  tahun: number;
  harga_rp: number;
  jarak_tempuh_ribu_km: number;
  lokasi: string;
  transmisi: string;
  klaster: number;
  nama_segmen?: string;
  warna_segmen?: string;
  foto?: string | null;
}

interface FavoriteItem {
  id: number;
  nama_mobil: string;
  tahun: number;
  harga_rp: number;
  jarak_tempuh_ribu_km: number;
  klaster: number;
  catatan?: string | null;
  disimpan_pada?: string | null;
  car: CarItem;
  posisi_harga?: {
    q1: number;
    median: number;
    q3: number;
    verdict: string;
    selisih_median_rp: number;
  };
}

interface SummaryData {
  jumlah: number;
  harga_min: number;
  harga_max: number;
  harga_median: number;
  tahun_median: number;
  km_rata_rata_ribu: number;
  sebaran_segmen: Array<{
    id: number;
    nama: string;
    jumlah: number;
    persen: number;
  }>;
  segmen_dominan?: {
    id: number;
    nama: string;
    persen: number;
  } | null;
  sesuai_budget?: boolean | null;
  selisih_budget_rp?: number | null;
}

interface RecommendationCar {
  id: number;
  nama_mobil: string;
  tahun: number;
  harga_rp: number;
  jarak_tempuh_ribu_km: number;
  lokasi?: string;
  transmisi?: string;
  klaster: number;
  nama_segmen?: string;
  warna_segmen?: string;
  foto?: string | null;
  alasan?: string[];
}

interface CheaperAlternative {
  id: number;
  nama_mobil: string;
  tahun: number;
  harga_rp: number;
  jarak_tempuh_ribu_km: number;
  hemat_rp: number;
  klaster: number;
  foto?: string | null;
}

export function FavoritPage() {
  const token = getToken();
  const navigate = useNavigate();

  // If unauthenticated guest, immediately redirect to /masuk?next=/favorit
  if (!token) {
    return <Navigate to="/masuk?next=/favorit" replace />;
  }

  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationCar[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sort, setSort] = useState<string>('terbaru_disimpan');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [compareList, setCompareList] = useState<number[]>(getCompareIds());

  // Alternatives cache: { [carId]: CheaperAlternative[] }
  const [alternativesCache, setAlternativesCache] = useState<Record<number, CheaperAlternative[]>>({});
  const [expandedAlternatives, setExpandedAlternatives] = useState<Record<number, boolean>>({});
  const [loadingAlt, setLoadingAlt] = useState<Record<number, boolean>>({});

  // Notes local state for responsive typing: { [carId]: string }
  const [notesState, setNotesState] = useState<Record<number, string>>({});
  const [notesSaving, setNotesSaving] = useState<Record<number, boolean>>({});
  const [notesSaved, setNotesSaved] = useState<Record<number, boolean>>({});

  // Sync compare list from compareStore
  useEffect(() => {
    const unsub = subscribeCompare(() => {
      setCompareList(getCompareIds());
    });
    return unsub;
  }, []);

  // Fetch summary and recommendations
  const loadSummaryAndRecs = useCallback(async () => {
    try {
      const [sumRes, recRes] = await Promise.all([
        apiFetch<SummaryData>('/favorit/ringkasan'),
        apiFetch<RecommendationCar[]>('/favorit/rekomendasi?n=8'),
      ]);
      setSummary(sumRes);
      setRecommendations(recRes || []);
    } catch {
      // ignore non-blocking
    }
  }, []);

  // Fetch list of favorites
  const loadFavorites = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<FavoriteItem[]>(`/favorit?urut=${sort}`);
      const list = Array.isArray(data) ? data : [];
      setItems(list);

      // Populate notes state
      const initialNotes: Record<number, string> = {};
      list.forEach((item) => {
        initialNotes[item.id] = item.catatan || '';
      });
      setNotesState(initialNotes);
    } catch (err) {
      console.error('Failed to load favorites:', err);
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  useEffect(() => {
    loadSummaryAndRecs();
  }, [loadSummaryAndRecs]);

  // Subscribe to favoriteStore changes (e.g. undo toast or header button actions)
  useEffect(() => {
    const unsub = subscribeFavorites(() => {
      loadFavorites();
      loadSummaryAndRecs();
    });
    return unsub;
  }, [loadFavorites, loadSummaryAndRecs]);

  // Note save on blur
  const handleNoteBlur = async (carId: number) => {
    const noteText = (notesState[carId] || '').slice(0, 500);
    setNotesSaving((prev) => ({ ...prev, [carId]: true }));
    try {
      await saveFavoriteNote(carId, noteText);
      setNotesSaved((prev) => ({ ...prev, [carId]: true }));
      setTimeout(() => {
        setNotesSaved((prev) => ({ ...prev, [carId]: false }));
      }, 2500);
    } catch {
      notifyToast({
        show: true,
        message: 'Gagal menyimpan catatan.',
        type: 'error',
      });
    } finally {
      setNotesSaving((prev) => ({ ...prev, [carId]: false }));
    }
  };

  // Toggle cheaper alternatives expansion
  const toggleAlternatives = async (carId: number) => {
    const nextState = !expandedAlternatives[carId];
    setExpandedAlternatives((prev) => ({ ...prev, [carId]: nextState }));

    if (nextState && !alternativesCache[carId]) {
      setLoadingAlt((prev) => ({ ...prev, [carId]: true }));
      try {
        const alts = await apiFetch<CheaperAlternative[]>(`/mobil/${carId}/alternatif-hemat?n=3`);
        setAlternativesCache((prev) => ({ ...prev, [carId]: alts || [] }));
      } catch {
        setAlternativesCache((prev) => ({ ...prev, [carId]: [] }));
      } finally {
        setLoadingAlt((prev) => ({ ...prev, [carId]: false }));
      }
    }
  };

  // Segment colors mapping for distribution bar
  const SEGMENT_BAR_COLORS: Record<number, string> = {
    0: 'bg-blue-600',
    1: 'bg-emerald-500',
    2: 'bg-purple-500',
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-28 pt-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Page Title & Breadcrumbs */}
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-black text-slate-900 sm:text-3xl dark:text-white">
              Favorit Saya
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Koleksi unit mobil pilihan kamu untuk dipantau, dibandingkan, atau dihubungi.
            </p>
          </div>
          {items.length > 0 && (
            <div className="mt-2 sm:mt-0 flex items-center gap-2">
              <Link
                to="/cari"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Search className="h-3.5 w-3.5 text-blue-600" />
                <span>Tambah Mobil Lagi</span>
              </Link>
            </div>
          )}
        </div>

        {/* Loading state */}
        {loading && items.length === 0 ? (
          <div className="space-y-6">
            <Skeleton height={140} className="w-full rounded-2xl" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton height={280} className="rounded-2xl" />
              <Skeleton height={280} className="rounded-2xl" />
              <Skeleton height={280} className="rounded-2xl" />
            </div>
          </div>
        ) : items.length === 0 ? (
          /* Empty State */
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-50 text-rose-500 ring-8 ring-rose-50/50 dark:bg-rose-950/30 dark:ring-rose-950/10">
              <Heart className="h-10 w-10 fill-rose-500 stroke-rose-500" />
            </div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Belum ada mobil yang kamu simpan
            </h2>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Simpan mobil favoritmu saat menelusuri katalog untuk membandingkan spesifikasi, mencatat poin penting, dan melihat alternatif hemat yang relevan.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                to="/cari"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-500 transition-all"
              >
                <Search className="h-4 w-4" />
                <span>Jelajahi Katalog Mobil</span>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Top Summary Card */}
            {summary && summary.jumlah > 0 && (
              <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        Kamu menyimpan {summary.jumlah} mobil favorit
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {summary.sesuai_budget === true
                          ? 'Koleksi favoritmu sesuai dengan preferensi budget yang kamu atur.'
                          : 'Rangkuman harga dan karakteristik pasar dari mobil pilihanmu.'}
                      </p>
                    </div>
                  </div>

                  {summary.segmen_dominan && (
                    <SegmentBadge
                      klaster={summary.segmen_dominan.id}
                      nama={`Dominan: ${summary.segmen_dominan.nama} (${summary.segmen_dominan.persen}%)`}
                      size="sm"
                    />
                  )}
                </div>

                {/* Key Metrics Grid */}
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <span className="block text-[11px] font-medium text-slate-400">Harga Median</span>
                    <span className="font-display text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                      Rp {Math.round(summary.harga_median / 1_000_000)} Jt
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      Rentang: {Math.round(summary.harga_min / 1_000_000)} - {Math.round(summary.harga_max / 1_000_000)} Jt
                    </span>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <span className="block text-[11px] font-medium text-slate-400">Tahun Khas</span>
                    <span className="font-display text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                      {summary.tahun_median || '-'}
                    </span>
                    <span className="block text-[10px] text-slate-400">Median tahun rakitan</span>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <span className="block text-[11px] font-medium text-slate-400">Rata-rata Odometer</span>
                    <span className="font-display text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                      {summary.km_rata_rata_ribu} rb km
                    </span>
                    <span className="block text-[10px] text-slate-400">Pemakaian wajar</span>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <span className="block text-[11px] font-medium text-slate-400">Unit Siap Dibandingkan</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Scale className="h-4 w-4 text-blue-600" />
                      <span className="font-display text-base font-extrabold text-blue-600 sm:text-lg">
                        {compareList.length}/4
                      </span>
                    </div>
                    <span className="block text-[10px] text-slate-400">Bisa cek beda spesifikasi</span>
                  </div>
                </div>

                {/* Segment Distribution Bar */}
                {summary.sebaran_segmen && summary.sebaran_segmen.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                      <span className="font-medium text-[11px]">Distribusi Segmen Pilihanmu:</span>
                      <div className="flex items-center gap-3">
                        {summary.sebaran_segmen.map((seg) => (
                          <div key={seg.id} className="flex items-center gap-1 text-[11px]">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                SEGMENT_BAR_COLORS[seg.id] || 'bg-slate-400'
                              }`}
                            />
                            <span>{seg.nama} ({seg.persen}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      {summary.sebaran_segmen.map((seg) => (
                        <div
                          key={seg.id}
                          className={`${SEGMENT_BAR_COLORS[seg.id] || 'bg-slate-400'} transition-all`}
                          style={{ width: `${seg.persen}%` }}
                          title={`${seg.nama}: ${seg.jumlah} mobil (${seg.persen}%)`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Toolbar: Sort, View Toggle, Compare Select Info */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  <span>Urutkan:</span>
                </span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="terbaru_disimpan">Terbaru disimpan</option>
                  <option value="harga_asc">Harga terendah</option>
                  <option value="harga_desc">Harga tertinggi</option>
                  <option value="km_asc">Kilometer terendah</option>
                  <option value="tahun_desc">Tahun terbaru</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 hidden sm:inline">
                  {items.length} mobil tersimpan
                </span>
                <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`rounded-md p-1.5 transition-colors cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title="Tampilan Grid"
                    aria-label="Tampilan Grid"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`rounded-md p-1.5 transition-colors cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title="Tampilan Daftar"
                    aria-label="Tampilan Daftar"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* List / Grid of Favorite Cars */}
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'
                  : 'space-y-4'
              }
            >
              {items.map((item) => {
                const car = item.car || item;
                const compared = isCompared(car.id);
                const isAltOpen = !!expandedAlternatives[car.id];
                const alts = alternativesCache[car.id] || [];
                const isAltLoading = !!loadingAlt[car.id];
                const noteVal = notesState[car.id] ?? (item.catatan || '');
                const isSaving = !!notesSaving[car.id];
                const isSaved = !!notesSaved[car.id];

                return (
                  <div
                    key={item.id}
                    className={`group rounded-2xl border transition-all bg-white dark:bg-slate-900 dark:border-slate-800 ${
                      compared
                        ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                        : 'border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    {/* Top Row: Photo, Badges & Quick Action */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-2xl bg-slate-100 dark:bg-slate-800">
                      <img
                        src={getCarPhoto(car.nama_mobil, car.foto || car.transmisi)}
                        alt={car.nama_mobil}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <CarPlaceholder
                        klaster={car.klaster}
                        className="absolute inset-0 -z-10"
                      />

                      {/* Segment Tag Badge */}
                      <div className="absolute top-2.5 left-2.5 z-10">
                        <SegmentBadge
                          klaster={car.klaster}
                          nama={car.nama_segmen}
                          size="sm"
                        />
                      </div>

                      {/* Remove Favorite Button */}
                      <button
                        type="button"
                        onClick={() => toggleFavorite(car.id)}
                        aria-label="Hapus dari favorit"
                        className="absolute top-2.5 right-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-rose-500 shadow-md hover:bg-white active:scale-90 transition-all cursor-pointer dark:bg-slate-900/90"
                      >
                        <Heart className="h-4 w-4 fill-rose-500" />
                      </button>

                      {/* Compare Checkbox Chip */}
                      <div className="absolute bottom-2.5 left-2.5 z-10">
                        <label className="flex items-center gap-1.5 rounded-lg bg-slate-950/75 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs cursor-pointer hover:bg-slate-900">
                          <input
                            type="checkbox"
                            checked={compared}
                            onChange={() => toggleCompare(car.id)}
                            className="rounded border-slate-400 text-blue-600 focus:ring-0 accent-blue-600 cursor-pointer h-3.5 w-3.5"
                          />
                          <span>{compared ? 'Terpilih Banding' : 'Bandingkan'}</span>
                        </label>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-3">
                      <div>
                        <Link
                          to={`/mobil/${car.id}`}
                          className="font-bold text-sm sm:text-base text-slate-900 hover:text-blue-600 transition-colors line-clamp-1 dark:text-white"
                        >
                          {car.nama_mobil}
                        </Link>
                        <div className="mt-1 flex items-baseline justify-between">
                          <span className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                            Rp {car.harga_rp.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {formatInstallment(car.harga_rp)}
                          </span>
                        </div>
                      </div>

                      {/* Specs Row */}
                      <div className="flex items-center justify-between border-y border-slate-100 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{car.tahun}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Gauge className="h-3.5 w-3.5 text-slate-400" />
                          <span>{car.jarak_tempuh_ribu_km} rb km</span>
                        </span>
                        <span className="flex items-center gap-1 truncate max-w-[100px]">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{car.lokasi || 'DKI Jakarta'}</span>
                        </span>
                      </div>

                      {/* Price Position Verdict Chip */}
                      {item.posisi_harga && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Posisi harga:</span>
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold text-[10px] ${
                              item.posisi_harga.verdict === 'di bawah rentang'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : item.posisi_harga.verdict === 'di atas rentang'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                                : 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                            }`}
                          >
                            Harga {item.posisi_harga.verdict}
                          </span>
                        </div>
                      )}

                      {/* Private Note (Catatan Pribadi) */}
                      <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 dark:bg-slate-800/60 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-1.5 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                            <Edit3 className="h-3 w-3 text-slate-400" />
                            <span>Catatan Pribadi</span>
                          </span>
                          <div className="flex items-center gap-1 text-[10px]">
                            {isSaving && <span className="text-blue-600">Menyimpan...</span>}
                            {isSaved && (
                              <span className="flex items-center gap-0.5 text-emerald-600 font-medium">
                                <Check className="h-3 w-3" /> Tersimpan
                              </span>
                            )}
                            <span className="text-slate-400">{noteVal.length}/500</span>
                          </div>
                        </div>
                        <textarea
                          rows={2}
                          maxLength={500}
                          value={noteVal}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNotesState((prev) => ({ ...prev, [car.id]: val }));
                          }}
                          onBlur={() => handleNoteBlur(car.id)}
                          placeholder="Tulis catatan (misal: warna favorit istri, sudah cek servis, mau nego OTR)..."
                          className="w-full resize-none rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </div>

                      {/* Expandable "Alternatif Lebih Hemat" */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => toggleAlternatives(car.id)}
                          className="w-full flex items-center justify-between rounded-xl border border-dashed border-slate-200 p-2 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                            <TrendingDown className="h-3.5 w-3.5" />
                            <span>Alternatif Lebih Hemat</span>
                          </span>
                          {isAltOpen ? (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          )}
                        </button>

                        <AnimatePresence>
                          {isAltOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-2 space-y-2 rounded-xl bg-slate-50 p-2.5 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800">
                                {isAltLoading ? (
                                  <div className="py-3 text-center text-xs text-slate-400">
                                    Mencari alternatif unit sepadan...
                                  </div>
                                ) : alts.length === 0 ? (
                                  <div className="py-2 text-center text-xs text-slate-400">
                                    Unit ini sudah termasuk paling hemat di kelasnya.
                                  </div>
                                ) : (
                                  alts.map((alt) => (
                                    <div
                                      key={alt.id}
                                      className="flex items-center justify-between rounded-lg bg-white p-2 border border-slate-200/80 shadow-2xs dark:bg-slate-900 dark:border-slate-700"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <img
                                          src={getCarPhoto(alt.nama_mobil, alt.foto)}
                                          alt={alt.nama_mobil}
                                          className="h-10 w-12 rounded object-cover flex-shrink-0"
                                        />
                                        <div className="min-w-0">
                                          <Link
                                            to={`/mobil/${alt.id}`}
                                            className="block truncate text-xs font-bold text-slate-800 hover:text-blue-600 dark:text-slate-200"
                                          >
                                            {alt.nama_mobil}
                                          </Link>
                                          <span className="block text-[10px] text-slate-400">
                                            Rp {alt.harga_rp.toLocaleString('id-ID')} • {alt.tahun}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="text-right flex-shrink-0 pl-2">
                                        <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                                          Hemat Rp {Math.round(alt.hemat_rp / 1_000_000)} Jt
                                        </span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Detail CTA Button */}
                      <Link
                        to={`/mobil/${car.id}`}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
                      >
                        <span>Lihat Detail Lengkap</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Carousel: "Mirip dengan favoritmu" */}
            {recommendations.length > 0 && (
              <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white sm:text-xl">
                      Mirip dengan Pilihan Favoritmu
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Rekomendasi unit dengan karakteristik harga, tahun, dan spesifikasi yang mendekati mobil favoritmu.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x no-scrollbar">
                  {recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="w-64 flex-shrink-0 snap-start rounded-xl border border-slate-200 bg-white shadow-2xs hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-800/70"
                    >
                      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-xl bg-slate-100 dark:bg-slate-800">
                        <img
                          src={getCarPhoto(rec.nama_mobil, rec.foto || rec.transmisi)}
                          alt={rec.nama_mobil}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute top-2 left-2">
                          <SegmentBadge klaster={rec.klaster} nama={rec.nama_segmen} size="sm" />
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleFavorite(rec.id)}
                          aria-label="Simpan ke favorit"
                          className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-400 hover:text-rose-500 hover:bg-white transition-colors cursor-pointer dark:bg-slate-900/90"
                        >
                          <Heart className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="p-3 space-y-2">
                        <Link
                          to={`/mobil/${rec.id}`}
                          className="block text-xs font-bold text-slate-900 hover:text-blue-600 truncate dark:text-white"
                        >
                          {rec.nama_mobil}
                        </Link>
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="font-extrabold text-blue-600">
                            Rp {rec.harga_rp.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[10px] text-slate-400">{rec.tahun}</span>
                        </div>

                        {/* Reason Chips */}
                        {rec.alasan && rec.alasan.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {rec.alasan.map((reason, rIdx) => (
                              <span
                                key={rIdx}
                                className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                              >
                                {reason}
                              </span>
                            ))}
                          </div>
                        )}

                        <Link
                          to={`/mobil/${rec.id}`}
                          className="mt-2 block w-full rounded-lg border border-slate-200 py-1.5 text-center text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 transition-colors"
                        >
                          Lihat Unit
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sticky Bottom Compare Bar if any cars are selected */}
      <AnimatePresence>
        {compareList.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 w-11/12 max-w-xl rounded-2xl border border-slate-900/10 bg-slate-900/95 backdrop-blur-md p-3.5 text-white shadow-2xl flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-sm">
                {compareList.length}
              </div>
              <div>
                <span className="text-xs font-bold block">
                  {compareList.length} mobil dipilih untuk dibandingkan
                </span>
                <span className="text-[10px] text-slate-300">
                  Maksimal 4 unit perbandingan sekaligus
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => clearCompare()}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                title="Batal pilih"
                aria-label="Batal pilih semua"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate(`/bandingkan?ids=${compareList.join(',')}`)}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow-sm transition-colors cursor-pointer"
              >
                <Scale className="h-3.5 w-3.5" />
                <span>Bandingkan Sekarang</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
