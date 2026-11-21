import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Search, SlidersHorizontal, Sparkles, 
  ChevronDown, X, ChevronLeft, ChevronRight, Filter, Car, AlertCircle
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
  page_size?: number;
  total_pages?: number;
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

function getPaginationItems(currentPage: number, totalPages: number): Array<number | 'ellipsis-left' | 'ellipsis-right'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis-right', totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, 'ellipsis-left', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, 'ellipsis-left', currentPage - 1, currentPage, currentPage + 1, 'ellipsis-right', totalPages];
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
  const rawPage = parseInt(searchParams.get('halaman') || searchParams.get('page') || '1', 10);
  const halaman = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  // Component State
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState<boolean>(false);
  const [showGuestSheet, setShowGuestSheet] = useState<boolean>(false);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [searchInput, setSearchInput] = useState<string>(q);
  const lastSyncedQRef = useRef<string>(q);
  const [isMobileFilterExpanded, setIsMobileFilterExpanded] = useState<boolean>(false);
  const [showKmeansTester, setShowKmeansTester] = useState<boolean>(false);

  // Sync URL q -> searchInput ONLY when URL q changes externally (navigation or explicit clear)
  useEffect(() => {
    if (q !== lastSyncedQRef.current) {
      lastSyncedQRef.current = q;
      setSearchInput(q);
    }
  }, [q]);

  // Live progressive search & character-by-character backspace reset back to full catalog
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === q) return;

    const delay = trimmed === '' ? 50 : 220;
    const timer = setTimeout(() => {
      lastSyncedQRef.current = trimmed;
      const newParams = new URLSearchParams(searchParams);
      if (trimmed) {
        newParams.set('q', trimmed);
      } else {
        newParams.delete('q');
      }
      newParams.set('halaman', '1');
      newParams.delete('page');
      setSearchParams(newParams, { replace: true });
    }, delay);

    return () => clearTimeout(timer);
  }, [searchInput, q, searchParams, setSearchParams]);

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
    setFetchError(null);
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
    params.set('page', String(halaman));
    params.set('halaman', String(halaman));
    params.set('page_size', '12');

    apiFetch<SearchResponse>(`/cari?${params.toString()}`)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error('Failed to load cars:', err);
        setData(null);
        setFetchError('Gagal memuat daftar katalog mobil. Periksa koneksi Anda lalu coba lagi.');
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

  // Search Submit (immediate)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    lastSyncedQRef.current = trimmed;
    const newParams = new URLSearchParams(searchParams);
    if (trimmed) {
      newParams.set('q', trimmed);
    } else {
      newParams.delete('q');
    }
    newParams.set('halaman', '1');
    newParams.delete('page');
    setSearchParams(newParams);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    lastSyncedQRef.current = '';
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('q');
    newParams.set('halaman', '1');
    newParams.delete('page');
    setSearchParams(newParams, { replace: true });
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
    const safeMax = data ? Math.max(1, Math.ceil(data.total / 12)) : 1;
    const targetPage = Math.min(Math.max(1, newPage), safeMax);
    if (targetPage === halaman) return;
    const newParams = new URLSearchParams(searchParams);
    newParams.set('halaman', String(targetPage));
    newParams.delete('page');
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pageSize = 12;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;
  const currentPage = Math.min(Math.max(1, halaman), totalPages);
  const paginationItems = useMemo(() => getPaginationItems(currentPage, totalPages), [currentPage, totalPages]);
  const startItem = data && data.total > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = data && data.total > 0 ? Math.min(currentPage * pageSize, data.total) : 0;

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
    <div className="min-h-screen bg-[#E4E9F0] dark:bg-[#0B132B] transition-colors duration-200">
      {/* ============================================================ */}
      {/* UNIFIED RESPONSIVE SHOWROOM CATALOG (MOBILE & DESKTOP)       */}
      {/* ============================================================ */}
      <div className="py-6 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        
        {/* Showroom Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                Katalog Mobil Bekas Pilihan
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                Telusuri 610 unit mobil bekas terverifikasi dengan panduan kategori pasar, perbandingan harga wajar, dan spesifikasi lengkap.
              </p>
            </div>
            {data && (
              <div className="self-start sm:self-auto flex-shrink-0 flex items-center gap-3.5 px-4 py-2.5 sm:py-3 rounded-2xl bg-white dark:bg-[#1A1A24] border border-[#E4E4EE] dark:border-[#2A2A38] shadow-xs hover:border-blue-500/40 transition-all">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-50 dark:bg-blue-500/15 border border-blue-200/80 dark:border-blue-500/30 flex items-center justify-center text-blue-700 dark:text-blue-400 flex-shrink-0 shadow-2xs">
                  <Car className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                      Unit Terverifikasi
                    </span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 sm:gap-8">
          
          {/* Responsive Sidebar Filters (Always open on desktop, expandable on mobile) */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white dark:bg-[#1A1A24] rounded-[14px] border border-[#E4E4EE] dark:border-[#2A2A38] p-4 sm:p-6 shadow-sm space-y-5 transition-colors duration-200">
              <div className="flex items-center justify-between md:pb-3 md:border-b border-[#E4E4EE] dark:border-[#2A2A38]">
                <button
                  type="button"
                  onClick={() => setIsMobileFilterExpanded((prev) => !prev)}
                  className="md:pointer-events-none flex items-center gap-2 uppercase tracking-wider text-xs font-bold text-zinc-900 dark:text-white cursor-pointer md:cursor-default"
                >
                  <Filter className="w-4 h-4 text-[#5B4EF0] dark:text-[#8277FF]" />
                  <span>Filter Kendaraan</span>
                  {activeFilterCount > 0 && (
                    <span className="md:hidden inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-[#5B4EF0] text-white text-[10px] font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 md:hidden transition-transform ${
                      isMobileFilterExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetAll}
                      className="text-xs text-[#5B4EF0] dark:text-[#8277FF] font-semibold hover:underline cursor-pointer"
                    >
                      Reset ({activeFilterCount})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsFilterSheetOpen(true)}
                    className="md:hidden inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Lanjutan</span>
                  </button>
                </div>
              </div>

              <div className={`${isMobileFilterExpanded ? 'block pt-3 border-t border-[#E4E4EE] dark:border-[#2A2A38]' : 'hidden md:block'} space-y-6`}>

              {/* Kategori Kelas Mobil */}
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-2.5">
                  Kategori Kelas Mobil
                </span>
                <div className="space-y-1.5">
                  {[
                    { slug: '', label: 'Semua Kelas Mobil', dot: '#71717A' },
                    { slug: 'premium', label: 'Kelas Premium & SUV', dot: '#2563EB' },
                    { slug: 'keluarga-muda', label: 'Kelas Keluarga & MPV', dot: '#10B981' },
                    { slug: 'ekonomis', label: 'Kelas Hemat & Harian', dot: '#F59E0B' },
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

              {/* Shortcut Budget Guide */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowKmeansTester(!showKmeansTester)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{showKmeansTester ? 'Tutup Panduan Budget' : 'Panduan Budget Mobil'}</span>
                </button>
              </div>
              </div>

            </div>
          </div>

          {/* Desktop Right Main Catalog */}
          <div className="md:col-span-3 space-y-6">
            
            {/* Desktop Budget & Category Recommender Banner */}
            <div className="rounded-2xl border border-blue-200/90 dark:border-blue-900 bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-600 p-4 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Panduan Budget &amp; Rekomendasi Kelas Mobil</span>
                </div>
                <p className="text-xs text-blue-100 mt-0.5">
                  Atur kisaran harga, tahun rakitan, kilometer, dan kelengkapan fitur untuk menemukan kategori mobil terbaik beserta stok yang siap dibawa pulang.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowKmeansTester(!showKmeansTester)}
                className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white text-blue-700 font-bold text-xs hover:bg-blue-50 transition-all shadow-xs whitespace-nowrap cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                <span>{showKmeansTester ? 'Tutup Panduan Budget' : 'Cek Rekomendasi Budget'}</span>
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
                    <span>Kelas Mobil: {segmen === 'premium' ? 'Premium & SUV' : segmen === 'keluarga-muda' ? 'Keluarga & MPV' : 'Hemat & Harian'}</span>
                    <button
                      onClick={() => {
                        const newParams = new URLSearchParams(searchParams);
                        newParams.delete('segmen');
                        newParams.set('halaman', '1');
                        setSearchParams(newParams);
                      }}
                      className="hover:text-purple-950 dark:hover:text-white p-0.5 cursor-pointer"
                      aria-label="Hapus filter kategori kelas mobil"
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

            {/* Responsive Search & Sort Bar */}
            <div className="bg-white dark:bg-[#111D3D] rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-colors duration-200">
              <form onSubmit={handleSearchSubmit} className="relative flex-1">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Cari merek atau model mobil (contoh: Xenia, Avanza, HR-V)..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 py-2.5 pl-10 pr-9 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    aria-label="Hapus kata kunci pencarian"
                    title="Reset pencarian ke katalog awal"
                    className="absolute right-3 top-2.5 rounded-full p-0.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </form>

              <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Urutkan:</span>
                <select
                  value={urut}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="flex-1 sm:flex-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
                <span>
                  {data.total > 0
                    ? `Menampilkan ${startItem} - ${endItem} dari ${data.total} mobil (Halaman ${currentPage} dari ${totalPages})`
                    : content.search.resultsCount(data.total)}
                </span>
              </div>
            )}

            {/* Desktop Loading */}
            {loading && <CarListSkeleton count={6} />}

            {/* Desktop Error State */}
            {!loading && fetchError && (
              <div role="alert" className="rounded-2xl bg-white dark:bg-[#1A1A24] border border-red-200 dark:border-red-900/60 p-8 text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto" aria-hidden="true" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{fetchError}</p>
                <button
                  type="button"
                  onClick={fetchCars}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Muat Ulang Katalog
                </button>
              </div>
            )}

            {/* Desktop Empty State */}
            {!loading && !fetchError && data && data.total === 0 && (
              <CariKosong
                keyword={q}
                diagnosis={data.diagnosis}
                onApplySaran={handleApplySaran}
                onReset={handleResetAll}
              />
            )}

            {/* Desktop Results Grid with Staggered Cascading Animation */}
            {!loading && !fetchError && data && data.total > 0 && (
              <>
                <Stagger key={`desktop-grid-${currentPage}-${urut}-${q}-${merk}-${segmen}-${transmisi}`} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                        <span>Pilihan Mobil Serupa di Kelas Ini</span>
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

                {/* Unified Pagination Bar with Sliding Window */}
                {totalPages > 1 && (
                  <nav aria-label="Navigasi halaman katalog" className="pt-6 sm:pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-xs border-t border-slate-200/80 dark:border-slate-800">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                      aria-label="Halaman sebelumnya"
                      className="ios-glass-btn-secondary w-full sm:w-auto justify-center min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-slate-800 dark:text-slate-100 font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Sebelumnya</span>
                    </button>
                    
                    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center">
                      {paginationItems.map((item) => {
                        if (typeof item !== 'number') {
                          return (
                            <span key={item} aria-hidden="true" className="px-1.5 sm:px-2 text-slate-500 dark:text-slate-400 select-none font-semibold">
                              ...
                            </span>
                          );
                        }
                        const isCurrent = item === currentPage;
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => handlePageChange(item)}
                            aria-label={`Halaman ${item}`}
                            aria-current={isCurrent ? 'page' : undefined}
                            className={`min-w-[36px] sm:min-w-[40px] h-9 sm:h-10 px-2 sm:px-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                              isCurrent
                                ? 'bg-[#2563EB] text-white shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                      aria-label="Halaman selanjutnya"
                      className="ios-glass-btn-secondary w-full sm:w-auto justify-center min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-slate-800 dark:text-slate-100 font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <span>Selanjutnya</span>
                      <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </nav>
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
