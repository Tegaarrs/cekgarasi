import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import {
  Scale,
  Copy,
  Check,
  X,
  Plus,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Gauge,
  Sparkles,
  Search,
  Filter,
  Lightbulb,
  Crown,
  Users,
  Wallet,
  Calculator,
  ChevronDown,
  Info,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import { apiFetch } from '@/services/api';
import {
  getCompareIds,
  removeCompare,
  addCompare,
  clearCompare,
  subscribeCompare,
} from '@/services/compareStore';
import { notifyToast } from '@/services/favoriteStore';
import { getCarPhoto } from '@/utils/carPhoto';
import { calculateInstallment } from '@/lib/finance';
import { buatRingkasanBanding } from '@/lib/ringkasanBanding';
import {
  fetchCarsByIds,
  formatAngka,
  NormalizedCompareCar,
} from '@/lib/normalizeBanding';
import { SegmentBadge } from '@/components/motion/SegmentBadge';
import { Skeleton } from '@/components/motion/Skeleton';

type ComparedCar = NormalizedCompareCar;

interface SimilarCarSuggestion {
  id: number;
  nama_mobil: string;
  tahun: number;
  harga_rp: number;
  jarak_tempuh_ribu_km: number;
  transmisi: string;
  klaster: number;
  nama_segmen?: string;
  foto?: string | null;
}

interface SegmentDetail {
  klaster: number;
  slug: string;
  nama_lengkap: string;
  nama_pendek: string;
  warna_hex: string;
  deskripsi: string;
  count: number;
  share: number;
  median_harga: number;
  q1_harga: number;
  q3_harga: number;
  median_tahun: number;
  mean_km: number;
  mean_total_fitur: number;
  top_3_model: Array<{ model: string; count: number }>;
  terbesar?: boolean;
}

interface SegmenApiResponse {
  segmen: SegmentDetail[];
  total_mobil: number;
}

interface SebaranCarPoint {
  id: number;
  nama_mobil: string;
  tahun: number;
  harga_rp: number;
  klaster: number;
}

interface ChartPoint extends SebaranCarPoint {
  x: number;
  y: number;
  kelasLabel: string;
}

const CATEGORY_MARKETING: Record<
  number,
  {
    title: string;
    shortTitle: string;
    subtitle: string;
    colorHex: string;
    badgeBg: string;
    badgeText: string;
    slug: string;
    icon: typeof Crown;
  }
> = {
  0: {
    title: 'Kelas Premium & SUV',
    shortTitle: 'Premium & SUV',
    subtitle: 'SUV, Sedan & MPV kelas atas dengan fitur keamanan dan kenyamanan paling lengkap.',
    colorHex: '#2563EB',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/60',
    badgeText: 'text-blue-700 dark:text-blue-300',
    slug: 'premium',
    icon: Crown,
  },
  1: {
    title: 'Kelas Keluarga & MPV',
    shortTitle: 'Keluarga & MPV',
    subtitle: 'Mobil keluarga tahun muda, kabin lapang 7-penumpang, dan efisiensi BBM terbaik.',
    colorHex: '#10B981',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    slug: 'keluarga-muda',
    icon: Users,
  },
  2: {
    title: 'Kelas Hemat & Harian',
    shortTitle: 'Hemat & Harian',
    subtitle: 'City car dan mobil harian dengan harga terjangkau, pajak ringan, serta perawatan mudah.',
    colorHex: '#F59E0B',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/60',
    badgeText: 'text-amber-700 dark:text-amber-300',
    slug: 'ekonomis',
    icon: Wallet,
  },
};

function getPriceVerdictLabel(verdict?: string): {
  label: string;
  className: string;
} {
  if (verdict === 'di bawah rentang') {
    return {
      label: 'Lebih Hemat dari Pasaran',
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    };
  }
  if (verdict === 'di atas rentang') {
    return {
      label: 'Di Atas Harga Pasaran',
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    };
  }
  return {
    label: 'Harga Pasaran Wajar',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
  };
}

export function BandingkanPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const compareSectionRef = useRef<HTMLDivElement>(null);

  const idsParam = searchParams.get('ids');
  const aktifParam = searchParams.get('aktif') || 'premium';

  const initialIds = useMemo(() => {
    if (idsParam) {
      return idsParam
        .split(',')
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !isNaN(id) && id > 0)
        .slice(0, 4);
    }
    return getCompareIds().slice(0, 4);
  }, [idsParam]);

  // Comparison state
  const [comparedCars, setComparedCars] = useState<ComparedCar[]>([]);
  const [loadingCompare, setLoadingCompare] = useState<boolean>(true);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showOnlyDifferences, setShowOnlyDifferences] = useState<boolean>(false);
  const [dpPercent, setDpPercent] = useState<number>(20);
  const [tenorTahun, setTenorTahun] = useState<number>(4);

  // Add Car Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SimilarCarSuggestion[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<SimilarCarSuggestion[]>([]);

  // Market Price Guide & Category Explorer state (formerly SegmenPage)
  const [marketData, setMarketData] = useState<SegmenApiResponse | null>(null);
  const [scatterPointsRaw, setScatterPointsRaw] = useState<SebaranCarPoint[]>([]);
  const [loadingMarket, setLoadingMarket] = useState<boolean>(true);
  const [showPriceGuideInfo, setShowPriceGuideInfo] = useState<boolean>(false);

  // Sync compareStore updates with URL
  useEffect(() => {
    const unsub = subscribeCompare(() => {
      const current = getCompareIds();
      const nextIds = current.join(',');
      if (nextIds !== (searchParams.get('ids') || '')) {
        const nextParams = new URLSearchParams(searchParams);
        if (nextIds) {
          nextParams.set('ids', nextIds);
        } else {
          nextParams.delete('ids');
        }
        setSearchParams(nextParams, { replace: true });
      }
    });
    return unsub;
  }, [searchParams, setSearchParams]);

  // Fetch selected cars for side-by-side comparison (supports 1..4 cars)
  const loadComparedCars = useCallback(async (ids: number[]) => {
    if (ids.length === 0) {
      setComparedCars([]);
      setLoadingCompare(false);
      return;
    }
    setLoadingCompare(true);
    try {
      const data = await fetchCarsByIds(ids);
      setComparedCars(data);
    } catch {
      notifyToast({
        show: true,
        message: 'Gagal memuat data perbandingan unit mobil.',
        type: 'error',
      });
    } finally {
      setLoadingCompare(false);
    }
  }, []);

  useEffect(() => {
    loadComparedCars(initialIds);
  }, [initialIds, loadComparedCars]);

  // Fetch market category benchmarks and 610-unit price distribution
  useEffect(() => {
    setLoadingMarket(true);
    Promise.all([
      apiFetch<any>('/segmen'),
      apiFetch<SebaranCarPoint[]>('/segmen/sebaran'),
    ])
      .then(([segRes, sebaranRes]) => {
        if (segRes) {
          if (Array.isArray(segRes.segmen)) {
            setMarketData(segRes);
          } else if (Array.isArray(segRes)) {
            setMarketData({ segmen: segRes, total_mobil: 610 });
          }
        }
        if (Array.isArray(sebaranRes)) {
          setScatterPointsRaw(sebaranRes);
        }
      })
      .catch((err) => {
        console.error('Failed to load market category data:', err);
      })
      .finally(() => {
        setLoadingMarket(false);
      });
  }, []);

  // Fetch similar suggestions if 1..3 cars compared
  useEffect(() => {
    if (comparedCars.length > 0 && comparedCars.length < 4) {
      const firstCarId = comparedCars[0].id;
      const excludeIds = comparedCars.map((c) => c.id).join(',');
      apiFetch<SimilarCarSuggestion[]>(
        `/mobil/${firstCarId}/serupa?n=6&exclude=${excludeIds}`
      )
        .then((res) => {
          if (Array.isArray(res)) setSuggestions(res);
        })
        .catch(() => {});
    } else {
      setSuggestions([]);
    }
  }, [comparedCars]);

  // Modal live search
  useEffect(() => {
    if (!searchKeyword.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiFetch<{ items: SimilarCarSuggestion[] }>(
          `/cari?q=${encodeURIComponent(searchKeyword.trim())}&page_size=8`
        );
        if (res && Array.isArray(res.items)) {
          const existingIds = comparedCars.map((c) => c.id);
          setSearchResults(res.items.filter((item) => !existingIds.includes(item.id)));
        }
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchKeyword, comparedCars]);

  const activeCategory = useMemo(() => {
    if (!marketData || !marketData.segmen.length) return null;
    const match = marketData.segmen.find((s) => s.slug === aktifParam);
    return match || marketData.segmen[0];
  }, [marketData, aktifParam]);

  const activeKlaster = activeCategory ? activeCategory.klaster : 0;

  const handleCategoryTabClick = (slug: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('aktif', slug);
    setSearchParams(nextParams, { replace: true });
  };

  // Scatter plot points with deterministic spread so same-year points stay legible
  const chartPoints = useMemo<ChartPoint[]>(() => {
    return scatterPointsRaw.map((car) => {
      const pseudo = Math.sin(car.id * 12.9898 + car.tahun * 78.233) * 43758.5453;
      const frac = pseudo - Math.floor(pseudo);
      const offset = (frac - 0.5) * 0.45;
      const meta = CATEGORY_MARKETING[car.klaster] || CATEGORY_MARKETING[0];
      return {
        ...car,
        x: car.tahun + offset,
        y: Math.round(car.harga_rp / 1_000_000),
        kelasLabel: meta.shortTitle,
      };
    });
  }, [scatterPointsRaw]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    notifyToast({
      show: true,
      message: 'Tautan perbandingan & harga pasar berhasil disalin!',
      type: 'success',
    });
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const updateCompareUrl = (ids: number[]) => {
    const nextParams = new URLSearchParams(searchParams);
    if (ids.length > 0) {
      nextParams.set('ids', ids.join(','));
    } else {
      nextParams.delete('ids');
    }
    setSearchParams(nextParams);
  };

  const handleRemove = (carId: number) => {
    removeCompare(carId);
    updateCompareUrl(initialIds.filter((id) => id !== carId));
  };

  const handleClearAll = () => {
    clearCompare();
    updateCompareUrl([]);
  };

  const handleAddCar = (carId: number, scrollUp = false) => {
    if (initialIds.includes(carId)) {
      notifyToast({
        show: true,
        message: 'Mobil ini sudah ada di daftar perbandingan.',
        type: 'info',
      });
      return;
    }
    if (initialIds.length >= 4) {
      notifyToast({
        show: true,
        message: 'Maksimal 4 mobil dapat dibandingkan sekaligus.',
        type: 'info',
      });
      return;
    }
    addCompare(carId);
    const updated = [...initialIds, carId].slice(0, 4);
    updateCompareUrl(updated);
    setIsAddModalOpen(false);
    setSearchKeyword('');
    notifyToast({
      show: true,
      message: 'Mobil ditambahkan ke meja perbandingan.',
      type: 'success',
    });
    if (scrollUp) {
      compareSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Pick a car matching a popular model name right from the market category list
  const handleAddModelFromMarket = (modelName: string) => {
    const existingSet = new Set(initialIds);
    const candidate =
      scatterPointsRaw.find(
        (c) =>
          c.klaster === activeKlaster &&
          c.nama_mobil.toLowerCase().includes(modelName.toLowerCase()) &&
          !existingSet.has(c.id)
      ) ||
      scatterPointsRaw.find(
        (c) =>
          c.nama_mobil.toLowerCase().includes(modelName.toLowerCase()) &&
          !existingSet.has(c.id)
      );

    if (candidate) {
      handleAddCar(candidate.id, true);
    } else {
      setSearchKeyword(modelName);
      setIsAddModalOpen(true);
    }
  };

  // Load a 3-car sample comparison preset for any category in 1 click
  const handleLoadQuickBundle = (klasterId: number) => {
    const pool = scatterPointsRaw
      .filter((c) => c.klaster === klasterId)
      .sort((a, b) => a.harga_rp - b.harga_rp);

    if (pool.length === 0) return;

    // Pick 3 distinct models at budget, median, and upper price points
    const picks: SebaranCarPoint[] = [];
    const seenNames = new Set<string>();
    const targetIndices = [
      Math.floor(pool.length * 0.2),
      Math.floor(pool.length * 0.5),
      Math.floor(pool.length * 0.8),
    ];

    for (const startIdx of targetIndices) {
      for (let i = startIdx; i < pool.length; i++) {
        const key = pool[i].nama_mobil.split(' ').slice(0, 2).join(' ').toLowerCase();
        if (!seenNames.has(key)) {
          seenNames.add(key);
          picks.push(pool[i]);
          break;
        }
      }
    }

    const fallbackSlice = pool.slice(0, 3);
    const chosenIds = (picks.length >= 2 ? picks : fallbackSlice).map((p) => p.id);

    clearCompare();
    chosenIds.forEach((id) => addCompare(id));
    updateCompareUrl(chosenIds);
    compareSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Rule-based comparison summary
  const summary = useMemo(() => {
    if (comparedCars.length < 2) return null;
    return buatRingkasanBanding(comparedCars);
  }, [comparedCars]);

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

  const totalMobil = marketData?.total_mobil || scatterPointsRaw.length || 610;
  const activeMeta = CATEGORY_MARKETING[activeKlaster] || CATEGORY_MARKETING[0];

  return (
    <div className="min-h-screen bg-[#F5F5F3] dark:bg-[#070709] pb-24 pt-6 transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Top Showroom Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors dark:text-zinc-400 dark:hover:text-white cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali</span>
            </button>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold mb-2 border border-blue-200/70 dark:border-blue-800/70 ml-2">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Panduan Harga &amp; Komparasi Unit Showroom</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
              Bandingkan Mobil &amp; Panduan Harga Pasaran
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              Pahami standar harga pasaran dari {totalMobil} unit mobil bekas pilihan berdasarkan kelas kendaraan, lalu bandingkan spesifikasi serta simulasi cicilan hingga 4 mobil secara berdampingan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer shadow-xs"
            >
              {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-zinc-400" />}
              <span>{copiedLink ? 'Tautan Disalin!' : 'Salin Tautan'}</span>
            </button>

            {comparedCars.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Kosongkan ({comparedCars.length})</span>
              </button>
            )}

            {comparedCars.length < 4 && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-bold text-white shadow-sm cursor-pointer active:scale-95 transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Mobil ({comparedCars.length}/4)</span>
              </button>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 1: SIDE-BY-SIDE COMPARISON MATRIX & INSTALLMENTS     */}
        {/* ============================================================ */}
        <section ref={compareSectionRef} className="space-y-5 scroll-mt-20">
          {loadingCompare ? (
            <div className="space-y-4">
              <Skeleton height={110} className="w-full rounded-2xl" />
              <Skeleton height={340} className="w-full rounded-2xl" />
            </div>
          ) : comparedCars.length === 0 ? (
            /* Quick Starter Compare Hub when 0 cars are selected yet */
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111D3D] p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="space-y-2 max-w-xl">
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-950/70 px-3 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800">
                    <Scale className="h-3.5 w-3.5" />
                    <span>Meja Perbandingan Mobil (0/4 Terpilih)</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                    Pilih Mobil dari Katalog atau Mulai dengan Paket Populer
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Anda dapat memilih mobil secara manual, mengklik titik harga di Peta Harga Pasaran di bawah, atau langsung mencoba paket perbandingan populer sesuai kelas mobil berikut:
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Cari &amp; Pilih Mobil</span>
                  </button>
                  <Link
                    to="/cari"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>Buka Katalog Lengkap</span>
                  </Link>
                </div>
              </div>

              {/* 1-Click Preset Bundles aligned with 3 Market Categories */}
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3">
                {[0, 1, 2].map((klasterId) => {
                  const meta = CATEGORY_MARKETING[klasterId];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={klasterId}
                      type="button"
                      onClick={() => handleLoadQuickBundle(klasterId)}
                      disabled={scatterPointsRaw.length === 0}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-900/70 p-3.5 text-left hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-2xs"
                          style={{ backgroundColor: meta.colorHex }}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-xs font-bold text-slate-900 dark:text-white truncate">
                            Bandingkan 3 Unit {meta.shortTitle}
                          </span>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            Klik untuk isi otomatis ke tabel bandingkan
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Rule-Based Summary Highlights (shown when >= 2 cars selected) */}
              {summary && (
                <div className="rounded-2xl border border-blue-200/80 dark:border-blue-900/60 bg-gradient-to-r from-blue-50/90 via-white to-indigo-50/60 dark:from-blue-950/40 dark:via-[#111D3D] dark:to-slate-900 p-5 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-300 mb-3">
                    <Sparkles className="h-4 w-4" />
                    <span>Ringkasan Pilihan Terbaik ({comparedCars.length} Mobil Dibandingkan)</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                    {summary.palingHemat && (
                      <div className="rounded-xl bg-white dark:bg-slate-800/80 p-3 border border-slate-200/70 dark:border-slate-700 shadow-2xs">
                        <span className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                          Harga Paling Hemat
                        </span>
                        <span className="mt-1 block text-xs font-bold text-slate-900 dark:text-white">
                          {summary.palingHemat.text}
                        </span>
                      </div>
                    )}

                    {summary.kmTerendah && (
                      <div className="rounded-xl bg-white dark:bg-slate-800/80 p-3 border border-slate-200/70 dark:border-slate-700 shadow-2xs">
                        <span className="block text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                          Pemakaian Paling Sedikit
                        </span>
                        <span className="mt-1 block text-xs font-bold text-slate-900 dark:text-white">
                          {summary.kmTerendah.text}
                        </span>
                      </div>
                    )}

                    {summary.tahunPalingMuda && (
                      <div className="rounded-xl bg-white dark:bg-slate-800/80 p-3 border border-slate-200/70 dark:border-slate-700 shadow-2xs">
                        <span className="block text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                          Tahun Rakitan Termuda
                        </span>
                        <span className="mt-1 block text-xs font-bold text-slate-900 dark:text-white">
                          {summary.tahunPalingMuda.text}
                        </span>
                      </div>
                    )}

                    {summary.fiturTerlengkap && (
                      <div className="rounded-xl bg-white dark:bg-slate-800/80 p-3 border border-slate-200/70 dark:border-slate-700 shadow-2xs">
                        <span className="block text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                          Fitur Paling Lengkap
                        </span>
                        <span className="mt-1 block text-xs font-bold text-slate-900 dark:text-white">
                          {summary.fiturTerlengkap.text}
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300 font-medium border-t border-blue-100/80 dark:border-slate-800 pt-2.5 flex items-start gap-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>{summary.kesimpulan}</span>
                  </p>
                </div>
              )}

              {/* Shared Finance Controls & Differences Toggle */}
              <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111D3D] p-5 shadow-xs">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Simulasi Angsuran Kredit (Bunga Efektif 8% p.a.)
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Sesuaikan Uang Muka (DP) dan lama cicilan untuk membandingkan angsuran bulanan semua unit secara bersamaan.
                    </p>
                  </div>

                  {comparedCars.length >= 2 && (
                    <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto">
                      <div className="relative inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={showOnlyDifferences}
                          onChange={(e) => setShowOnlyDifferences(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Filter className="h-3.5 w-3.5" />
                        <span>Tampilkan hanya yang berbeda</span>
                      </span>
                    </label>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      <span>Uang Muka / Down Payment (DP):</span>
                      <span className="text-blue-600 dark:text-blue-400 font-bold">{dpPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={50}
                      step={5}
                      value={dpPercent}
                      onChange={(e) => setDpPercent(Number(e.target.value))}
                      aria-label="Persentase DP"
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>10%</span>
                      <span>30%</span>
                      <span>50%</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      <span>Jangka Waktu Kredit (Tenor):</span>
                      <span className="text-blue-600 dark:text-blue-400 font-bold">{tenorTahun} Tahun ({tenorTahun * 12} Bulan)</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={tenorTahun}
                      onChange={(e) => setTenorTahun(Number(e.target.value))}
                      aria-label="Tenor Pinjaman"
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

              {/* Side-by-Side Comparison Matrix */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111D3D] shadow-sm">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/40">
                      <th className="w-48 min-w-[180px] p-4 font-bold text-slate-600 dark:text-slate-300">
                        Spesifikasi &amp; Poin Perbandingan
                      </th>
                      {comparedCars.map((car) => {
                        const angsuran = calculateInstallment(
                          car.harga_rp,
                          dpPercent,
                          tenorTahun * 12,
                          0.08
                        );
                        return (
                          <th
                            key={car.id}
                            className="min-w-[230px] p-4 align-top font-normal border-l border-slate-100 dark:border-slate-800"
                          >
                            <div className="space-y-3">
                              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                                <img
                                  src={getCarPhoto(car.nama_mobil, car.foto || car.transmisi)}
                                  alt={car.nama_mobil}
                                  className="h-full w-full object-cover"
                                />
                                <div className="absolute top-2 left-2">
                                  <SegmentBadge klaster={car.klaster} nama={car.nama_segmen} size="sm" />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemove(car.id)}
                                  aria-label={`Hapus ${car.nama_mobil} dari perbandingan`}
                                  className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-slate-500 shadow-md hover:bg-rose-600 hover:text-white transition-colors cursor-pointer dark:bg-slate-900/90"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              <div>
                                <Link
                                  to={`/mobil/${car.id}`}
                                  className="font-bold text-sm text-slate-900 hover:text-blue-600 line-clamp-1 dark:text-white"
                                >
                                  {car.nama_mobil}
                                </Link>
                                <div className="mt-1">
                                  <span className="font-extrabold text-base text-slate-900 dark:text-white">
                                    Rp {formatAngka(car.harga_rp)}
                                  </span>
                                  <span className="block text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                                    Cicilan ~Rp {Math.round(angsuran / 1000).toLocaleString('id-ID')} rb/bln
                                  </span>
                                </div>
                              </div>

                              <Link
                                to={`/mobil/${car.id}`}
                                className="block w-full rounded-lg bg-blue-600 py-1.5 text-center text-[11px] font-bold text-white hover:bg-blue-500 transition-colors"
                              >
                                Lihat Detail Unit
                              </Link>
                            </div>
                          </th>
                        );
                      })}

                      {Array.from({ length: 4 - comparedCars.length }).map((_, idx) => (
                        <th
                          key={`add-col-${idx}`}
                          className="min-w-[195px] p-4 align-middle text-center bg-slate-50/40 dark:bg-slate-900/40 border-l border-dashed border-slate-200 dark:border-slate-800"
                        >
                          <button
                            type="button"
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all cursor-pointer dark:border-slate-700"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                              <Plus className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Tambah Mobil ({comparedCars.length + idx + 1}/4)
                            </span>
                            <span className="text-[10px] text-slate-400">Cari di katalog atau pilih di bawah</span>
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {/* Harga Penawaran */}
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3.5 font-semibold text-slate-500 dark:text-slate-400">
                        Harga Penawaran Tunai
                      </td>
                      {comparedCars.map((car) => (
                        <td key={car.id} className="p-3.5 font-extrabold text-blue-600 dark:text-blue-400 border-l border-slate-100 dark:border-slate-800">
                          Rp {formatAngka(car.harga_rp)}
                        </td>
                      ))}
                      {Array.from({ length: 4 - comparedCars.length }).map((_, i) => (
                        <td key={i} className="p-3.5 text-slate-300 border-l border-dashed border-slate-200 dark:border-slate-800">-</td>
                      ))}
                    </tr>

                    {/* Evaluasi Harga Pasaran */}
                    {(!showOnlyDifferences || isSpecDifferent((c) => c.posisi_harga?.verdict)) && (
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 bg-blue-50/20 dark:bg-blue-950/10">
                        <td className="p-3.5 font-semibold text-slate-500 dark:text-slate-400">
                          Evaluasi Harga Pasaran
                        </td>
                        {comparedCars.map((car) => {
                          const v = getPriceVerdictLabel(car.posisi_harga?.verdict);
                          return (
                            <td key={car.id} className="p-3.5 border-l border-slate-100 dark:border-slate-800">
                              {car.posisi_harga ? (
                                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${v.className}`}>
                                  {v.label}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          );
                        })}
                        {Array.from({ length: 4 - comparedCars.length }).map((_, i) => (
                          <td key={i} className="p-3.5 text-slate-300 border-l border-dashed border-slate-200 dark:border-slate-800">-</td>
                        ))}
                      </tr>
                    )}

                    {/* Tahun Rakitan */}
                    {(!showOnlyDifferences || isSpecDifferent((c) => c.tahun)) && (
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3.5 font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>Tahun Rakitan</span>
                        </td>
                        {comparedCars.map((car) => (
                          <td key={car.id} className="p-3.5 font-bold text-slate-800 dark:text-slate-200 border-l border-slate-100 dark:border-slate-800">
                            {car.tahun}
                          </td>
                        ))}
                        {Array.from({ length: 4 - comparedCars.length }).map((_, i) => (
                          <td key={i} className="p-3.5 text-slate-300 border-l border-dashed border-slate-200 dark:border-slate-800">-</td>
                        ))}
                      </tr>
                    )}

                    {/* Jarak Tempuh */}
                    {(!showOnlyDifferences || isSpecDifferent((c) => c.jarak_tempuh_ribu_km)) && (
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3.5 font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Gauge className="h-3.5 w-3.5 text-slate-400" />
                          <span>Jarak Tempuh (Odometer)</span>
                        </td>
                        {comparedCars.map((car) => (
                          <td key={car.id} className="p-3.5 font-bold text-slate-800 dark:text-slate-200 border-l border-slate-100 dark:border-slate-800">
                            {car.jarak_tempuh_ribu_km} rb km
                          </td>
                        ))}
                        {Array.from({ length: 4 - comparedCars.length }).map((_, i) => (
                          <td key={i} className="p-3.5 text-slate-300 border-l border-dashed border-slate-200 dark:border-slate-800">-</td>
                        ))}
                      </tr>
                    )}

                    {/* Transmisi */}
                    {(!showOnlyDifferences || isSpecDifferent((c) => c.transmisi)) && (
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3.5 font-semibold text-slate-500 dark:text-slate-400">
                          Transmisi
                        </td>
                        {comparedCars.map((car) => (
                          <td key={car.id} className="p-3.5 text-slate-700 dark:text-slate-300 border-l border-slate-100 dark:border-slate-800">
                            {car.transmisi}
                          </td>
                        ))}
                        {Array.from({ length: 4 - comparedCars.length }).map((_, i) => (
                          <td key={i} className="p-3.5 text-slate-300 border-l border-dashed border-slate-200 dark:border-slate-800">-</td>
                        ))}
                      </tr>
                    )}

                    {/* Lokasi Unit */}
                    {(!showOnlyDifferences || isSpecDifferent((c) => c.lokasi)) && (
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3.5 font-semibold text-slate-500 dark:text-slate-400">
                          Lokasi Showroom
                        </td>
                        {comparedCars.map((car) => (
                          <td key={car.id} className="p-3.5 text-slate-700 dark:text-slate-300 border-l border-slate-100 dark:border-slate-800">
                            {car.lokasi || 'DKI Jakarta'}
                          </td>
                        ))}
                        {Array.from({ length: 4 - comparedCars.length }).map((_, i) => (
                          <td key={i} className="p-3.5 text-slate-300 border-l border-dashed border-slate-200 dark:border-slate-800">-</td>
                        ))}
                      </tr>
                    )}

                    {/* Kelengkapan Fitur */}
                    <tr className="bg-slate-100/80 font-bold text-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
                      <td colSpan={5} className="p-3 text-xs uppercase tracking-wider">
                        Kelengkapan Fitur ({allFeatureNames.length} Fitur Kenyamanan &amp; Keselamatan)
                      </td>
                    </tr>

                    {allFeatureNames.map((featName) => {
                      if (showOnlyDifferences && !isFeatureDifferent(featName)) {
                        return null;
                      }
                      return (
                        <tr key={featName} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-3 font-medium text-slate-600 dark:text-slate-400 truncate max-w-[180px]">
                            {featName}
                          </td>
                          {comparedCars.map((car) => {
                            const has = carHasFeature(car, featName);
                            return (
                              <td key={car.id} className="p-3 border-l border-slate-100 dark:border-slate-800">
                                {has ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                    <Check className="h-4 w-4" />
                                    <span className="text-[11px]">Tersedia</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-slate-300 dark:text-slate-600">
                                    <X className="h-4 w-4" />
                                    <span className="text-[11px]">Tidak Ada</span>
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          {Array.from({ length: 4 - comparedCars.length }).map((_, i) => (
                            <td key={i} className="p-3 text-slate-300 border-l border-dashed border-slate-200 dark:border-slate-800">-</td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Suggested Alternatives */}
              {suggestions.length > 0 && comparedCars.length < 4 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#111D3D]">
                  <div className="mb-3.5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Alternatif Mobil Sekelas yang Layak Dipertimbangkan
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Unit dengan kisaran budget dan tahun berdekatan untuk melengkapi perbandingan Anda.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {suggestions.slice(0, 3).map((sug) => (
                      <div
                        key={sug.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-800/50 transition-colors"
                      >
                        <img
                          src={getCarPhoto(sug.nama_mobil, sug.foto || sug.transmisi)}
                          alt={sug.nama_mobil}
                          className="h-12 w-14 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-bold text-slate-900 dark:text-white">
                            {sug.nama_mobil}
                          </span>
                          <span className="block text-[11px] font-extrabold text-blue-600 dark:text-blue-400">
                            Rp {formatAngka(sug.harga_rp)}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {sug.tahun} • {sug.jarak_tempuh_ribu_km} rb km
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddCar(sug.id)}
                          className="flex-shrink-0 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-blue-500 transition-colors cursor-pointer"
                        >
                          + Bandingkan
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ============================================================ */}
        {/* SECTION 2: PANDUAN PASARAN HARGA & KATEGORI MOBIL BEKAS      */}
        {/* (Merged & Redesigned from SegmenPage.tsx)                    */}
        {/* ============================================================ */}
        <section className="space-y-5 pt-4 border-t border-slate-200/80 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold mb-1.5 border border-indigo-200/60 dark:border-indigo-800/60">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Panduan Pasaran Harga Mobil Bekas ({totalMobil} Unit)</span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Pahami Kelas Mobil &amp; Standar Harga Wajar Sebelum Membeli
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
                Pilih salah satu kelas pasar di bawah untuk melihat patokan harga showroom yang wajar, model mobil paling diminati, lalu klik model atau titik harga untuk langsung membandingkannya di atas.
              </p>
            </div>
          </div>

          {/* 3 Category Selection Tabs */}
          {loadingMarket ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} height={92} className="rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {marketData?.segmen.map((seg) => {
                const isSelected = activeCategory?.slug === seg.slug;
                const meta = CATEGORY_MARKETING[seg.klaster] || CATEGORY_MARKETING[0];
                const Icon = meta.icon;
                return (
                  <button
                    key={seg.slug}
                    type="button"
                    onClick={() => handleCategoryTabClick(seg.slug)}
                    className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${
                      isSelected
                        ? 'border-transparent text-white shadow-md scale-[1.01]'
                        : 'bg-white dark:bg-[#111D3D] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-400 dark:hover:border-blue-500'
                    }`}
                    style={{
                      backgroundColor: isSelected ? meta.colorHex : undefined,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                            isSelected ? 'bg-white/20 text-white' : `${meta.badgeBg} ${meta.badgeText}`
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-sm font-extrabold block leading-tight">
                            {meta.title}
                          </span>
                          <span
                            className={`text-[11px] block mt-0.5 ${
                              isSelected ? 'text-white/85' : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {seg.count} unit siap pilih ({Math.round(seg.share * 100)}% stok showroom)
                          </span>
                        </div>
                      </div>
                      {seg.terbesar && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            isSelected
                              ? 'bg-amber-300 text-slate-900'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          Paling Diminati
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Redesigned 12-Col Grid: Category Price Benchmark Details (Left) + Market Price Chart (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 cols: Market Category Benchmark Card */}
            <div className="lg:col-span-7">
              {loadingMarket || !activeCategory ? (
                <Skeleton height={440} className="w-full rounded-2xl" />
              ) : (
                <div className="bg-white dark:bg-[#111D3D] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-5">
                  {/* Category Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: activeMeta.colorHex }}
                        />
                        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                          {activeMeta.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        {activeMeta.subtitle}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/cari?segmen=${activeCategory.slug}`)}
                      className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-all hover:opacity-90 cursor-pointer self-start sm:self-auto whitespace-nowrap"
                      style={{ backgroundColor: activeMeta.colorHex }}
                    >
                      <span>Lihat {activeCategory.count} Stok</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Standar Harga Pasaran (Low / Fair / High) */}
                  <div className="space-y-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 block">
                      Standar Harga Pasaran di Kelas Ini (Harga Penawaran Showroom)
                    </span>
                    <div className="bg-slate-50 dark:bg-slate-900/70 rounded-xl p-3.5 border border-slate-200/70 dark:border-slate-800">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center">
                        <div className="bg-white dark:bg-slate-800/80 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block uppercase">
                            Harga Termurah Pasar
                          </span>
                          <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white block mt-0.5">
                            Rp {Math.round(activeCategory.q1_harga / 1e6)} Jt
                          </span>
                          <span className="text-[10px] text-slate-400">Kisaran unit paling ekonomis</span>
                        </div>

                        <div className="bg-blue-50/90 dark:bg-blue-950/60 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                          <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 block uppercase">
                            Harga Pasaran Wajar
                          </span>
                          <span className="text-sm sm:text-base font-black text-blue-700 dark:text-blue-300 block mt-0.5">
                            Rp {Math.round(activeCategory.median_harga / 1e6)} Jt
                          </span>
                          <span className="text-[10px] text-blue-600/80 dark:text-blue-300/80">Patokan tengah pasar</span>
                        </div>

                        <div className="bg-white dark:bg-slate-800/80 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase">
                            Batas Harga Atas
                          </span>
                          <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white block mt-0.5">
                            Rp {Math.round(activeCategory.q3_harga / 1e6)} Jt
                          </span>
                          <span className="text-[10px] text-slate-400">Unit tahun muda / fitur penuh</span>
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block text-center mt-2.5">
                        Mayoritas unit di kelas ini ditawarkan pada kisaran{' '}
                        <strong className="text-slate-700 dark:text-slate-200">
                          Rp {Math.round(activeCategory.q1_harga / 1e6)} Jt hingga Rp {Math.round(activeCategory.q3_harga / 1e6)} Jt
                        </strong>.
                      </span>
                    </div>
                  </div>

                  {/* Summary Tiles */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] mb-1">
                        <Calculator className="w-3.5 h-3.5" />
                        <span>Patokan Harga</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        Rp {Math.round(activeCategory.median_harga / 1e6)} Juta
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] mb-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Tahun Umum</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {activeCategory.median_tahun}
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] mb-1">
                        <Gauge className="w-3.5 h-3.5" />
                        <span>Rata-rata KM</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {typeof activeCategory.mean_km === 'number'
                          ? activeCategory.mean_km.toFixed(1)
                          : '45'} rb km
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Kelengkapan Fitur</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {typeof activeCategory.mean_total_fitur === 'number'
                          ? activeCategory.mean_total_fitur.toFixed(1)
                          : '3.0'} / 11 fitur
                      </div>
                    </div>
                  </div>

                  {/* Top Popular Models with 1-click "+ Bandingkan" */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                        Model Paling Laris di {activeMeta.shortTitle}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Klik + Bandingkan untuk cek spesifikasi langsung
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {(activeCategory.top_3_model || []).map((m, idx) => (
                        <div
                          key={m.model}
                          className="flex flex-col justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                                {m.model}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                              {m.count} unit
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => handleAddModelFromMarket(m.model)}
                              className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-500 py-1.5 px-2 text-[11px] font-bold text-white transition-colors cursor-pointer"
                            >
                              + Bandingkan
                            </button>
                            <Link
                              to={`/cari?q=${encodeURIComponent(m.model)}`}
                              className="rounded-lg border border-slate-200 dark:border-slate-600 px-2 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                            >
                              Stok
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right 5 cols: Interactive Market Price vs Year Distribution */}
            <div className="lg:col-span-5 bg-white dark:bg-[#111D3D] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Peta Sebaran Harga Pasar ({totalMobil} Mobil)</span>
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    Tahun Rakitan vs Harga Penawaran (Juta Rp). Klik titik mobil untuk langsung membandingkan.
                  </span>
                </div>
                <span
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white shadow-2xs whitespace-nowrap"
                  style={{ backgroundColor: activeMeta.colorHex }}
                >
                  {activeMeta.shortTitle}
                </span>
              </div>

              <div className="h-72 w-full pt-1">
                {loadingMarket ? (
                  <Skeleton height={280} className="w-full rounded-xl" />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <ScatterChart margin={{ top: 10, right: 12, bottom: 16, left: -8 }}>
                      <XAxis
                        type="number"
                        dataKey="x"
                        name="Tahun"
                        domain={[2010, 2025]}
                        tickCount={7}
                        tickFormatter={(v) => String(Math.round(v))}
                        stroke="#94A3B8"
                        fontSize={11}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name="Harga"
                        domain={[50, 580]}
                        tickFormatter={(v) => `${v}jt`}
                        stroke="#94A3B8"
                        fontSize={11}
                        width={42}
                      />
                      <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ payload }) => {
                          if (!payload || !payload.length) return null;
                          const point = payload[0].payload as ChartPoint;
                          return (
                            <div className="bg-slate-900/95 backdrop-blur-sm text-white p-2.5 rounded-xl text-xs shadow-lg space-y-1 border border-slate-700 max-w-[210px]">
                              <div className="font-bold truncate text-white">{point.nama_mobil}</div>
                              <div className="text-slate-300">Tahun Rakitan: {point.tahun}</div>
                              <div className="text-amber-300 font-semibold">
                                Rp {point.harga_rp.toLocaleString('id-ID')}
                              </div>
                              <div className="text-[10px] text-blue-300 pt-1 border-t border-slate-800">
                                {point.kelasLabel} • Klik titik untuk bandingkan
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Scatter
                        name="Mobil"
                        data={chartPoints}
                        isAnimationActive={false}
                        onClick={(data) => {
                          const clicked = data?.payload as ChartPoint | undefined;
                          if (clicked?.id) {
                            handleAddCar(clicked.id, true);
                          }
                        }}
                        className="cursor-pointer"
                      >
                        {chartPoints.map((entry) => {
                          const isHighlighted = entry.klaster === activeKlaster;
                          const color =
                            entry.klaster === 0 ? '#2563EB' : entry.klaster === 1 ? '#10B981' : '#F59E0B';
                          return (
                            <Cell
                              key={`cell-${entry.id}`}
                              fill={color}
                              fillOpacity={isHighlighted ? 0.88 : 0.16}
                              stroke={isHighlighted ? color : 'transparent'}
                              strokeWidth={isHighlighted ? 1 : 0}
                              r={isHighlighted ? 3.5 : 2}
                            />
                          );
                        })}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4 pt-1 text-[11px] text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800">
                {[0, 1, 2].map((kid) => {
                  const m = CATEGORY_MARKETING[kid];
                  return (
                    <button
                      key={kid}
                      type="button"
                      onClick={() => handleCategoryTabClick(m.slug)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                        activeKlaster === kid
                          ? 'bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white'
                          : 'hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.colorHex }} />
                      <span>{m.shortTitle}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Buyer-Friendly Guide Accordion */}
          <div className="bg-white dark:bg-[#111D3D] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
            <button
              type="button"
              onClick={() => setShowPriceGuideInfo(!showPriceGuideInfo)}
              className="w-full flex items-center justify-between text-left font-bold text-sm text-slate-900 dark:text-white cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Bagaimana CekGarasi Menentukan Standar Harga &amp; Kelas Mobil?</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  showPriceGuideInfo ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showPriceGuideInfo && (
              <div className="mt-3.5 pt-3.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2.5 leading-relaxed">
                <p>
                  Seluruh {totalMobil} unit mobil bekas di CekGarasi dikelompokkan secara objektif ke dalam 3 kelas pasar utama berdasarkan perbandingan harga penawaran, tahun perakitan, jarak tempuh pemakaian, serta kelengkapan 11 fitur unggulan (seperti kamera belakang, kamera 360, sunroof, keyless start, kontrol stabilitas, rem parkir elektrik, dan lainnya).
                </p>
                <p>
                  Dengan pengelompokan tersebut, Anda bisa membandingkan mobil yang benar-benar sepadan serta langsung melihat apakah harga sebuah unit lebih hemat, wajar, atau berada di atas pasaran di kelasnya sebelum datang ke showroom atau melakukan negosiasi.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Modal: Tambah Mobil ke Perbandingan */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Tambah Mobil ke Perbandingan
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  aria-label="Tutup pencarian tambah mobil"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Ketik merek atau model (misal: Xenia, Avanza, Honda HR-V)..."
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  autoFocus
                />
              </div>

              <div className="mt-4 max-h-72 overflow-y-auto space-y-2">
                {searching ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Mencari mobil di katalog...
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((car) => (
                    <div
                      key={car.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-2.5 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                    >
                      <img
                        src={getCarPhoto(car.nama_mobil, car.foto || car.transmisi)}
                        alt={car.nama_mobil}
                        className="h-12 w-14 rounded-lg object-cover flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-slate-900 dark:text-white">
                          {car.nama_mobil}
                        </span>
                        <span className="block text-[11px] font-extrabold text-blue-600">
                          Rp {formatAngka(car.harga_rp)}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {car.tahun} • {car.jarak_tempuh_ribu_km} rb km
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddCar(car.id)}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500 transition-colors cursor-pointer"
                      >
                        Pilih
                      </button>
                    </div>
                  ))
                ) : searchKeyword.trim() ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Tidak ditemukan mobil yang cocok dengan &quot;{searchKeyword}&quot;.
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Ketik kata kunci merek atau model untuk memilih mobil dari katalog.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
