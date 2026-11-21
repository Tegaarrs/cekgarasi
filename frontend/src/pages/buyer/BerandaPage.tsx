import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { scaleIn } from '@/lib/motion';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { HeroBackground } from '@/components/hero/HeroBackground';
import { CarCard, CarCardData } from '@/components/common/CarCard';
import { GuestLoginSheet } from '@/components/common/GuestLoginSheet';
import { CarListSkeleton } from '@/components/common/Skeletons';
import { apiFetch, getToken } from '@/services/api';
import { getSegmentMeta } from '@/utils/segmentConstants';
import { 
  Search, HelpCircle, ArrowRight, ChevronRight,
  CheckCircle2, ShieldCheck, Scale, CalendarCheck
} from 'lucide-react';
import { BuyerKmeansTester } from '@/components/algo/BuyerKmeansTester';
import {
  fetchFavoriteIds,
  getFavoriteIds,
  subscribeFavorites,
  toggleFavorite,
} from '@/services/favoriteStore';

interface SegmentSummary {
  klaster: number;
  nama_lengkap: string;
  nama_pendek: string;
  warna_hex: string;
  deskripsi: string;
  count: number;
  share: number;
  median_harga: number;
  median_tahun: number;
  mean_km: number;
  mean_total_fitur: number;
}

