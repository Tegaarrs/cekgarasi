import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { CarCard, CarCardData } from '@/components/common/CarCard';
import { FilterSheet, FilterState } from '@/components/common/FilterSheet';
import { CariKosong, DiagnosisData } from '@/components/common/CariKosong';
import { GuestLoginSheet } from '@/components/common/GuestLoginSheet';
import { CarListSkeleton } from '@/components/common/Skeletons';
import { apiFetch } from '@/services/api';
import { content } from '@/content/id';
import { 
  Search, SlidersHorizontal, ArrowUpDown, Sparkles, 
  ChevronDown, RotateCcw, X, ChevronLeft, ChevronRight, Filter, Car
} from 'lucide-react';
import { BuyerKmeansTester } from '@/components/algo/BuyerKmeansTester';
import {
  fetchFavoriteIds,
  getFavoriteIds,
  subscribeFavorites,
  toggleFavorite,
} from '@/services/favoriteStore';

interface SearchResponse {
  total: number;
  page: number;
  limit: number;
  items: CarCardData[];
  segmen_cocok?: {
    klaster: number;
    nama_lengkap: string;
    nama_pendek: string;
    warna_hex: string;
    alasan: string;
  };
  rekomendasi_alternatif?: CarCardData[];
  diagnosis?: DiagnosisData;
}

