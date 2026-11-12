import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
  Filter,
  ArrowLeft,
  RotateCcw,
  Plus,
  Lightbulb,
} from 'lucide-react';
import { getToken, apiFetch } from '@/services/api';
import {
  toggleFavorite,
  subscribeFavorites,
  saveFavoriteNote,
  fetchFavoriteIds,
  getFavoriteIds,
} from '@/services/favoriteStore';
import {
  getCompareIds,
  toggleCompare,
  isCompared,
  subscribeCompare,
  clearCompare,
  removeCompare,
  addCompare,
} from '@/services/compareStore';
import { getCarPhoto } from '@/utils/carPhoto';
import { formatInstallment, calculateInstallment } from '@/lib/finance';
import { buatRingkasanBanding } from '@/lib/ringkasanBanding';
import {
  fetchCompareCars,
  normalizeAlternatives,
  formatAngka,
} from '@/lib/normalizeBanding';
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
  foto_url?: string | null;
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
  foto_url?: string | null;
  alasan?: Array<string | { kode: string; nilai: number }>;
  alasan_teks?: string[];
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

interface FeatureItem {
  id: number;
  kode: string;
  nama_id: string;
  aktif: boolean;
}

interface ComparedCar {
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
  features?: FeatureItem[];
  fitur_list?: string[];
  catatan?: string | null;
  posisi_harga?: {
    q1: number | null;
    median: number | null;
    q3: number | null;
    verdict: string;
    selisih_median_rp: number;
  };
}

export function FavoritPage() {
  return <FavoritPageContent />;
}