export function BerandaPage() {
  const navigate = useNavigate();
  const token = getToken();

  const [segments, setSegments] = useState<SegmentSummary[]>([]);
  const [recommendations, setRecommendations] = useState<CarCardData[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [activeMlPopover, setActiveMlPopover] = useState(false);
  const [showGuestSheet, setShowGuestSheet] = useState(false);

  // Load segment summary and recommendations
  useEffect(() => {
    // 1. Segmen
    apiFetch<SegmentSummary[]>('/segmen/ringkasan')
      .then((data) => {
        if (Array.isArray(data)) {
          setSegments(data);
        }
      })
      .catch(() => {});

    // 2. Rekomendasi Beranda
    setLoadingRecs(true);
    apiFetch<any>('/rekomendasi/beranda')
      .then((res) => {
        if (res && Array.isArray(res.items)) {
          setRecommendations(res.items);
        } else if (res && typeof res === 'object') {
          const combined = [
            ...(Array.isArray(res['0']) ? res['0'] : []),
            ...(Array.isArray(res['1']) ? res['1'] : []),
            ...(Array.isArray(res['2']) ? res['2'] : []),
          ];
          if (combined.length > 0) {
            setRecommendations(combined);
          }
        }
      })
      .catch(() => {
        // Fallback to /cari
        apiFetch<{ items: CarCardData[] }>('/cari?page_size=6')
          .then((res) => {
            if (res && Array.isArray(res.items)) {
              setRecommendations(res.items);
            }
          })
          .catch(() => {});
      })
      .finally(() => {
        setLoadingRecs(false);
      });

    // 3. Favorites if logged in
    fetchFavoriteIds().then((ids) => {
      if (Array.isArray(ids)) {
        setFavoriteIds(ids);
      }
    });
  }, [token]);

  useEffect(() => {
    const unsub = subscribeFavorites(() => {
      setFavoriteIds(getFavoriteIds());
    });
    return unsub;
  }, []);

  const handleFavoriteToggle = async (carId: number) => {
    await toggleFavorite(carId);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchKeyword.trim()) params.append('q', searchKeyword.trim());
    if (selectedBrand) {
      params.append('merk', selectedBrand);
    }
    navigate(`/cari?${params.toString()}`);
  };

  const quickFilterChips = [
    { label: 'Semua Unit', path: '/cari' },
    { label: 'Kelas Premium & SUV', path: '/cari?segmen=premium' },
    { label: 'Kelas Keluarga & MPV', path: '/cari?segmen=keluarga-muda' },
    { label: 'Kelas Hemat & Harian', path: '/cari?segmen=ekonomis' },
    { label: 'Harga < 150 Jt', path: '/cari?harga_max=150000000' },
    { label: 'Transmisi Otomatis', path: '/cari?transmisi=Automatic' },
  ];

  // 4 Langkah Mudah & Aman Beli Mobil untuk Pengguna Awam
  const panduanBeliSteps = [
    {
      step: 1,
      title: 'Cari Sesuai Kebutuhan & Budget',
      desc: 'Tentukan batas anggaran dan kategori kebutuhan keluarga tanpa bingung. Dari mobil harian irit bensin hingga kelas premium.',
      badge: 'Pilihan Tepat Sasaran',
      icon: Search,
    },
    {
      step: 2,
      title: 'Cek Transparansi Odometer & Fisik',
      desc: 'Pastikan jarak tempuh (kilometer) asli, tahun pembuatan, pelat nomor, dan kelengkapan fitur dipaparkan terbuka apa adanya.',
      badge: 'Bebas Reset Odometer',
      icon: ShieldCheck,
    },
    {
      step: 3,
      title: 'Bandingkan 3 Mobil Sekelas',
      desc: 'Gunakan fitur komparasi untuk adu harga pasar, spesifikasi mesin, dan fitur keselamatan agar makin yakin sebelum memilih.',
      badge: 'Perbandingan Objektif',
      icon: Scale,
    },
    {
      step: 4,
      title: 'Jadwalkan Inspeksi & Test Drive',
      desc: 'Pilih tanggal, jam, dan lokasi showroom terdekat untuk mengecek kondisi fisik mobil serta uji jalan secara langsung.',
      badge: 'Konsultasi & Cek Nyata',
      icon: CalendarCheck,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0D0D14] transition-colors duration-200">
      {/* ============================================================ */}
      {/* UNIFIED RESPONSIVE SHOWROOM VIEW (MOBILE & DESKTOP)          */}
      {/* ============================================================ */}
      <div className="block">
        
        {/* 1. Flagship Automotive Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#F8FAFC] via-[#FFFFFF] to-[#F8FAFC] dark:from-[#0B0B0F] dark:via-[#0B0B0F] dark:to-[#0D0D14] py-10 sm:py-16 lg:py-20 border-b border-slate-200/80 dark:border-white/10 transition-colors duration-200 bg-grid-hairline">
          {/* Ambient Showroom Spotlights: Brilliant Sapphire Lighting in Dark Mode */}
          <div className="hidden dark:block absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-b from-blue-600/35 via-indigo-600/15 to-transparent blur-3xl pointer-events-none" />
          <div className="dark:hidden absolute top-0 right-1/4 w-[700px] h-[450px] bg-gradient-to-bl from-blue-500/10 via-indigo-500/5 to-transparent blur-3xl pointer-events-none" />
          
          {/* Automotive Photograph: Synchronized position across both Light and Dark modes */}
          <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none transition-opacity duration-300 opacity-35 md:opacity-40 dark:opacity-100">
            <HeroBackground />
          </div>

          {/* Light Mode Directional Legibility Overlay (clean studio white on left, cars emerge naturally on right) */}
          <div className="dark:hidden absolute inset-0 bg-gradient-to-r from-[#F8FAFC] via-[#F8FAFC]/85 via-45% to-transparent pointer-events-none z-[1]" />
          <div className="dark:hidden absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-[#F8FAFC] to-transparent pointer-events-none z-[1]" />

          {/* Dark Mode Directional Legibility Gradient (keeps text ultra-readable on left, cars gleaming on right) */}
          <div className="hidden dark:block absolute inset-0 bg-gradient-to-r from-[#0B0B0F]/90 via-[#0B0B0F]/55 via-45% to-transparent pointer-events-none z-[1]" />
          <div className="hidden dark:block absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-[#0B0B0F] to-transparent pointer-events-none z-[1]" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-4xl"
            >
              {/* Headline */}
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.22] text-slate-900 dark:text-white hyphens-none">
                Cari Mobil Bekas Berkualitas,{' '}
                <span className="block mt-1.5 pt-0.5 pb-2.5 -mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 dark:from-blue-400 dark:via-sky-300 dark:to-indigo-300 leading-[1.25]">
                  Harga Pasti Pas &amp; <span className="inline-block whitespace-nowrap">Bebas Was-Was</span>
                </span>
              </h1>

              <p className="mt-3 sm:mt-4 text-xs sm:text-base lg:text-lg text-slate-600 dark:text-zinc-300 leading-relaxed font-normal max-w-2xl">
                Jelajahi lebih dari 600 mobil bekas siap pakai dari berbagai merek favorit. Cek perbandingan harga pasaran, jarak tempuh, dan kelengkapan fitur dengan mudah agar Anda dapat mobil terbaik tanpa takut kemahalan.
              </p>
            </motion.div>

            {/* Glass Search Console Pod */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 sm:mt-8 bg-white/95 dark:bg-[#16161F]/95 rounded-2xl p-4 sm:p-7 shadow-[0_20px_50px_rgba(15,23,42,0.07)] dark:shadow-2xl border border-slate-200/90 dark:border-white/10 backdrop-blur-md relative z-10"
            >
              <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 gap-3.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold tracking-wider uppercase text-slate-600 dark:text-zinc-400 mb-2">
                    Nama Merek atau Model Kendaraan
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <input
                      type="text"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      placeholder="Contoh: Avanza, Brio, Innova Reborn, HR-V, Fortuner..."
                      className="w-full rounded-xl bg-slate-50/90 dark:bg-[#0B0B0F] border border-slate-200 dark:border-white/15 py-3 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-wider uppercase text-slate-600 dark:text-zinc-400 mb-2">
                    Pilihan Merek (21 Brand)
                  </label>
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full rounded-xl bg-slate-50/90 dark:bg-[#0B0B0F] border border-slate-200 dark:border-white/15 py-3 px-3.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 transition-all cursor-pointer font-medium"
                  >
                    <option value="" className="bg-white dark:bg-[#0B0B0F] text-slate-900 dark:text-white">Semua Merek (21 Brand)</option>
                    <option value="Toyota" className="bg-white dark:bg-[#0B0B0F] text-slate-900 dark:text-white">Toyota</option>
                    <option value="Honda" className="bg-white dark:bg-[#0B0B0F] text-slate-900 dark:text-white">Honda</option>
                    <option value="Daihatsu" className="bg-white dark:bg-[#0B0B0F] text-slate-900 dark:text-white">Daihatsu</option>
                    <option value="Mitsubishi" className="bg-white dark:bg-[#0B0B0F] text-slate-900 dark:text-white">Mitsubishi</option>
                    <option value="Suzuki" className="bg-white dark:bg-[#0B0B0F] text-slate-900 dark:text-white">Suzuki</option>
                    <option value="Nissan" className="bg-white dark:bg-[#0B0B0F] text-slate-900 dark:text-white">Nissan</option>
                    <option value="Mazda" className="bg-white dark:bg-[#0B0B0F] text-slate-900 dark:text-white">Mazda</option>
                    <option value="Wuling" className="bg-white dark:bg-[#0B0B0F] text-slate-900 dark:text-white">Wuling</option>
                    <option value="Hyundai" className="bg-white dark:bg-[#0B0B0F] text-slate-900 dark:text-white">Hyundai</option>
                    <option value="BMW" className="bg-white dark:bg-[#0B0B0F] text-slate-900 dark:text-white">BMW</option>
                    <option value="Mercedes-Benz" className="bg-white dark:bg-[#0B0B0F] text-slate-900 dark:text-white">Mercedes-Benz</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="group cg-ripple w-full flex items-center justify-center gap-2 rounded-xl py-3 px-5 text-xs sm:text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/25 hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Search className="h-4 w-4 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-200" />
                    <span>Cari Mobil Pilihan</span>
                  </button>
                </div>
              </form>

              {/* Integrated Quick Filter Chips in Search Pod */}
              <div className="mt-4 sm:mt-5 pt-3.5 sm:pt-4 border-t border-slate-200/80 dark:border-white/10 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold tracking-wider uppercase text-slate-500 dark:text-zinc-400 mr-1">Akses Cepat:</span>
                {quickFilterChips.map((chip) => (
                  <Link
                    key={chip.label}
                    to={chip.path}
                    className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold bg-slate-100 hover:bg-blue-50 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200/90 hover:border-blue-300 dark:border-white/10 text-slate-700 hover:text-blue-700 dark:text-zinc-300 dark:hover:text-white hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                  >
                    <span>{chip.label}</span>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Real Dataset HUD Metrics Ribbon */}
            <div className="mt-6 sm:mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 relative z-10">
              <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#16161F]/90 p-3 sm:p-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)] flex items-center gap-3 hover:border-blue-400/50 hover:shadow-md transition-all">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 dark:bg-blue-500/15 border border-blue-200/80 dark:border-blue-500/30 flex items-center justify-center text-blue-700 dark:text-blue-400 flex-shrink-0">
                  <span className="font-extrabold text-sm sm:text-base">
                    <AnimatedNumber value={610} />
                  </span>
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">610 Unit Mobil</h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 truncate">Database Terverifikasi</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#16161F]/90 p-3 sm:p-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)] flex items-center gap-3 hover:border-emerald-400/50 hover:shadow-md transition-all">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200/80 dark:border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 flex-shrink-0">
                  <span className="font-extrabold text-sm sm:text-base">
                    <AnimatedNumber value={21} />
                  </span>
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">21 Merek</h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 truncate">MPV, SUV, &amp; Sedan</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#16161F]/90 p-3 sm:p-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)] flex items-center gap-3 hover:border-indigo-400/50 hover:shadow-md transition-all">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200/80 dark:border-indigo-500/30 flex items-center justify-center text-indigo-700 dark:text-indigo-300 flex-shrink-0">
                  <span className="font-extrabold text-sm sm:text-base">3</span>
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">3 Kategori Pilihan</h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 truncate">Eksekutif, Keluarga &amp; Hemat</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#16161F]/90 p-3 sm:p-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)] flex items-center gap-3 hover:border-amber-400/50 hover:shadow-md transition-all">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-50 dark:bg-amber-500/15 border border-amber-200/80 dark:border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 flex-shrink-0">
                  <span className="font-extrabold text-sm sm:text-base">
                    <AnimatedNumber value={11} />
                  </span>
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">11 Fitur Standar</h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 truncate">Safety &amp; Kenyamanan</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Running Marquee Strip */}
        <div className="border-b border-slate-200/80 dark:border-white/10 bg-[#F8FAFC] dark:bg-[#0B0B0F] py-3 sm:py-3.5 overflow-hidden select-none transition-colors duration-200">
          <div className="velox-marquee-track text-xs tracking-wider text-slate-600 dark:text-zinc-400 font-semibold">
            <span className="mx-6 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-600"></span>CekGarasi</span>
            <span className="mx-6 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-600"></span>610 Unit Mobil</span>
            <span className="mx-6 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-600"></span>Harga Pasaran Terverifikasi</span>
            <span className="mx-6 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Analisis Posisi Harga Wajar</span>
            <span className="mx-6 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>21 Merek Terdaftar</span>
            <span className="mx-6 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-600"></span>Transparansi Spesifikasi</span>
            <span className="mx-6 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-600"></span>CekGarasi</span>
            <span className="mx-6 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-600"></span>610 Unit Mobil</span>
            <span className="mx-6 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-600"></span>Harga Pasaran Terverifikasi</span>
            <span className="mx-6 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Analisis Posisi Harga Wajar</span>
          </div>
        </div>

        {/* 2. Three Market Category Cards with Scroll Reveal */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="py-10 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                  Pilihan Mobil Sesuai Kebutuhan &amp; Budget Anda
                </h2>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveMlPopover(!activeMlPopover)}
                    className="rounded-full p-1 text-zinc-400 hover:text-[#5B4EF0] dark:hover:text-[#8277FF] transition-colors cursor-pointer"
                    aria-label="Info pengelompokan segmen pasar"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                  <AnimatePresence>
                    {activeMlPopover && (
                      <motion.div
                        variants={scaleIn}
                        initial="hidden"
                        animate="show"
                        exit="hidden"
                        className="absolute left-0 top-full mt-2 z-30 w-80 rounded-[14px] border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#1A1A24] p-5 shadow-xl text-xs text-zinc-600 dark:text-zinc-300"
                      >
                        <div className="text-sm font-bold text-zinc-900 dark:text-white mb-1.5">
                          Belanja Mobil Lebih Mudah &amp; Pasti Untung
                        </div>
                        <p className="leading-relaxed font-normal">
                          Lebih dari 600 unit mobil siap pakai telah kami kelompokkan berdasarkan kisaran harga terbaik, usia kendaraan, kondisi kilometer, dan fitur unggulan agar Anda bisa langsung membandingkan mobil sekelas tanpa takut kemahalan.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl font-normal">
                Temukan mobil impian lebih cepat tanpa bingung pilih tipe, mulai dari mobil harian irit BBM, mobil keluarga yang lega dan nyaman, hingga kelas eksekutif premium dengan jaminan harga pasar yang jujur dan transparan.
              </p>
            </div>
            <Link
              to="/bandingkan"
              className="mt-4 sm:mt-0 inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B4EF0] dark:text-[#8277FF] hover:underline group"
            >
              <span>Bandingkan &amp; Cek Harga Pasaran</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map((klaster) => {
              const meta = getSegmentMeta(klaster);
              const Icon = meta.icon;
              const segSummary = segments.find((s) => s.klaster === klaster);
              const count = segSummary?.count || (klaster === 0 ? 260 : klaster === 1 ? 195 : 155);
              const sharePercent = segSummary?.share ? Math.round(segSummary.share * 100) : (klaster === 0 ? 43 : klaster === 1 ? 32 : 25);
              const medianHarga = segSummary?.median_harga ? Math.round(segSummary.median_harga / 1000000) : (klaster === 0 ? 425 : klaster === 1 ? 230 : 135);
              const medianTahun = segSummary?.median_tahun || (klaster === 0 ? 2020 : klaster === 1 ? 2018 : 2016);

              return (
                <StaggerItem key={klaster} index={klaster}>
                  <div
                    onClick={() => navigate(`/cari?segmen=${meta.slug}`)}
                    className="h-full bg-white dark:bg-[#1A1A24] rounded-[14px] border border-[#E4E4EE] dark:border-[#2A2A38] hover:border-[#5B4EF0]/50 dark:hover:border-[#8277FF]/50 p-6 sm:p-7 shadow-sm hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white shadow-xs"
                          style={{ backgroundColor: meta.colorHex }}
                        >
                          <Icon className="w-3.5 h-3.5 text-white" />
                          <span>{meta.nama}</span>
                        </span>
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-[#EEEDFB] dark:bg-white/10 px-3 py-1 rounded-[8px] border border-[#E4E4EE] dark:border-white/10">
                          {count} Unit
                        </span>
                      </div>

                      <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-[#5B4EF0] dark:group-hover:text-[#8277FF] transition-colors">
                        {meta.namaLengkap}
                      </h3>
                      <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed mb-6 min-h-[48px]">
                        {meta.deskripsi}
                      </p>

                      <div className="mb-5">
                        <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400 mb-2">
                          <span className="font-medium">Porsi Pasar Listing:</span>
                          <span className="font-extrabold text-zinc-900 dark:text-white">{sharePercent}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${sharePercent}%` }}
                            viewport={{ once: true, amount: 0.2 }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: meta.colorHex }}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#E4E4EE] dark:border-[#2A2A38] text-xs mb-5">
                        <div className="bg-[#F6F6FB] dark:bg-[#16161F] p-3 rounded-[10px] border border-[#E4E4EE] dark:border-[#2A2A38]">
                          <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">Harga Pasaran Wajar:</span>
                          <span className="font-black text-zinc-900 dark:text-white text-lg sm:text-xl mt-0.5 block">
                            Rp {medianHarga} Jt
                          </span>
                        </div>
                        <div className="bg-[#F6F6FB] dark:bg-[#16161F] p-3 rounded-[10px] border border-[#E4E4EE] dark:border-[#2A2A38]">
                          <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">Tahun Umum:</span>
                          <span className="font-black text-zinc-900 dark:text-white text-lg sm:text-xl mt-0.5 block">
                            {medianTahun}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs font-semibold text-[#5B4EF0] dark:text-[#8277FF] flex items-center justify-between group-hover:translate-x-1 transition-transform">
                        <span>Lihat Mobil Kelas {meta.nama}</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        </motion.section>

        {/* 3. Panduan Pembeli: 4 Langkah Mudah & Aman Beli Mobil with Scroll Reveal */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="py-10 sm:py-16 bg-[#EEEDFB]/40 dark:bg-[#16161F] border-y border-[#E4E4EE] dark:border-[#2A2A38] transition-colors duration-200"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#5B4EF0] dark:text-[#8277FF] block mb-2">
                Panduan Pembeli Cerdas
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                4 Langkah Mudah &amp; Aman Beli Mobil Idaman
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                Proses praktis dan transparan dari memilih unit, membandingkan harga pasar wajar, hingga konsultasi tanpa rasa was-was
              </p>
            </div>

            {/* Stepper Grid with Connected Lines */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 relative">
              {panduanBeliSteps.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ delay: idx * 0.1, duration: 0.35 }}
                    className="relative flex flex-col justify-between rounded-[14px] bg-white dark:bg-[#1A1A24] border border-[#E4E4EE] dark:border-[#2A2A38] hover:border-[#5B4EF0]/50 p-6 shadow-sm hover:shadow-card-hover transition-all"
                  >
                    <div>
                      {/* Stepper Header Badge */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-11 h-11 rounded-[10px] bg-[#EEEDFB] dark:bg-white/10 border border-[#E4E4EE] dark:border-white/15 flex items-center justify-center text-[#5B4EF0] dark:text-[#8277FF] shadow-xs">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-2xl font-extrabold text-zinc-300 dark:text-zinc-600">
                          0{item.step}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-2">
                        {item.title}
                      </h3>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-[#E4E4EE] dark:border-[#2A2A38] text-[11px] font-semibold text-[#5B4EF0] dark:text-[#8277FF] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span>{item.badge}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* 4. Interactive Budget & Category Recommender with Scroll Reveal */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="py-10 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
        >
          <BuyerKmeansTester
            title="Cari Kategori Mobil Sesuai Budget & Kriteria Anda"
            subtitle="Atur kisaran harga, tahun pembuatan, jarak tempuh, dan kelengkapan fitur untuk menemukan kategori mobil yang paling pas untuk kebutuhan Anda."
            onApplyFilters={(applied) => {
              const params = new URLSearchParams();
              if (applied.segmen) params.set('segmen', applied.segmen);
              if (applied.hargaMax) params.set('harga_max', String(applied.hargaMax));
              if (applied.tahunMin) params.set('tahun_min', String(applied.tahunMin));
              navigate(`/cari?${params.toString()}`);
            }}
          />
        </motion.section>

        {/* 5. Recommendation Showcase with Scroll Reveal & Stagger Animation */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="py-10 sm:py-16 bg-white dark:bg-[#11111A] border-t border-[#E4E4EE] dark:border-[#2A2A38] transition-colors duration-200"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
              <div>
                <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                  Unit Pilihan Terbaru
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Mobil siap pakai dengan spesifikasi lengkap dan harga sesuai standar pasar
                </p>
              </div>
              <Link
                to="/cari"
                className="group self-start sm:self-auto px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-[10px] inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer hover:-translate-y-0.5 active:scale-95"
              >
                <span>Jelajahi Semua 610 Unit</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-200" />
              </Link>
            </div>

            {loadingRecs ? (
              <CarListSkeleton count={6} />
            ) : (
              <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {recommendations.slice(0, 6).map((car, idx) => (
                  <StaggerItem key={car.id} index={idx}>
                    <CarCard
                      car={car}
                      isFavorite={favoriteIds.includes(car.id)}
                      onFavoriteClick={handleFavoriteToggle}
                    />
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </div>
        </motion.section>

      </div>

      {/* Guest Login Sheet Modal */}
      <GuestLoginSheet
        isOpen={showGuestSheet}
        onClose={() => setShowGuestSheet(false)}
        redirectPath="/"
      />
    </div>
  );
}