export function CariPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL Query Params
  const q = searchParams.get('q') || '';
  const merk = searchParams.get('merk') || searchParams.get('merek') || '';
  const segmen = searchParams.get('segmen') || '';
  const lokasi = searchParams.get('lokasi') || '';
  const hargaMin = searchParams.get('harga_min') || '';
  const hargaMax = searchParams.get('harga_max') || '';
  const tahunMin = searchParams.get('tahun_min') || '';
  const tahunMax = searchParams.get('tahun_max') || '';
  const transmisi = searchParams.get('transmisi') || '';
  const model = searchParams.get('model') || '';
  const urut = searchParams.get('urut') || 'sesuai';
  const halaman = parseInt(searchParams.get('halaman') || '1', 10);

  // Component State
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState<boolean>(false);
  const [showGuestSheet, setShowGuestSheet] = useState<boolean>(false);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [searchInput, setSearchInput] = useState<string>(q);
  const [showMlExplainer, setShowMlExplainer] = useState<boolean>(false);
  const [showKmeansTester, setShowKmeansTester] = useState<boolean>(false);

  // Sync search input with URL q
  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  // Load favorites and subscribe to changes
  useEffect(() => {
    fetchFavoriteIds().then((ids) => {
      if (Array.isArray(ids)) {
        setFavoriteIds(ids);
      }
    });

    const unsub = subscribeFavorites(() => {
      setFavoriteIds(getFavoriteIds());
    });
    return unsub;
  }, []);

  // Fetch search results from real backend
  const fetchCars = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (merk) params.set('merk', merk);
    if (segmen) params.set('segmen', segmen);
    if (lokasi && lokasi !== 'Semua' && lokasi !== 'Semua lokasi') params.set('lokasi', lokasi);
    if (hargaMin) params.set('harga_min', hargaMin);
    if (hargaMax) params.set('harga_max', hargaMax);
    if (tahunMin) params.set('tahun_min', tahunMin);
    if (tahunMax) params.set('tahun_max', tahunMax);
    if (transmisi && transmisi !== 'Semua') params.set('transmisi', transmisi);
    if (model) params.set('model', model);
    if (urut) params.set('urut', urut);
    params.set('halaman', String(halaman));
    params.set('page_size', '12');

    apiFetch<SearchResponse>(`/cari?${params.toString()}`)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error('Failed to load cars:', err);
        setData(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [q, merk, segmen, lokasi, hargaMin, hargaMax, tahunMin, tahunMax, transmisi, model, urut, halaman]);

  useEffect(() => {
    fetchCars();
  }, [fetchCars]);

  // Count active filters (excluding default sort and page)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (merk) count++;
    if (segmen) count++;
    if (lokasi && lokasi !== 'Semua') count++;
    if (hargaMin || hargaMax) count++;
    if (tahunMin || tahunMax) count++;
    if (transmisi && transmisi !== 'Semua') count++;
    if (model) count++;
    return count;
  }, [merk, segmen, lokasi, hargaMin, hargaMax, tahunMin, tahunMax, transmisi, model]);

  // Toggle Favorite Handler
  const handleFavoriteToggle = async (carId: number) => {
    await toggleFavorite(carId);
  };

  // Search Submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      newParams.set('q', searchInput.trim());
    } else {
      newParams.delete('q');
    }
    newParams.set('halaman', '1');
    setSearchParams(newParams);
  };

  // Quick Segment Chip Click
  const handleSegmentChip = (slug: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (slug === '' || segmen === slug) {
      newParams.delete('segmen');
    } else {
      newParams.set('segmen', slug);
    }
    newParams.set('halaman', '1');
    setSearchParams(newParams);
  };

  // Sort Change
  const handleSortChange = (newUrut: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('urut', newUrut);
    newParams.set('halaman', '1');
    setSearchParams(newParams);
  };

  // Apply filters from Bottom Sheet
  const handleApplyFilterSheet = (draft: FilterState) => {
    const newParams = new URLSearchParams(searchParams);
    if (draft.merk) newParams.set('merk', draft.merk); else { newParams.delete('merk'); newParams.delete('merek'); }
    if (draft.segmen) newParams.set('segmen', draft.segmen); else newParams.delete('segmen');
    if (draft.harga_min) newParams.set('harga_min', String(draft.harga_min)); else newParams.delete('harga_min');
    if (draft.harga_max) newParams.set('harga_max', String(draft.harga_max)); else newParams.delete('harga_max');
    if (draft.tahun_min) newParams.set('tahun_min', String(draft.tahun_min)); else newParams.delete('tahun_min');
    if (draft.tahun_max) newParams.set('tahun_max', String(draft.tahun_max)); else newParams.delete('tahun_max');
    if (draft.transmisi) newParams.set('transmisi', draft.transmisi); else newParams.delete('transmisi');
    if (draft.model) newParams.set('model', draft.model); else newParams.delete('model');
    newParams.set('halaman', '1');
    setSearchParams(newParams);
  };

  // Reset all filters
  const handleResetAll = () => {
    const newParams = new URLSearchParams();
    if (q) newParams.set('q', q);
    setSearchParams(newParams);
  };

  // Apply suggestion chip from CariKosong
  const handleApplySaran = (param: string, value: string | number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set(param, String(value));
    newParams.set('halaman', '1');
    setSearchParams(newParams);
  };

  // Pagination Change
  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('halaman', String(newPage));
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = data ? Math.ceil(data.total / 12) : 1;

  const currentFiltersForSheet: FilterState = {
    q,
    merk,
    segmen,
    lokasi,
    harga_min: hargaMin,
    harga_max: hargaMax,
    tahun_min: tahunMin,
    tahun_max: tahunMax,
    transmisi,
    model,
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B132B] transition-colors duration-200">
      
      {/* ============================================================ */}
      {/* MOBILE VIEW (< 768px)                                        */}
      {/* ============================================================ */}
      <div className="block md:hidden pb-12">
        
        {/* Sticky Mobile Filter Bar */}
        <div className="ios-glass-bar sticky top-[calc(64px+env(safe-area-inset-top))] z-20 px-4 py-2.5 space-y-2">
          
          {/* Row 1: Search Input + Filter Button */}
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={content.search.placeholder}
                className="ios-glass-input w-full rounded-xl py-2 pl-9 pr-8 text-xs font-medium placeholder-slate-400"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('q');
                    setSearchParams(newParams);
                  }}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            {/* Filter Button */}
            <button
              onClick={() => setIsFilterSheetOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                activeFilterCount > 0
                  ? 'ios-glass-btn-primary'
                  : 'ios-glass-btn-secondary'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-white text-blue-600 text-[10px] font-black flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Row 2: Sort Selector + Quick Segment Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-0.5">
            {/* Sort Selector Dropdown */}
            <div className="relative flex-shrink-0">
              <select
                value={urut}
                onChange={(e) => handleSortChange(e.target.value)}
                className="ios-glass-input appearance-none rounded-lg py-1 pl-6 pr-6 text-[11px] font-semibold text-slate-700 dark:text-slate-200"
              >
                {content.search.sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ArrowUpDown className="w-3 h-3 text-slate-500 absolute left-2 top-2 pointer-events-none" />
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-2 pointer-events-none" />
            </div>

            {/* Quick Segment Filter Chips */}
            {[
              { slug: '', label: 'Semua' },
              { slug: 'premium', label: 'Premium' },
              { slug: 'keluarga-muda', label: 'Keluarga Muda' },
              { slug: 'ekonomis', label: 'Ekonomis' },
            ].map((chip) => {
              const isSelected = (!segmen && chip.slug === '') || segmen === chip.slug;
              return (
                <button
                  key={chip.slug}
                  onClick={() => handleSegmentChip(chip.slug)}
                  className={`ios-glass-pill flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold cursor-pointer ${
                    isSelected ? 'ios-glass-pill-active' : 'ios-glass-pill-inactive'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="px-4 py-4 space-y-4">
          
          {/* Mobile Segmen Tester Toggle Banner */}
          <div className="rounded-2xl border border-blue-200/90 dark:border-blue-900 bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-600 p-3.5 text-white shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-amber-300 flex-shrink-0" />
                <span>Simulasi Segmen Pasar Cerdas</span>
              </div>
              <button
                type="button"
                onClick={() => setShowKmeansTester(!showKmeansTester)}
                className="px-2.5 py-1 rounded-lg bg-white text-blue-700 font-bold text-[11px] shadow-2xs whitespace-nowrap active:scale-95 transition-all cursor-pointer"
              >
                {showKmeansTester ? 'Tutup' : 'Coba Tanpa Login'}
              </button>
            </div>
            {showKmeansTester && (
              <div className="mt-3 text-slate-900 dark:text-slate-100">
                <BuyerKmeansTester
                  compact
                  title="Asisten Pintar Pencocok Mobil"
                  subtitle="Geser budget dan kriteria Anda—sistem pintar kami mempelajari ratusan data pasar secara otomatis untuk mencocokkan mobil paling ideal."
                  onApplyFilters={(applied) => {
                    const newParams = new URLSearchParams(searchParams);
                    if (applied.segmen) newParams.set('segmen', applied.segmen);
                    if (applied.hargaMax) newParams.set('harga_max', String(applied.hargaMax));
                    if (applied.tahunMin) newParams.set('tahun_min', String(applied.tahunMin));
                    newParams.set('halaman', '1');
                    setSearchParams(newParams);
                    setShowKmeansTester(false);
                  }}
                />
              </div>
            )}
          </div>

          {/* Active Filter Chips */}
          {(merk || segmen || hargaMin || hargaMax || tahunMin || tahunMax || transmisi) && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {merk && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 text-[11px] font-bold border border-blue-200 dark:border-blue-800">
                  <span>Merek: {merk}</span>
                  <button
                    onClick={() => {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.delete('merk');
                      newParams.delete('merek');
                      newParams.set('halaman', '1');
                      setSearchParams(newParams);
                    }}
                    className="hover:text-blue-950 dark:hover:text-white p-0.5 cursor-pointer"
                    aria-label="Hapus filter merek"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {segmen && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 text-[11px] font-bold border border-purple-200 dark:border-purple-800">
                  <span>Klaster: {segmen === 'premium' ? 'Premium' : segmen === 'keluarga-muda' ? 'Keluarga Muda' : 'Ekonomis'}</span>
                  <button
                    onClick={() => {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.delete('segmen');
                      newParams.set('halaman', '1');
                      setSearchParams(newParams);
                    }}
                    className="hover:text-purple-950 dark:hover:text-white p-0.5 cursor-pointer"
                    aria-label="Hapus filter klaster"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {transmisi && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800">
                  <span>{transmisi}</span>
                  <button
                    onClick={() => {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.delete('transmisi');
                      newParams.set('halaman', '1');
                      setSearchParams(newParams);
                    }}
                    className="hover:text-emerald-950 dark:hover:text-white p-0.5 cursor-pointer"
                    aria-label="Hapus filter transmisi"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={handleResetAll}
                className="text-[11px] text-[#5B4EF0] dark:text-[#8277FF] font-semibold hover:underline ml-1 cursor-pointer"
              >
                Reset
              </button>
            </div>
          )}

          {/* Results Summary */}
          {data && (
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{content.search.resultsCount(data.total)}</span>
              {activeFilterCount > 0 && (
                <button
                  onClick={handleResetAll}
                  className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset filter</span>
                </button>
              )}
            </div>
          )}

          {/* ML Insight / Segment Explainer Pill */}
          <div className="rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 p-3 text-xs text-blue-900 dark:text-blue-200">
            <button
              onClick={() => setShowMlExplainer(!showMlExplainer)}
              className="w-full flex items-center justify-between font-semibold cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span>{content.segments.chipLabel}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 transition-transform ${showMlExplainer ? 'rotate-180' : ''}`} />
            </button>
            {showMlExplainer && (
              <p className="mt-2 text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed border-t border-blue-200/60 dark:border-blue-900/60 pt-2">
                {content.segments.chipPopover}
              </p>
            )}
          </div>

          {/* Loading State */}
          {loading && <CarListSkeleton count={4} />}

          {/* Zero Results State */}
          {!loading && data && data.total === 0 && (
            <CariKosong
              keyword={q}
              diagnosis={data.diagnosis}
              onApplySaran={handleApplySaran}
              onReset={handleResetAll}
            />
          )}

          {/* Results List with Staggered Cascading Animation */}
          {!loading && data && data.total > 0 && (
            <>
              <Stagger className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {data.items.map((car, idx) => (
                  <StaggerItem key={car.id} index={idx}>
                    <CarCard
                      car={car}
                      isFavorite={favoriteIds.includes(car.id)}
                      onFavoriteClick={handleFavoriteToggle}
                    />
                  </StaggerItem>
                ))}
              </Stagger>

              {/* Similar Segment Recommendations when < 10 results */}
              {data.total < 10 && data.rekomendasi_alternatif && data.rekomendasi_alternatif.length > 0 && (
                <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Mobil Serupa di Segmen yang Sama</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {content.search.recommendationCaption}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {data.rekomendasi_alternatif.map((car) => (
                      <CarCard
                        key={`alt-${car.id}`}
                        car={car}
                        isFavorite={favoriteIds.includes(car.id)}
                        onFavoriteClick={handleFavoriteToggle}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Mobile Pagination Controls */}
              {totalPages > 1 && (
                <div className="pt-6 flex items-center justify-between text-xs">
                  <button
                    disabled={halaman <= 1}
                    onClick={() => handlePageChange(halaman - 1)}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Sebelumnya
                  </button>
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    Halaman {halaman} dari {totalPages}
                  </span>
                  <button
                    disabled={halaman >= totalPages}
                    onClick={() => handlePageChange(halaman + 1)}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Selanjutnya
                  </button>
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* ============================================================ */}
      {/* DESKTOP VIEW (≥ 768px)                                       */}
      {/* ============================================================ */}
      <div className="hidden md:block py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        
        {/* Showroom Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                Katalog Mobil Bekas Pilihan
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                Telusuri 610 unit mobil bekas terverifikasi dengan klasifikasi segmen objektif K-Means, kepastian harga pasar, dan spesifikasi terstandarisasi.
              </p>
            </div>
            {data && (
              <div className="flex-shrink-0 flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-white dark:bg-[#1A1A24] border border-[#E4E4EE] dark:border-[#2A2A38] shadow-xs hover:border-blue-500/40 transition-all">
                <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/15 border border-blue-200/80 dark:border-blue-500/30 flex items-center justify-center text-blue-700 dark:text-blue-400 flex-shrink-0 shadow-2xs">
                  <Car className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                      Unit Terverifikasi
                    </span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      {data.total}
                    </span>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      Mobil Siap Pakai
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Desktop Left Sidebar Filters */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white dark:bg-[#1A1A24] rounded-[14px] border border-[#E4E4EE] dark:border-[#2A2A38] p-6 shadow-sm space-y-6 transition-colors duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-[#E4E4EE] dark:border-[#2A2A38]">
                <span className="uppercase tracking-wider text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-[#5B4EF0] dark:text-[#8277FF]" />
                  <span>Filter Kendaraan</span>
                </span>
                {activeFilterCount > 0 && (
                  <button
                    onClick={handleResetAll}
                    className="text-xs text-[#5B4EF0] dark:text-[#8277FF] font-semibold hover:underline cursor-pointer"
                  >
                    Reset ({activeFilterCount})
                  </button>
                )}
              </div>

              {/* Segmen Klaster Pasar Mobil */}
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-2.5">
                  Klaster Segmen Pasar
                </span>
                <div className="space-y-1.5">
                  {[
                    { slug: '', label: 'Semua Segmen', dot: '#71717A' },
                    { slug: 'premium', label: 'Premium', dot: '#2563EB' },
                    { slug: 'keluarga-muda', label: 'Keluarga Muda', dot: '#10B981' },
                    { slug: 'ekonomis', label: 'Ekonomis', dot: '#F59E0B' },
                  ].map((segItem) => {
                    const isSelected = (!segmen && segItem.slug === '') || segmen === segItem.slug;
                    return (
                      <button
                        key={segItem.slug}
                        onClick={() => handleSegmentChip(segItem.slug)}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#5B4EF0] text-white shadow-xs font-semibold'
                            : 'bg-[#F6F6FB] dark:bg-[#16161F] hover:bg-[#EEEDFB] dark:hover:bg-[#22222E] text-zinc-700 dark:text-zinc-200 border border-[#E4E4EE] dark:border-[#2A2A38]'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: isSelected ? '#FFFFFF' : segItem.dot }}
                        />
                        <span className="truncate">{segItem.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Merek Mobil */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Merek Kendaraan
                  </span>
                  {merk && (
                    <button
                      onClick={() => {
                        const newParams = new URLSearchParams(searchParams);
                        newParams.delete('merk');
                        newParams.delete('merek');
                        newParams.set('halaman', '1');
                        setSearchParams(newParams);
                      }}
                      className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                    >
                      Hapus
                    </button>
                  )}
                </div>
                <select
                  value={merk}
                  onChange={(e) => {
                    const newParams = new URLSearchParams(searchParams);
                    if (e.target.value) {
                      newParams.set('merk', e.target.value);
                    } else {
                      newParams.delete('merk');
                      newParams.delete('merek');
                    }
                    newParams.set('halaman', '1');
                    setSearchParams(newParams);
                  }}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 px-3 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Semua Merek (21 Brand)</option>
                  {['Toyota', 'Honda', 'Daihatsu', 'Mitsubishi', 'Suzuki', 'Nissan', 'Mazda', 'Wuling', 'Hyundai', 'BMW', 'Chevrolet', 'Ford', 'Datsun'].map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Transmisi */}
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-2.5">
                  Transmisi
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {['Semua', 'Automatic', 'Manual'].map((t) => {
                    const isSelected = (!transmisi && t === 'Semua') || transmisi === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          const newParams = new URLSearchParams(searchParams);
                          if (t === 'Semua') newParams.delete('transmisi');
                          else newParams.set('transmisi', t);
                          newParams.set('halaman', '1');
                          setSearchParams(newParams);
                        }}
                        className={`py-2 rounded-[10px] text-xs font-semibold text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#2563EB] text-white shadow-xs font-bold'
                            : 'bg-[#F6F6FB] dark:bg-[#16161F] hover:bg-[#EEEDFB] dark:hover:bg-[#22222E] text-zinc-700 dark:text-zinc-200 border border-[#E4E4EE] dark:border-[#2A2A38]'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Shortcut Simulation Tester */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowKmeansTester(!showKmeansTester)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{showKmeansTester ? 'Tutup Simulasi' : 'Simulasi Segmen Pasar'}</span>
                </button>
              </div>

            </div>
          </div>

          {/* Desktop Right Main Catalog */}
          <div className="md:col-span-3 space-y-6">
            
            {/* Desktop Simulation Model Tester Banner */}
            <div className="rounded-2xl border border-blue-200/90 dark:border-blue-900 bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-600 p-4 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Simulasi Segmen Pasar (Publik & Tanpa Login)</span>
                </div>
                <p className="text-xs text-blue-100 mt-0.5">
                  Simulasikan harga, tahun, odometer, dan fitur untuk mengetahui segmen pasarnya secara objektif serta langsung memfilter katalog.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowKmeansTester(!showKmeansTester)}
                className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white text-blue-700 font-bold text-xs hover:bg-blue-50 transition-all shadow-xs whitespace-nowrap cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                <span>{showKmeansTester ? 'Tutup Simulasi' : 'Mulai Simulasi Segmen'}</span>
              </button>
            </div>

            {showKmeansTester && (
              <BuyerKmeansTester
                onApplyFilters={(applied) => {
                  const newParams = new URLSearchParams(searchParams);
                  if (applied.segmen) newParams.set('segmen', applied.segmen);
                  if (applied.hargaMax) newParams.set('harga_max', String(applied.hargaMax));
                  if (applied.tahunMin) newParams.set('tahun_min', String(applied.tahunMin));
                  newParams.set('halaman', '1');
                  setSearchParams(newParams);
                  setShowKmeansTester(false);
                }}
              />
            )}

            {/* Desktop Active Filter Chips */}
            {(merk || segmen || hargaMin || hargaMax || tahunMin || tahunMax || transmisi) && (
              <div className="flex flex-wrap items-center gap-2 py-1">
                <span className="text-xs text-slate-400 font-medium">Filter Aktif:</span>
                {merk && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-800">
                    <span>Merek: {merk}</span>
                    <button
                      onClick={() => {
                        const newParams = new URLSearchParams(searchParams);
                        newParams.delete('merk');
                        newParams.delete('merek');
                        newParams.set('halaman', '1');
                        setSearchParams(newParams);
                      }}
                      className="hover:text-blue-950 dark:hover:text-white p-0.5 cursor-pointer"
                      aria-label="Hapus filter merek"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {segmen && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 text-xs font-semibold border border-purple-200 dark:border-purple-800">
                    <span>Klaster: {segmen === 'premium' ? 'Premium' : segmen === 'keluarga-muda' ? 'Keluarga Muda' : 'Ekonomis'}</span>
                    <button
                      onClick={() => {
                        const newParams = new URLSearchParams(searchParams);
                        newParams.delete('segmen');
                        newParams.set('halaman', '1');
                        setSearchParams(newParams);
                      }}
                      className="hover:text-purple-950 dark:hover:text-white p-0.5 cursor-pointer"
                      aria-label="Hapus filter klaster"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {transmisi && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
                    <span>Transmisi: {transmisi}</span>
                    <button
                      onClick={() => {
                        const newParams = new URLSearchParams(searchParams);
                        newParams.delete('transmisi');
                        newParams.set('halaman', '1');
                        setSearchParams(newParams);
                      }}
                      className="hover:text-emerald-950 dark:hover:text-white p-0.5 cursor-pointer"
                      aria-label="Hapus filter transmisi"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={handleResetAll}
                  className="text-xs text-[#5B4EF0] dark:text-[#8277FF] hover:underline font-semibold ml-1 cursor-pointer"
                >
                  Reset Semua Filter
                </button>
              </div>
            )}

            {/* Desktop Search & Sort Bar */}
            <div className="bg-white dark:bg-[#111D3D] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex items-center justify-between gap-4 transition-colors duration-200">
              <form onSubmit={handleSearchSubmit} className="relative flex-1">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Cari merek atau model mobil..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 py-2.5 pl-10 pr-8 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </form>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Urutkan:</span>
                <select
                  value={urut}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {content.search.sortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Total Results */}
            {data && (
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {content.search.resultsCount(data.total)}
              </div>
            )}

            {/* Desktop Loading */}
            {loading && <CarListSkeleton count={6} />}

            {/* Desktop Empty State */}
            {!loading && data && data.total === 0 && (
              <CariKosong
                keyword={q}
                diagnosis={data.diagnosis}
                onApplySaran={handleApplySaran}
                onReset={handleResetAll}
              />
            )}

            {/* Desktop Results Grid with Staggered Cascading Animation */}
            {!loading && data && data.total > 0 && (
              <>
                <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.items.map((car, idx) => (
                    <StaggerItem key={car.id} index={idx}>
                      <CarCard
                        car={car}
                        isFavorite={favoriteIds.includes(car.id)}
                        onFavoriteClick={handleFavoriteToggle}
                      />
                    </StaggerItem>
                  ))}
                </Stagger>

                {/* Similar Recommendations if < 10 */}
                {data.total < 10 && data.rekomendasi_alternatif && data.rekomendasi_alternatif.length > 0 && (
                  <div className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Mobil Serupa di Segmen yang Sama</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {content.search.recommendationCaption}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {data.rekomendasi_alternatif.map((car) => (
                        <CarCard
                          key={`desktop-alt-${car.id}`}
                          car={car}
                          isFavorite={favoriteIds.includes(car.id)}
                          onFavoriteClick={handleFavoriteToggle}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Desktop Pagination Bar with Numbers */}
                {totalPages > 1 && (
                  <div className="pt-8 flex items-center justify-between text-xs border-t border-slate-200/80 dark:border-slate-800">
                    <button
                      disabled={halaman <= 1}
                      onClick={() => handlePageChange(halaman - 1)}
                      className="ios-glass-btn-secondary inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-slate-700 dark:text-slate-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Sebelumnya</span>
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                        const pageNum = i + 1;
                        const isCurrent = pageNum === halaman;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isCurrent
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      {totalPages > 5 && (
                        <span className="px-2 text-slate-400">...</span>
                      )}
                    </div>

                    <button
                      disabled={halaman >= totalPages}
                      onClick={() => handlePageChange(halaman + 1)}
                      className="ios-glass-btn-secondary inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-slate-700 dark:text-slate-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span>Selanjutnya</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            )}

          </div>

        </div>
      </div>

      {/* Filter Bottom Sheet */}
      <FilterSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        filters={currentFiltersForSheet}
        onApply={handleApplyFilterSheet}
        onReset={handleResetAll}
      />

      {/* Guest Login Sheet Modal */}
      <GuestLoginSheet
        isOpen={showGuestSheet}
        onClose={() => setShowGuestSheet(false)}
        redirectPath="/cari"
      />
    </div>
  );
}