function FavoritPageContent() {
  const token = getToken();
  // Active view tab: 'koleksi' (favorite cars list) vs 'bandingkan' (embedded compare session)
  const [activeTab, setActiveTab] = useState<'koleksi' | 'bandingkan'>('koleksi');

  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationCar[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sort, setSort] = useState<string>('terbaru');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [compareList, setCompareList] = useState<number[]>(getCompareIds());

  // Embedded Comparison State
  const [comparedCars, setComparedCars] = useState<ComparedCar[]>([]);
  const [loadingCompare, setLoadingCompare] = useState<boolean>(false);
  const [showOnlyDifferences, setShowOnlyDifferences] = useState<boolean>(false);
  const [dpPercent, setDpPercent] = useState<number>(20);
  const [tenorTahun, setTenorTahun] = useState<number>(4);

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
    const token = getToken();
    if (!token) {
      setSummary(null);
      setRecommendations([]);
      return;
    }
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

  // Fetch list of favorites with fallback
  const loadFavorites = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) {
        // Guest mode: fetch details for locally stored favorite IDs
        const localIds = getFavoriteIds();
        if (localIds.length === 0) {
          setItems([]);
          setLoading(false);
          return;
        }
        const miniCars = await fetchCompareCars(localIds);
        const guestItems: FavoriteItem[] = miniCars.map((c) => ({
          id: c.id,
          nama_mobil: c.nama_mobil,
          tahun: c.tahun || 2020,
          harga_rp: c.harga_rp,
          jarak_tempuh_ribu_km: c.jarak_tempuh_ribu_km || 30,
          klaster: c.klaster || 0,
          catatan: null,
          disimpan_pada: new Date().toISOString(),
          car: {
            id: c.id,
            nama_mobil: c.nama_mobil,
            tahun: c.tahun || 2020,
            harga_rp: c.harga_rp,
            jarak_tempuh_ribu_km: c.jarak_tempuh_ribu_km || 30,
            lokasi: c.lokasi || 'DKI Jakarta',
            transmisi: c.transmisi || 'Automatic',
            klaster: c.klaster || 0,
            nama_segmen: c.nama_segmen,
            warna_segmen: c.warna_segmen,
            foto: c.foto,
            foto_url: c.foto,
          },
          posisi_harga: c.posisi_harga
            ? {
                q1: c.posisi_harga.q1 || c.harga_rp * 0.95,
                median: c.posisi_harga.median || c.harga_rp,
                q3: c.posisi_harga.q3 || c.harga_rp * 1.05,
                verdict: c.posisi_harga.verdict || 'Wajar',
                selisih_median_rp: c.posisi_harga.selisih_median_rp || 0,
              }
            : undefined,
        }));
        setItems(guestItems);
        setLoading(false);
        return;
      }

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
      console.error('Failed to load favorites with sort:', err);
      // Fallback request to /favorit without query params
      try {
        const fallbackData = await apiFetch<FavoriteItem[]>('/favorit');
        if (Array.isArray(fallbackData)) {
          setItems(fallbackData);
          const initialNotes: Record<number, string> = {};
          fallbackData.forEach((item) => {
            initialNotes[item.id] = item.catatan || '';
          });
          setNotesState(initialNotes);
        }
      } catch (fallbackErr) {
        console.error('Failed fallback favorites fetch:', fallbackErr);
      }
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

  // Subscribe to favoriteStore changes
  useEffect(() => {
    fetchFavoriteIds(true);
    const unsub = subscribeFavorites(() => {
      loadFavorites();
      loadSummaryAndRecs();
    });
    return unsub;
  }, [loadFavorites, loadSummaryAndRecs]);

  // Load compared cars whenever compareList changes.
  // Backend /bandingkan needs 2..4 ids and returns { cars: [{ mobil, fitur, posisi_harga }] },
  // so the response is normalized into flat ComparedCar objects.
  // Buyer notes are merged at render time (notesState), so typing a note no longer refetches.
  const compareKey = compareList.join(',');
  useEffect(() => {
    const ids = compareKey ? compareKey.split(',').map(Number) : [];
    if (ids.length < 2) {
      setComparedCars([]);
      setLoadingCompare(false);
      return;
    }

    let isMounted = true;
    setLoadingCompare(true);
    fetchCompareCars(ids)
      .then((cars) => {
        if (isMounted) setComparedCars(cars);
      })
      .catch((err) => {
        console.error('Failed to fetch compared cars:', err);
        if (isMounted) setComparedCars([]);
      })
      .finally(() => {
        if (isMounted) setLoadingCompare(false);
      });

    return () => {
      isMounted = false;
    };
  }, [compareKey]);

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
      // rollback or notify
    } finally {
      setNotesSaving((prev) => ({ ...prev, [carId]: false }));
    }
  };

  // Toggle cheaper alternatives accordion
  const toggleAlternatives = async (carId: number) => {
    const current = !!expandedAlternatives[carId];
    setExpandedAlternatives((prev) => ({ ...prev, [carId]: !current }));

    if (!current && !alternativesCache[carId]) {
      setLoadingAlt((prev) => ({ ...prev, [carId]: true }));
      try {
        // Backend returns [{ mobil: {...}, hemat_rp }] -> flatten before rendering
        const raw = await apiFetch<unknown>(`/mobil/${carId}/alternatif-hemat?n=3`);
        const alts: CheaperAlternative[] = normalizeAlternatives(raw);
        setAlternativesCache((prev) => ({ ...prev, [carId]: alts }));
      } catch {
        setAlternativesCache((prev) => ({ ...prev, [carId]: [] }));
      } finally {
        setLoadingAlt((prev) => ({ ...prev, [carId]: false }));
      }
    }
  };

  // Rule-based comparison summary
  const comparisonSummary = useMemo(() => {
    if (comparedCars.length < 2) return null;
    return buatRingkasanBanding(comparedCars);
  }, [comparedCars]);

  // Features list computation
  const allFeatureNames = useMemo(() => {
    const set = new Set<string>();
    comparedCars.forEach((car) => {
      if (car.features) {
        car.features.forEach((f) => set.add(f.nama_id));
      } else if (car.fitur_list) {
        car.fitur_list.forEach((name) => set.add(name));
      }
    });
    return Array.from(set).sort();
  }, [comparedCars]);

  const carHasFeature = (car: ComparedCar, featureName: string): boolean => {
    if (car.features) {
      const feat = car.features.find((f) => f.nama_id === featureName);
      return feat ? feat.aktif : false;
    }
    if (car.fitur_list) {
      return car.fitur_list.includes(featureName);
    }
    return false;
  };

  const isSpecDifferent = (accessor: (c: ComparedCar) => string | number | undefined): boolean => {
    if (comparedCars.length <= 1) return true;
    const firstVal = accessor(comparedCars[0]);
    return comparedCars.some((c) => accessor(c) !== firstVal);
  };

  const isFeatureDifferent = (featureName: string): boolean => {
    if (comparedCars.length <= 1) return true;
    const firstHas = carHasFeature(comparedCars[0], featureName);
    return comparedCars.some((c) => carHasFeature(c, featureName) !== firstHas);
  };

  // Quick auto-select first 2 favorites for comparison
  const handleAutoCompareTopTwo = () => {
    if (items.length >= 2) {
      clearCompare();
      addCompare(items[0].id);
      addCompare(items[1].id);
      setActiveTab('bandingkan');
    }
  };

  // Remaining favorites that are not yet in comparison
  const uncomparedFavorites = useMemo(() => {
    return items.filter((it) => !compareList.includes(it.id));
  }, [items, compareList]);

  // Segment colors mapping for distribution bar
  const SEGMENT_BAR_COLORS: Record<number, string> = {
    0: 'bg-blue-600',
    1: 'bg-emerald-500',
    2: 'bg-purple-500',
  };

  return (
    <div className="min-h-screen bg-[#F5F5F3] dark:bg-[#070709] pb-24 pt-6 transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Page Title & Main Header */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading uppercase tracking-wider text-2xl font-black text-zinc-900 sm:text-3xl dark:text-white">
              Favorit Saya // Saved Vault
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans">
              Koleksi mobil pilihan kamu untuk dipantau, dicatat, dan dibandingkan langsung dalam satu halaman.
            </p>
          </div>
          {items.length > 0 && (
            <div className="mt-2 sm:mt-0 flex items-center gap-2">
              <Link
                to="/cari"
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-800/80 px-3.5 py-2 font-heading uppercase tracking-wider text-xs font-bold text-zinc-700 dark:text-zinc-200 shadow-xs hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
              >
                <Search className="h-3.5 w-3.5 text-rose-500" />
                <span>Cari Mobil Lain</span>
              </Link>
            </div>
          )}
        </div>

        {/* Guest Banner if not logged in */}
        {!token && items.length > 0 && (
          <div className="mb-6 rounded-[14px] bg-[#EEEDFB] dark:bg-white/10 border border-[#E4E4EE] dark:border-white/15 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[10px] bg-[#5B4EF0]/15 border border-[#5B4EF0]/30 flex items-center justify-center text-[#5B4EF0] dark:text-[#8277FF] flex-shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                  Favorit Tersimpan di Perangkat Ini ({items.length} Unit)
                </h4>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-300 font-normal">
                  Daftar mobil tersimpan aman di browser Anda. Masuk untuk menyimpan secara permanen di akun Anda.
                </p>
              </div>
            </div>
            <Link
              to="/welcome"
              className="cg-btn-primary whitespace-nowrap text-xs font-semibold px-4 py-2 rounded-[10px] shadow-xs self-end sm:self-auto text-white"
            >
              Masuk Akun
            </Link>
          </div>
        )}

        {/* Tab Navigation: Koleksi Favorit vs Bandingkan Langsung */}
        {items.length > 0 && (
          <div className="mb-6 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('koleksi')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'koleksi'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              <Heart className="h-4 w-4 fill-current" />
              <span>Daftar Favorit ({items.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('bandingkan')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'bandingkan'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              <Scale className="h-4 w-4" />
              <span>Sesi Komparasi ({compareList.length}/4)</span>
              {compareList.length >= 2 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-900 font-extrabold">
                  Siap
                </span>
              )}
            </button>
          </div>
        )}

        {/* Loading State */}
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
        ) : activeTab === 'bandingkan' ? (
          /* ========================================================== */
          /* EMBEDDED COMPARISON SESSION INSIDE FAVORIT PAGE           */
          /* ========================================================== */
          <div className="space-y-6">
            
            {/* Embedded Compare Session Header Bar */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('koleksi')}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 dark:border-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Kembali ke Daftar Favorit"
                  aria-label="Kembali ke Daftar Favorit"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Scale className="h-4 w-4 text-blue-600" />
                    <span>Sesi Komparasi Mobil Favorit</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Membandingkan {comparedCars.length} mobil dari favorit kamu secara berdampingan tanpa berpindah halaman.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {comparedCars.length > 0 && (
                  <button
                    type="button"
                    onClick={() => clearCompare()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Atur Ulang</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTab('koleksi')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
                  <span>Lihat Semua Favorit</span>
                </button>
              </div>
            </div>

            {loadingCompare && comparedCars.length === 0 ? (
              <div className="space-y-4">
                <Skeleton height={120} className="w-full rounded-2xl" />
                <Skeleton height={400} className="w-full rounded-2xl" />
              </div>
            ) : comparedCars.length < 2 ? (
              /* Empty Comparison State inside Favorit */
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40">
                  <Scale className="h-8 w-8" />
                </div>
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Pilih Minimal 2 Mobil Favorit untuk Dibandingkan
                </h3>
                <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Kamu saat ini baru memilih {compareList.length} mobil. Pilih 2 hingga 4 mobil dari koleksi favoritmu untuk melihat komparasi spesifikasi, cicilan, dan catatan pribadimu di sini.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {items.length >= 2 && (
                    <button
                      type="button"
                      onClick={handleAutoCompareTopTwo}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-500 transition-all cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Bandingkan 2 Mobil Teratas Otomatis</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTab('koleksi')}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <span>Pilih Manual di Koleksi</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Rule-Based Comparison Summary Highlights */}
                {comparisonSummary && (
                  <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/40 p-5 shadow-xs dark:border-blue-900/40 dark:from-blue-950/30 dark:to-slate-900">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-400 mb-2.5">
                      <Sparkles className="h-4 w-4" />
                      <span>Ringkasan Komparasi Cerdas (Pilihan Favoritmu)</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                      {comparisonSummary.palingHemat && (
                        <div className="rounded-xl bg-white/90 p-3 border border-blue-100 shadow-2xs dark:bg-slate-800/80 dark:border-slate-700">
                          <span className="block text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">
                            Paling Hemat
                          </span>
                          <span className="mt-1 block text-xs font-bold text-slate-900 dark:text-white">
                            {comparisonSummary.palingHemat.text}
                          </span>
                        </div>
                      )}

                      {comparisonSummary.kmTerendah && (
                        <div className="rounded-xl bg-white/90 p-3 border border-blue-100 shadow-2xs dark:bg-slate-800/80 dark:border-slate-700">
                          <span className="block text-[10px] font-semibold text-blue-600 uppercase tracking-wider">
                            Odometer Terendah
                          </span>
                          <span className="mt-1 block text-xs font-bold text-slate-900 dark:text-white">
                            {comparisonSummary.kmTerendah.text}
                          </span>
                        </div>
                      )}

                      {comparisonSummary.tahunPalingMuda && (
                        <div className="rounded-xl bg-white/90 p-3 border border-blue-100 shadow-2xs dark:bg-slate-800/80 dark:border-slate-700">
                          <span className="block text-[10px] font-semibold text-purple-600 uppercase tracking-wider">
                            Tahun Paling Muda
                          </span>
                          <span className="mt-1 block text-xs font-bold text-slate-900 dark:text-white">
                            {comparisonSummary.tahunPalingMuda.text}
                          </span>
                        </div>
                      )}

                      {comparisonSummary.fiturTerlengkap && (
                        <div className="rounded-xl bg-white/90 p-3 border border-blue-100 shadow-2xs dark:bg-slate-800/80 dark:border-slate-700">
                          <span className="block text-[10px] font-semibold text-amber-600 uppercase tracking-wider">
                            Fitur Paling Lengkap
                          </span>
                          <span className="mt-1 block text-xs font-bold text-slate-900 dark:text-white">
                            {comparisonSummary.fiturTerlengkap.text}
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300 font-medium border-t border-blue-100/60 pt-2.5 dark:border-slate-800 flex items-start gap-1.5">
                      <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span>{comparisonSummary.kesimpulan}</span>
                    </p>
                  </div>
                )}

                {/* Finance Sliders & Differences Filter */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Simulasi Angsuran Bersama (Bunga Efektif 8% p.a.)
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Atur DP dan tenor untuk melihat perbandingan cicilan bulanan masing-masing mobil secara realtime.
                      </p>
                    </div>

                    {/* Diff-only toggle switch */}
                    <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto">
                      <div className="relative inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={showOnlyDifferences}
                          onChange={(e) => setShowOnlyDifferences(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Filter className="h-3.5 w-3.5" />
                        <span>Tampilkan hanya perbedaan</span>
                      </span>
                    </label>
                  </div>

                  {/* Sliders */}
                  <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        <span>Down Payment (DP):</span>
                        <span className="text-blue-600 font-bold">{dpPercent}%</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={50}
                        step={5}
                        value={dpPercent}
                        onChange={(e) => setDpPercent(parseInt(e.target.value, 10))}
                        aria-label="Uang Muka Down Payment Persen"
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                        <span>10%</span>
                        <span>25%</span>
                        <span>50%</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        <span>Jangka Waktu (Tenor):</span>
                        <span className="text-blue-600 font-bold">{tenorTahun} Tahun ({tenorTahun * 12} Bulan)</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        value={tenorTahun}
                        onChange={(e) => setTenorTahun(parseInt(e.target.value, 10))}
                        aria-label="Jangka Waktu Tenor Tahun"
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                        <span>1 Tahun</span>
                        <span>3 Tahun</span>
                        <span>5 Tahun</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Side-by-Side Comparison Table */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      {/* Table Header: Photo, Title, Badges & Remove Button */}
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/40">
                          <th className="w-48 min-w-[190px] p-4 font-bold text-slate-700 dark:text-slate-300">
                            Spesifikasi & Poin Komparasi
                          </th>
                          {comparedCars.map((car) => (
                            <th
                              key={car.id}
                              className="w-64 min-w-[240px] p-4 align-top border-l border-slate-100 dark:border-slate-800"
                            >
                              <div className="space-y-2.5">
                                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                                  <img
                                    src={getCarPhoto(car.nama_mobil, car.foto || car.transmisi)}
                                    alt={car.nama_mobil}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                  <CarPlaceholder klaster={car.klaster} className="absolute inset-0 -z-10" />

                                  <button
                                    type="button"
                                    onClick={() => removeCompare(car.id)}
                                    className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                                    title="Keluarkan dari komparasi"
                                    aria-label={`Hapus ${car.nama_mobil} dari komparasi`}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>

                                  <div className="absolute bottom-2 left-2">
                                    <SegmentBadge klaster={car.klaster} nama={car.nama_segmen} size="sm" />
                                  </div>
                                </div>

                                <div>
                                  <Link
                                    to={`/mobil/${car.id}`}
                                    className="block font-bold text-sm text-slate-900 hover:text-blue-600 line-clamp-1 dark:text-white"
                                  >
                                    {car.nama_mobil}
                                  </Link>
                                  <span className="text-[11px] text-slate-400 block mt-0.5">
                                    {car.lokasi || 'DKI Jakarta'}
                                  </span>
                                </div>
                              </div>
                            </th>
                          ))}

                          {/* Slot for Adding More Cars from Favorites if < 4 */}
                          {comparedCars.length < 4 && (
                            <th className="w-56 min-w-[220px] p-4 align-top border-l border-dashed border-slate-200 dark:border-slate-800">
                              <div className="h-full min-h-[220px] rounded-2xl border-2 border-dashed border-slate-200 p-4 flex flex-col items-center justify-center text-center dark:border-slate-800">
                                <div className="p-3 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 mb-2">
                                  <Plus className="h-5 w-5" />
                                </div>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                  Tambah Mobil Favorit
                                </span>
                                <span className="text-[10px] text-slate-400 mt-1 max-w-[160px]">
                                  Pilih mobil lain dari favoritmu untuk dibandingkan ({4 - comparedCars.length} slot tersisa)
                                </span>
                                {uncomparedFavorites.length > 0 ? (
                                  <select
                                    onChange={(e) => {
                                      const id = parseInt(e.target.value, 10);
                                      if (id) addCompare(id);
                                      e.target.value = '';
                                    }}
                                    defaultValue=""
                                    className="mt-3 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                  >
                                    <option value="" disabled>
                                      + Pilih dari Favorit...
                                    </option>
                                    {uncomparedFavorites.map((fav) => (
                                      <option key={fav.id} value={fav.id}>
                                        {fav.nama_mobil} ({fav.tahun}) - Rp {Math.round(fav.harga_rp / 1e6)} Jt
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <Link
                                    to="/cari"
                                    className="mt-3 text-[11px] font-bold text-blue-600 hover:underline"
                                  >
                                    Cari mobil di katalog →
                                  </Link>
                                )}
                              </div>
                            </th>
                          )}
                        </tr>
                      </thead>

                      {/* Specs Rows */}
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {/* Harga Listing */}
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-4 font-semibold text-slate-500 dark:text-slate-400">
                            Harga Listing
                          </td>
                          {comparedCars.map((car) => (
                            <td key={car.id} className="p-4 font-extrabold text-slate-900 dark:text-white border-l border-slate-100 dark:border-slate-800">
                              <span className="text-base text-blue-600 dark:text-blue-400">
                                Rp {formatAngka(car.harga_rp)}
                              </span>
                            </td>
                          ))}
                          {comparedCars.length < 4 && <td className="border-l border-dashed border-slate-200 dark:border-slate-800" />}
                        </tr>

                        {/* Estimasi Cicilan Bulanan */}
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 bg-blue-50/30 dark:bg-blue-950/20">
                          <td className="p-4 font-semibold text-slate-500 dark:text-slate-400">
                            Simulasi Cicilan ({tenorTahun} Thn, DP {dpPercent}%)
                          </td>
                          {comparedCars.map((car) => {
                            // calculateInstallment expects tenor in MONTHS
                            const cicilan = calculateInstallment(car.harga_rp, dpPercent, tenorTahun * 12);
                            return (
                              <td key={car.id} className="p-4 font-bold text-slate-900 dark:text-white border-l border-slate-100 dark:border-slate-800">
                                <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                                  Rp {formatAngka(Math.round(cicilan))}/bln
                                </span>
                              </td>
                            );
                          })}
                          {comparedCars.length < 4 && <td className="border-l border-dashed border-slate-200 dark:border-slate-800" />}
                        </tr>

                        {/* Catatan Pribadi Pembeli */}
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-4 font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Edit3 className="h-3.5 w-3.5 text-slate-400" />
                            <span>Catatan Pribadimu</span>
                          </td>
                          {comparedCars.map((car) => {
                            const noteText = notesState[car.id] ?? car.catatan ?? '';
                            return (
                              <td key={car.id} className="p-4 border-l border-slate-100 dark:border-slate-800">
                                {noteText ? (
                                  <div className="rounded-lg bg-amber-50/80 border border-amber-200/60 p-2 text-[11px] text-amber-900 leading-snug dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200">
                                    "{noteText}"
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[11px] italic">
                                    Belum ada catatan
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          {comparedCars.length < 4 && <td className="border-l border-dashed border-slate-200 dark:border-slate-800" />}
                        </tr>

                        {/* Tahun Pembuatan */}
                        {(!showOnlyDifferences || isSpecDifferent((c) => c.tahun)) && (
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="p-4 font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              <span>Tahun Pembuatan</span>
                            </td>
                            {comparedCars.map((car) => (
                              <td key={car.id} className="p-4 font-bold text-slate-800 dark:text-slate-200 border-l border-slate-100 dark:border-slate-800">
                                {car.tahun}
                              </td>
                            ))}
                            {comparedCars.length < 4 && <td className="border-l border-dashed border-slate-200 dark:border-slate-800" />}
                          </tr>
                        )}

                        {/* Jarak Tempuh */}
                        {(!showOnlyDifferences || isSpecDifferent((c) => c.jarak_tempuh_ribu_km)) && (
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="p-4 font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                              <Gauge className="h-3.5 w-3.5 text-slate-400" />
                              <span>Jarak Tempuh</span>
                            </td>
                            {comparedCars.map((car) => (
                              <td key={car.id} className="p-4 font-bold text-slate-800 dark:text-slate-200 border-l border-slate-100 dark:border-slate-800">
                                {car.jarak_tempuh_ribu_km} rb km
                              </td>
                            ))}
                            {comparedCars.length < 4 && <td className="border-l border-dashed border-slate-200 dark:border-slate-800" />}
                          </tr>
                        )}

                        {/* Transmisi */}
                        {(!showOnlyDifferences || isSpecDifferent((c) => c.transmisi)) && (
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="p-4 font-semibold text-slate-500 dark:text-slate-400">
                              Transmisi
                            </td>
                            {comparedCars.map((car) => (
                              <td key={car.id} className="p-4 text-slate-700 dark:text-slate-300 border-l border-slate-100 dark:border-slate-800">
                                {car.transmisi}
                              </td>
                            ))}
                            {comparedCars.length < 4 && <td className="border-l border-dashed border-slate-200 dark:border-slate-800" />}
                          </tr>
                        )}

                        {/* Posisi Harga Segmen */}
                        {(!showOnlyDifferences || isSpecDifferent((c) => c.posisi_harga?.verdict)) && (
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="p-4 font-semibold text-slate-500 dark:text-slate-400">
                              Posisi Harga di Segmen
                            </td>
                            {comparedCars.map((car) => (
                              <td key={car.id} className="p-4 border-l border-slate-100 dark:border-slate-800">
                                {car.posisi_harga ? (
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                      car.posisi_harga.verdict === 'di bawah rentang'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                        : car.posisi_harga.verdict === 'di atas rentang'
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                    }`}
                                  >
                                    Harga {car.posisi_harga.verdict}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                            ))}
                            {comparedCars.length < 4 && <td className="border-l border-dashed border-slate-200 dark:border-slate-800" />}
                          </tr>
                        )}

                        {/* Lokasi Unit */}
                        {(!showOnlyDifferences || isSpecDifferent((c) => c.lokasi)) && (
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="p-4 font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              <span>Lokasi Dealer</span>
                            </td>
                            {comparedCars.map((car) => (
                              <td key={car.id} className="p-4 text-slate-700 dark:text-slate-300 border-l border-slate-100 dark:border-slate-800">
                                {car.lokasi || 'DKI Jakarta'}
                              </td>
                            ))}
                            {comparedCars.length < 4 && <td className="border-l border-dashed border-slate-200 dark:border-slate-800" />}
                          </tr>
                        )}

                        {/* Section Divider: Kelengkapan Fitur */}
                        <tr className="bg-slate-100 font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                          <td colSpan={comparedCars.length + (comparedCars.length < 4 ? 2 : 1)} className="p-3.5 uppercase tracking-wider text-[11px]">
                            Checklist 11 Fitur Kendaraan
                          </td>
                        </tr>

                        {/* 11 Feature Rows */}
                        {allFeatureNames.map((featName) => {
                          if (showOnlyDifferences && !isFeatureDifferent(featName)) {
                            return null;
                          }

                          return (
                            <tr key={featName} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="p-4 font-medium text-slate-600 dark:text-slate-300">
                                {featName}
                              </td>
                              {comparedCars.map((car) => {
                                const has = carHasFeature(car, featName);
                                return (
                                  <td key={car.id} className="p-4 border-l border-slate-100 dark:border-slate-800">
                                    {has ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                                        <span>Tersedia</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                        <X className="h-3.5 w-3.5" />
                                        <span>Tidak ada</span>
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                              {comparedCars.length < 4 && <td className="border-l border-dashed border-slate-200 dark:border-slate-800" />}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}
          </div>
        ) : (
          /* ========================================================== */
          /* KOLEKSI FAVORIT LIST VIEW                                  */
          /* ========================================================== */
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
                    <span className="block text-[11px] font-medium text-slate-400">Pilihan Komparasi</span>
                    <div className="flex items-center justify-between mt-0.5">
                      <div className="flex items-center gap-1.5">
                        <Scale className="h-4 w-4 text-blue-600" />
                        <span className="font-display text-base font-extrabold text-blue-600 sm:text-lg">
                          {compareList.length}/4
                        </span>
                      </div>
                      {compareList.length >= 2 && (
                        <button
                          type="button"
                          onClick={() => setActiveTab('bandingkan')}
                          className="px-2 py-1 rounded-lg bg-blue-600 text-white font-bold text-[10px] hover:bg-blue-500 cursor-pointer"
                        >
                          Bandingkan
                        </button>
                      )}
                    </div>
                    <span className="block text-[10px] text-slate-400">Langsung di halaman ini</span>
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

            {/* In-Page Compare Banner when 2+ cars are selected */}
            {compareList.length >= 2 && (
              <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50/90 p-3.5 flex flex-wrap items-center justify-between gap-3 dark:border-blue-900 dark:bg-blue-950/40">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <Scale className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {compareList.length} mobil favorit telah kamu pilih
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Bandingkan spesifikasi, harga, dan angsuran langsung di dalam halaman ini.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => clearCompare()}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-white dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Batal Pilih
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('bandingkan')}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 shadow-xs transition-all cursor-pointer"
                  >
                    <Scale className="h-3.5 w-3.5" />
                    <span>Buka Sesi Bandingkan</span>
                  </button>
                </div>
              </div>
            )}

            {/* Toolbar: Sort, View Toggle, Car Counter */}
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
                  <option value="terbaru">Terbaru disimpan</option>
                  <option value="harga_asc">Harga terendah</option>
                  <option value="harga_desc">Harga tertinggi</option>
                  <option value="km_asc">Kilometer terendah</option>
                  <option value="tahun_desc">Tahun terbaru</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 hidden sm:inline">
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
                        src={getCarPhoto(car.nama_mobil, ('foto' in car && car.foto) || ('foto_url' in car && car.foto_url) || ('transmisi' in car ? car.transmisi : null))}
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

                      {/* In-Card Compare Checkbox Chip */}
                      <div className="absolute bottom-2.5 left-2.5 z-10">
                        <label className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs cursor-pointer backdrop-blur-md transition-all ${
                          compared ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-950/75 hover:bg-slate-900'
                        }`}>
                          <input
                            type="checkbox"
                            checked={compared}
                            onChange={() => toggleCompare(car.id)}
                            className="rounded border-slate-400 text-blue-600 focus:ring-0 accent-blue-600 cursor-pointer h-3.5 w-3.5"
                          />
                          <span>{compared ? 'Terpilih Banding' : 'Pilih Banding'}</span>
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
                            Rp {formatAngka(car.harga_rp)}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            ± Rp {formatInstallment(car.harga_rp || 0)}/bln
                          </span>
                        </div>
                      </div>

                      {/* Specs Row */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>{car.tahun}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Gauge className="h-3 w-3 text-slate-400" />
                          <span>{car.jarak_tempuh_ribu_km} rb km</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span>{car.transmisi}</span>
                        </span>
                        <span className="flex items-center gap-1 truncate max-w-[90px]">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          <span className="truncate">{car.lokasi || 'DKI Jakarta'}</span>
                        </span>
                      </div>

                      {/* Segment Price Position */}
                      {item.posisi_harga && (
                        <div className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] border border-slate-100 flex items-center justify-between dark:bg-slate-800/40 dark:border-slate-800">
                          <span className="text-slate-500 dark:text-slate-400">Posisi Harga:</span>
                          <span
                            className={`font-semibold ${
                              item.posisi_harga.verdict === 'di bawah rentang'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : item.posisi_harga.verdict === 'di atas rentang'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-blue-600 dark:text-blue-400'
                            }`}
                          >
                            {item.posisi_harga.verdict === 'di bawah rentang'
                              ? 'Harga Hemat di Segmen'
                              : item.posisi_harga.verdict === 'di atas rentang'
                              ? 'Harga di Atas Rata-rata'
                              : 'Harga Wajar di Segmen'}
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
                          placeholder="Tulis catatan (misal: warna favorit, kondisi mesin halus, siap negosiasi)..."
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
                                            Rp {formatAngka(alt.harga_rp)} • {alt.tahun}
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
                          src={getCarPhoto(rec.nama_mobil, rec.foto || rec.foto_url || rec.transmisi)}
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
                            Rp {formatAngka(rec.harga_rp)}
                          </span>
                          <span className="text-[10px] text-slate-400">{rec.tahun}</span>
                        </div>

                        {/* Reason Chips */}
                        {((rec.alasan_teks && rec.alasan_teks.length > 0) || (rec.alasan && rec.alasan.length > 0)) && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {(rec.alasan_teks || rec.alasan || []).map((reason, rIdx) => {
                              const text = typeof reason === 'string'
                                ? reason
                                : reason.kode === 'lebih_murah'
                                ? `Lebih hemat Rp ${Math.round(reason.nilai / 1e6)} Jt`
                                : reason.kode === 'tahun_lebih_muda' || reason.kode === 'lebih_baru'
                                ? `${reason.nilai} tahun lebih muda`
                                : reason.kode === 'km_lebih_rendah'
                                ? `Odometer ${Math.round(reason.nilai)} rb km lebih rendah`
                                : reason.kode === 'fitur_lebih_banyak'
                                ? `${reason.nilai} fitur lebih lengkap`
                                : 'Karakteristik sepadan';
                              return (
                                <span
                                  key={rIdx}
                                  className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                                >
                                  {text}
                                </span>
                              );
                            })}
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
    </div>
  );
}
