import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CarCard, CarCardData } from '@/components/common/CarCard';
import { FilterSheet, FilterState } from '@/components/common/FilterSheet';
import { CariKosong, DiagnosisData } from '@/components/common/CariKosong';
import { GuestLoginSheet } from '@/components/common/GuestLoginSheet';
import { CarListSkeleton } from '@/components/common/Skeletons';
import { apiFetch, getToken } from '@/services/api';
import { content } from '@/content/id';
import { 
  Search, SlidersHorizontal, ArrowUpDown, Sparkles, 
  ChevronDown, RotateCcw, X
} from 'lucide-react';
import { BuyerKmeansTester } from '@/components/algo/BuyerKmeansTester';

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
  const token = getToken();

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

  // Load favorites if user logged in
  useEffect(() => {
    if (token) {
      apiFetch<{ items: Array<{ id: number }> }>('/favorit')
        .then((res) => {
          if (res && Array.isArray(res.items)) {
            setFavoriteIds(res.items.map((c) => c.id));
          }
        })
        .catch(() => {});
    }
  }, [token]);

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
    if (!token) {
      setShowGuestSheet(true);
      return;
    }

    const isFav = favoriteIds.includes(carId);
    try {
      if (isFav) {
        await apiFetch(`/favorit/${carId}`, { method: 'DELETE' });
        setFavoriteIds((prev) => prev.filter((id) => id !== carId));
      } else {
        await apiFetch('/favorit', {
          method: 'POST',
          body: JSON.stringify({ car_id: carId }),
        });
        setFavoriteIds((prev) => [...prev, carId]);
      }
      window.dispatchEvent(new CustomEvent('cekgarasi:favorite_changed'));
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
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

  // Apply suggestion chip from CariKosong (M2c)
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
    <div className="min-h-screen bg-slate-50">
      
      {/* ============================================================ */}
      {/* MOBILE VIEW (< 768px) - M2 Cari                              */}
      {/* ============================================================ */}
      <div className="block md:hidden pb-12">
        
        {/* Sticky Mobile Filter Bar */}
        <div className="sticky top-[calc(64px+env(safe-area-inset-top))] z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs px-4 py-2.5 space-y-2">
          
          {/* Row 1: Search Input + Filter Button */}
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={content.search.placeholder}
                className="w-full bg-slate-100 rounded-xl py-2 pl-9 pr-8 text-xs font-medium placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 border border-transparent focus:border-blue-500"
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
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            {/* Filter Button (M2b trigger) */}
            <button
              onClick={() => setIsFilterSheetOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                activeFilterCount > 0
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
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
                className="appearance-none bg-slate-100 border border-slate-200/80 rounded-lg py-1 pl-6 pr-6 text-[11px] font-semibold text-slate-700 focus:outline-none"
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
              { slug: 'premium', label: content.segments.names[0] },
              { slug: 'keluarga-muda', label: content.segments.names[1] },
              { slug: 'ekonomis', label: content.segments.names[2] },
            ].map((chip) => {
              const isSelected = (!segmen && chip.slug === '') || segmen === chip.slug;
              return (
                <button
                  key={chip.slug}
                  onClick={() => handleSegmentChip(chip.slug)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
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
          <div className="rounded-2xl border border-blue-200/90 bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-600 p-3.5 text-white shadow-xs">
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
              <div className="mt-3 text-slate-900">
                <BuyerKmeansTester
                  compact
                  title="Simulasi Segmen Pasar"
                  subtitle="Geser slider untuk melihat kecocokan segmen secara langsung."
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
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                  <span>Merek: {merk}</span>
                  <button
                    onClick={() => {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.delete('merk');
                      newParams.delete('merek');
                      newParams.set('halaman', '1');
                      setSearchParams(newParams);
                    }}
                    className="hover:text-blue-950 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {segmen && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 text-[11px] font-bold">
                  <span>Klaster: {content.segments.names[segmen === 'premium' ? 0 : segmen === 'keluarga-muda' ? 1 : 2] || segmen}</span>
                  <button
                    onClick={() => {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.delete('segmen');
                      newParams.set('halaman', '1');
                      setSearchParams(newParams);
                    }}
                    className="hover:text-purple-950 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {transmisi && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  <span>{transmisi}</span>
                  <button
                    onClick={() => {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.delete('transmisi');
                      newParams.set('halaman', '1');
                      setSearchParams(newParams);
                    }}
                    className="hover:text-emerald-950 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={handleResetAll}
                className="text-[11px] text-rose-600 font-semibold hover:underline ml-1"
              >
                Reset
              </button>
            </div>
          )}

          {/* Results Summary & ML Insight Banner */}
          {data && (
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{content.search.resultsCount(data.total)}</span>
              {activeFilterCount > 0 && (
                <button
                  onClick={handleResetAll}
                  className="text-blue-600 font-semibold flex items-center gap-1 hover:underline"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset filter</span>
                </button>
              )}
            </div>
          )}

          {/* ML Insight / Segment Explainer Pill */}
          <div className="rounded-xl bg-blue-50/70 border border-blue-200/80 p-3 text-xs text-blue-900">
            <button
              onClick={() => setShowMlExplainer(!showMlExplainer)}
              className="w-full flex items-center justify-between font-semibold"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <span>{content.segments.chipLabel}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-blue-600 transition-transform ${showMlExplainer ? 'rotate-180' : ''}`} />
            </button>
            {showMlExplainer && (
              <p className="mt-2 text-[11px] text-blue-800 leading-relaxed border-t border-blue-200/60 pt-2">
                {content.segments.chipPopover}
              </p>
            )}
          </div>

          {/* Loading State */}
          {loading && <CarListSkeleton count={4} />}

          {/* Zero Results State (M2c Cari Kosong) */}
          {!loading && data && data.total === 0 && (
            <CariKosong
              keyword={q}
              diagnosis={data.diagnosis}
              onApplySaran={handleApplySaran}
              onReset={handleResetAll}
            />
          )}

          {/* Results List */}
          {!loading && data && data.total > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {data.items.map((car) => (
                  <CarCard
                    key={car.id}
                    car={car}
                    isFavorite={favoriteIds.includes(car.id)}
                    onFavoriteClick={handleFavoriteToggle}
                  />
                ))}
              </div>

              {/* Similar Segment Recommendations when < 10 results */}
              {data.total < 10 && data.rekomendasi_alternatif && data.rekomendasi_alternatif.length > 0 && (
                <div className="pt-6 border-t border-slate-200 space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Mobil Serupa di Segmen yang Sama</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
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

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="pt-6 flex items-center justify-between text-xs">
                  <button
                    disabled={halaman <= 1}
                    onClick={() => handlePageChange(halaman - 1)}
                    className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    Sebelumnya
                  </button>
                  <span className="text-slate-500 font-medium">
                    Halaman {halaman} dari {totalPages}
                  </span>
                  <button
                    disabled={halaman >= totalPages}
                    onClick={() => handlePageChange(halaman + 1)}
                    className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
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
      <div className="hidden md:block py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Desktop Left Sidebar Filters */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-bold text-sm text-slate-900">Filter Mobil</span>
                {activeFilterCount > 0 && (
                  <button
                    onClick={handleResetAll}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    Reset ({activeFilterCount})
                  </button>
                )}
              </div>

              {/* Segmen Klaster Pasar Mobil */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2.5">
                  Klaster Pasar Mobil
                </span>
                <div className="space-y-1.5">
                  {[
                    { slug: '', label: 'Semua Segmen' },
                    { slug: 'premium', label: content.segments.names[0] },
                    { slug: 'keluarga-muda', label: content.segments.names[1] },
                    { slug: 'ekonomis', label: content.segments.names[2] },
                  ].map((segItem) => (
                    <button
                      key={segItem.slug}
                      onClick={() => handleSegmentChip(segItem.slug)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        (!segmen && segItem.slug === '') || segmen === segItem.slug
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {segItem.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Merek Mobil */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Merek Mobil
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
                      className="text-xs text-blue-600 font-semibold hover:underline"
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
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Semua Merek</option>
                  {['Toyota', 'Honda', 'Daihatsu', 'Mitsubishi', 'Suzuki', 'Nissan', 'Mazda', 'Wuling', 'Hyundai', 'BMW', 'Chevrolet', 'Ford', 'Datsun'].map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Transmisi */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2.5">
                  Transmisi
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {['Semua', 'Automatic', 'Manual'].map((t) => {
                    const isSelected = (!transmisi && t === 'Semua') || transmisi === t;
                    return (
                      <button
                        key={t}
                        onClick={() => {
                          const newParams = new URLSearchParams(searchParams);
                          if (t === 'Semua') newParams.delete('transmisi');
                          else newParams.set('transmisi', t);
                          newParams.set('halaman', '1');
                          setSearchParams(newParams);
                        }}
                        className={`py-1.5 rounded-lg text-xs font-medium border text-center transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 font-bold'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Shortcut Simulation Tester */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowKmeansTester(!showKmeansTester)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{showKmeansTester ? 'Tutup Simulasi' : '✨ Simulasi Segmen Pasar'}</span>
                </button>
              </div>

            </div>
          </div>

          {/* Desktop Right Main Catalog */}
          <div className="md:col-span-3 space-y-6">
            
            {/* Desktop Simulation Model Tester Banner & Component */}
            <div className="rounded-2xl border border-blue-200/90 bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-600 p-4 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white text-blue-700 font-bold text-xs hover:bg-blue-50 transition-all shadow-xs whitespace-nowrap cursor-pointer"
              >
                {showKmeansTester ? 'Tutup Simulasi' : '✨ Mulai Simulasi Segmen'}
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
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                    <span>Merek: {merk}</span>
                    <button
                      onClick={() => {
                        const newParams = new URLSearchParams(searchParams);
                        newParams.delete('merk');
                        newParams.delete('merek');
                        newParams.set('halaman', '1');
                        setSearchParams(newParams);
                      }}
                      className="hover:text-blue-950 p-0.5"
                      aria-label="Hapus filter merek"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {segmen && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold">
                    <span>Klaster: {content.segments.names[segmen === 'premium' ? 0 : segmen === 'keluarga-muda' ? 1 : 2] || segmen}</span>
                    <button
                      onClick={() => {
                        const newParams = new URLSearchParams(searchParams);
                        newParams.delete('segmen');
                        newParams.set('halaman', '1');
                        setSearchParams(newParams);
                      }}
                      className="hover:text-purple-950 p-0.5"
                      aria-label="Hapus filter klaster"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {transmisi && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                    <span>Transmisi: {transmisi}</span>
                    <button
                      onClick={() => {
                        const newParams = new URLSearchParams(searchParams);
                        newParams.delete('transmisi');
                        newParams.set('halaman', '1');
                        setSearchParams(newParams);
                      }}
                      className="hover:text-emerald-950 p-0.5"
                      aria-label="Hapus filter transmisi"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={handleResetAll}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold hover:underline ml-1"
                >
                  Reset Semua Filter
                </button>
              </div>
            )}

            {/* Desktop Search & Sort Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between gap-4">
              <form onSubmit={handleSearchSubmit} className="relative flex-1">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Cari merek atau model mobil..."
                  className="w-full bg-slate-100 rounded-xl py-2 pl-9 pr-8 text-xs font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 border border-transparent"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              </form>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 whitespace-nowrap">Urutkan:</span>
                <select
                  value={urut}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="bg-slate-100 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none"
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
              <div className="text-xs text-slate-500 font-medium">
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

            {/* Desktop Results Grid */}
            {!loading && data && data.total > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.items.map((car) => (
                    <CarCard
                      key={car.id}
                      car={car}
                      isFavorite={favoriteIds.includes(car.id)}
                      onFavoriteClick={handleFavoriteToggle}
                    />
                  ))}
                </div>

                {/* Similar Recommendations if < 10 */}
                {data.total < 10 && data.rekomendasi_alternatif && data.rekomendasi_alternatif.length > 0 && (
                  <div className="pt-8 border-t border-slate-200 space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Mobil Serupa di Segmen yang Sama</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
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

                {/* Desktop Pagination */}
                {totalPages > 1 && (
                  <div className="pt-8 flex items-center justify-between text-xs border-t border-slate-100">
                    <button
                      disabled={halaman <= 1}
                      onClick={() => handlePageChange(halaman - 1)}
                      className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      Sebelumnya
                    </button>
                    <span className="text-slate-600 font-medium">
                      Halaman {halaman} dari {totalPages}
                    </span>
                    <button
                      disabled={halaman >= totalPages}
                      onClick={() => handlePageChange(halaman + 1)}
                      className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      Selanjutnya
                    </button>
                  </div>
                )}
              </>
            )}

          </div>

        </div>
      </div>

      {/* M2b Filter Bottom Sheet */}
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
