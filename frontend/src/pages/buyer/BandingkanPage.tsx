import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Scale,
  Copy,
  Check,
  X,
  Plus,
  ArrowLeft,
  Calendar,
  Gauge,
  Sparkles,
  Search,
  Filter,
} from 'lucide-react';
import { apiFetch } from '@/services/api';
import {
  getCompareIds,
  removeCompare,
  addCompare,
  subscribeCompare,
} from '@/services/compareStore';
import { notifyToast } from '@/services/favoriteStore';
import { getCarPhoto } from '@/utils/carPhoto';
import { calculateInstallment } from '@/lib/finance';
import { buatRingkasanBanding } from '@/lib/ringkasanBanding';
import { SegmentBadge } from '@/components/motion/SegmentBadge';
import { Skeleton } from '@/components/motion/Skeleton';

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
  posisi_harga?: {
    q1: number;
    median: number;
    q3: number;
    verdict: string;
    selisih_median_rp: number;
  };
}

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

export function BandingkanPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Read IDs from URL or compareStore fallback
  const idsParam = searchParams.get('ids');
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

  const [comparedCars, setComparedCars] = useState<ComparedCar[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showOnlyDifferences, setShowOnlyDifferences] = useState<boolean>(false);

  // Financial slider state
  const [dpPercent, setDpPercent] = useState<number>(20);
  const [tenorTahun, setTenorTahun] = useState<number>(4);

  // Add Car Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SimilarCarSuggestion[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<SimilarCarSuggestion[]>([]);

  // Sync state when compareStore changes
  useEffect(() => {
    const unsub = subscribeCompare(() => {
      const current = getCompareIds();
      // If store changed from another tab/tray, update URL query param
      if (current.join(',') !== searchParams.get('ids')) {
        setSearchParams({ ids: current.join(',') }, { replace: true });
      }
    });
    return unsub;
  }, [searchParams, setSearchParams]);

  // Fetch compared cars data
  const loadComparedCars = useCallback(async (ids: number[]) => {
    if (ids.length === 0) {
      setComparedCars([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<ComparedCar[]>(`/bandingkan?ids=${ids.join(',')}`);
      setComparedCars(Array.isArray(data) ? data : []);
    } catch {
      notifyToast({
        show: true,
        message: 'Gagal memuat data perbandingan unit mobil.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComparedCars(initialIds);
  }, [initialIds, loadComparedCars]);

  // Fetch similar cars suggestions if < 4 cars
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
    }
  }, [comparedCars]);

  // Search in add modal
  useEffect(() => {
    if (!searchKeyword.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiFetch<{ items: SimilarCarSuggestion[] }>(
          `/cari?q=${encodeURIComponent(searchKeyword.trim())}&page_size=6`
        );
        if (res && Array.isArray(res.items)) {
          // exclude already compared cars
          const existingIds = comparedCars.map((c) => c.id);
          setSearchResults(res.items.filter((item) => !existingIds.includes(item.id)));
        }
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchKeyword, comparedCars]);

  // Copy shareable link
  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    notifyToast({
      show: true,
      message: 'Tautan perbandingan berhasil disalin ke papan klip!',
      type: 'success',
    });
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Remove car from comparison
  const handleRemove = (carId: number) => {
    removeCompare(carId);
    const updatedIds = initialIds.filter((id) => id !== carId);
    setSearchParams(updatedIds.length > 0 ? { ids: updatedIds.join(',') } : {});
  };

  // Add car to comparison
  const handleAddCar = (carId: number) => {
    if (comparedCars.length >= 4) {
      notifyToast({
        show: true,
        message: 'Maksimal 4 mobil untuk dibandingkan sekaligus.',
        type: 'info',
      });
      return;
    }
    addCompare(carId);
    const updated = [...initialIds, carId].slice(0, 4);
    setSearchParams({ ids: updated.join(',') });
    setIsAddModalOpen(false);
    setSearchKeyword('');
  };

  // Summary analysis
  const summary = useMemo(() => {
    return buatRingkasanBanding(comparedCars);
  }, [comparedCars]);

  // All distinct feature names across compared cars
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

  // Helper: check if a car has a feature
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

  // Spec difference filter logic
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

  return (
    <div className="min-h-screen bg-slate-50 pb-24 pt-6 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Navigation & Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:text-white cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali</span>
            </button>
            <h1 className="font-display text-2xl font-black text-slate-900 sm:text-3xl dark:text-white">
              Bandingkan Mobil
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Analisis spesifikasi, estimasi cicilan, posisi harga di segmen, dan kelengkapan fitur secara berdampingan.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-slate-500" />}
              <span>{copiedLink ? 'Tautan Disalin!' : 'Salin Tautan'}</span>
            </button>

            {comparedCars.length < 4 && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-500 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Mobil</span>
              </button>
            )}
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="space-y-6">
            <Skeleton height={120} className="w-full rounded-2xl" />
            <Skeleton height={400} className="w-full rounded-2xl" />
          </div>
        ) : comparedCars.length === 0 ? (
          /* Empty state */
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 ring-8 ring-blue-50/50 dark:bg-blue-950/40 dark:text-blue-400">
              <Scale className="h-10 w-10" />
            </div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Belum ada mobil yang dipilih untuk dibandingkan
            </h2>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Pilih hingga 4 unit mobil dari katalog atau daftar favoritmu untuk melihat perbandingan mendalam harga, odometer, dan kelengkapan fiturnya.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                to="/cari"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-500 transition-all"
              >
                <Search className="h-4 w-4" />
                <span>Pilih Mobil di Katalog</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Rule-Based Comparison Summary Banner */}
            {summary && (
              <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/40 p-5 shadow-xs dark:border-blue-900/40 dark:from-blue-950/30 dark:to-slate-900">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-400 mb-2">
                  <Sparkles className="h-4 w-4" />
                  <span>Ringkasan Perbandingan Pintar</span>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                  {summary.palingHemat && (
                    <div className="rounded-xl bg-white/80 p-3 border border-blue-100 shadow-2xs dark:bg-slate-800/80 dark:border-slate-700">
                      <span className="block text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">
                        Harga Paling Hemat
                      </span>
                      <span className="mt-1 block text-xs font-bold text-slate-900 dark:text-white">
                        {summary.palingHemat.text}
                      </span>
                    </div>
                  )}

                  {summary.kmTerendah && (
                    <div className="rounded-xl bg-white/80 p-3 border border-blue-100 shadow-2xs dark:bg-slate-800/80 dark:border-slate-700">
                      <span className="block text-[10px] font-semibold text-blue-600 uppercase tracking-wider">
                        Odometer Terendah
                      </span>
                      <span className="mt-1 block text-xs font-bold text-slate-900 dark:text-white">
                        {summary.kmTerendah.text}
                      </span>
                    </div>
                  )}

                  {summary.tahunPalingMuda && (
                    <div className="rounded-xl bg-white/80 p-3 border border-blue-100 shadow-2xs dark:bg-slate-800/80 dark:border-slate-700">
                      <span className="block text-[10px] font-semibold text-purple-600 uppercase tracking-wider">
                        Tahun Rakitan Termuda
                      </span>
                      <span className="mt-1 block text-xs font-bold text-slate-900 dark:text-white">
                        {summary.tahunPalingMuda.text}
                      </span>
                    </div>
                  )}

                  {summary.fiturTerlengkap && (
                    <div className="rounded-xl bg-white/80 p-3 border border-blue-100 shadow-2xs dark:bg-slate-800/80 dark:border-slate-700">
                      <span className="block text-[10px] font-semibold text-amber-600 uppercase tracking-wider">
                        Fitur Paling Lengkap
                      </span>
                      <span className="mt-1 block text-xs font-bold text-slate-900 dark:text-white">
                        {summary.fiturTerlengkap.text}
                      </span>
                    </div>
                  )}
                </div>

                <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300 font-medium border-t border-blue-100/60 pt-2.5 dark:border-slate-800">
                  💡 {summary.kesimpulan}
                </p>
              </div>
            )}

            {/* Shared Finance Controls & Differences Filter Toggle */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Simulasi Angsuran Bersama (Bunga Efektif 8% p.a.)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Ubah DP dan jangka waktu pinjaman untuk memperbarui simulasi seluruh mobil secara bersamaan.
                  </p>
                </div>

                {/* Differences toggle switch */}
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
                    onChange={(e) => setDpPercent(Number(e.target.value))}
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
                    <span>Tenor Pinjaman:</span>
                    <span className="text-blue-600 font-bold">{tenorTahun} Tahun ({tenorTahun * 12} Bulan)</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={tenorTahun}
                    onChange={(e) => setTenorTahun(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>1 Th</span>
                    <span>3 Th</span>
                    <span>5 Th</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Side-by-Side Comparison Matrix */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full border-collapse text-left text-xs">
                {/* Header Row: Unit Cards */}
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40">
                    <th className="w-44 min-w-[176px] p-4 font-bold text-slate-500">
                      Parameter Komparasi
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
                          className="min-w-[240px] p-4 align-top font-normal"
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
                                className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-md hover:bg-rose-600 hover:text-white transition-colors cursor-pointer dark:bg-slate-900/90"
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
                                  Rp {car.harga_rp.toLocaleString('id-ID')}
                                </span>
                                <span className="block text-[11px] font-semibold text-blue-600">
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

                    {/* Placeholder for up to 4 */}
                    {Array.from({ length: 4 - comparedCars.length }).map((_, idx) => (
                      <th
                        key={`add-col-${idx}`}
                        className="min-w-[200px] p-4 align-middle text-center bg-slate-50/30 dark:bg-slate-900/40"
                      >
                        <button
                          type="button"
                          onClick={() => setIsAddModalOpen(true)}
                          className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all cursor-pointer dark:border-slate-800"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                            <Plus className="h-5 w-5" />
                          </div>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Tambah Mobil ({comparedCars.length + idx + 1}/4)
                          </span>
                          <span className="text-[10px] text-slate-400">Pilih dari katalog</span>
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Spec Rows */}
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  
                  {/* Tahun Rakitan */}
                  {(!showOnlyDifferences || isSpecDifferent((c) => c.tahun)) && (
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3.5 font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>Tahun Rakitan</span>
                      </td>
                      {comparedCars.map((car) => (
                        <td key={car.id} className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                          {car.tahun}
                        </td>
                      ))}
                      {Array.from({ length: 4 - comparedCars.length }).map((_, i) => (
                        <td key={i} className="p-3.5 text-slate-300">-</td>
                      ))}
                    </tr>
                  )}

                  {/* Jarak Tempuh */}
                  {(!showOnlyDifferences || isSpecDifferent((c) => c.jarak_tempuh_ribu_km)) && (
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3.5 font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Gauge className="h-3.5 w-3.5 text-slate-400" />
                        <span>Jarak Tempuh</span>
                      </td>
                      {comparedCars.map((car) => (
                        <td key={car.id} className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                          {car.jarak_tempuh_ribu_km} rb km
                        </td>
                      ))}
                      {Array.from({ length: 4 - comparedCars.length }).map((_, i) => (
                        <td key={i} className="p-3.5 text-slate-300">-</td>
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
                        <td key={car.id} className="p-3.5 text-slate-700 dark:text-slate-300">
                          {car.transmisi}
                        </td>
                      ))}
                      {Array.from({ length: 4 - comparedCars.length }).map((_, i) => (
                        <td key={i} className="p-3.5 text-slate-300">-</td>
                      ))}
                    </tr>
                  )}

                  {/* Posisi Harga di Segmen */}
                  {(!showOnlyDifferences || isSpecDifferent((c) => c.posisi_harga?.verdict)) && (
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 bg-blue-50/20 dark:bg-blue-950/10">
                      <td className="p-3.5 font-semibold text-slate-500 dark:text-slate-400">
                        Posisi Harga Segmen
                      </td>
                      {comparedCars.map((car) => (
                        <td key={car.id} className="p-3.5">
                          {car.posisi_harga ? (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
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
                      {Array.from({ length: 4 - comparedCars.length }).map((_, i) => (
                        <td key={i} className="p-3.5 text-slate-300">-</td>
                      ))}
                    </tr>
                  )}

                  {/* Lokasi Unit */}
                  {(!showOnlyDifferences || isSpecDifferent((c) => c.lokasi)) && (
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3.5 font-semibold text-slate-500 dark:text-slate-400">
                        Lokasi Unit
                      </td>
                      {comparedCars.map((car) => (
                        <td key={car.id} className="p-3.5 text-slate-700 dark:text-slate-300">
                          {car.lokasi || 'DKI Jakarta'}
                        </td>
                      ))}
                      {Array.from({ length: 4 - comparedCars.length }).map((_, i) => (
                        <td key={i} className="p-3.5 text-slate-300">-</td>
                      ))}
                    </tr>
                  )}

                  {/* Jenis Plat / Registrasi */}
                  {(!showOnlyDifferences || isSpecDifferent((c) => c.tipe_plat || c.jenis_plat)) && (
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3.5 font-semibold text-slate-500 dark:text-slate-400">
                        Jenis Plat
                      </td>
                      {comparedCars.map((car) => (
                        <td key={car.id} className="p-3.5 text-slate-700 dark:text-slate-300">
                          {car.tipe_plat || car.jenis_plat || 'Ganjil/Genap Terdaftar'}
                        </td>
                      ))}
                      {Array.from({ length: 4 - comparedCars.length }).map((_, i) => (
                        <td key={i} className="p-3.5 text-slate-300">-</td>
                      ))}
                    </tr>
                  )}

                  {/* Section Divider: Kelengkapan Fitur */}
                  <tr className="bg-slate-100/70 font-bold text-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
                    <td colSpan={5} className="p-3 text-xs uppercase tracking-wider">
                      Kelengkapan Fitur ({allFeatureNames.length} Fitur Teridentifikasi)
                    </td>
                  </tr>

                  {/* Distinct Features Rows */}
                  {allFeatureNames.map((featName) => {
                    if (showOnlyDifferences && !isFeatureDifferent(featName)) {
                      return null;
                    }

                    return (
                      <tr key={featName} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-medium text-slate-600 dark:text-slate-400 truncate max-w-[176px]">
                          {featName}
                        </td>
                        {comparedCars.map((car) => {
                          const has = carHasFeature(car, featName);
                          return (
                            <td key={car.id} className="p-3">
                              {has ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
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
                          <td key={i} className="p-3 text-slate-300">-</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Suggestions: "Mobil Serupa Lainnya" */}
            {suggestions.length > 0 && comparedCars.length < 4 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Saran Mobil Serupa untuk Ditambahkan
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Unit sejenis dengan harga dan segmen berdekatan yang bisa kamu tambahkan ke perbandingan.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {suggestions.slice(0, 3).map((sug) => (
                    <div
                      key={sug.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50"
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
                        <span className="block text-[11px] font-extrabold text-blue-600">
                          Rp {sug.harga_rp.toLocaleString('id-ID')}
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
                        + Tambah
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
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
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Search input */}
              <div className="mt-4 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Ketik nama mobil atau merek (misal: Avanza, Honda HR-V)..."
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  autoFocus
                />
              </div>

              {/* Search Results */}
              <div className="mt-4 max-h-72 overflow-y-auto space-y-2">
                {searching ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Mencari mobil...
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
                          Rp {car.harga_rp.toLocaleString('id-ID')}
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
                    Ketik kata kunci untuk mencari unit mobil di katalog.
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
