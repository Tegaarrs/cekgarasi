import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  LogOut,
  Heart,
  BarChart3,
  Sun,
  Moon,
  ChevronDown,
  Users,
  ShieldCheck,
  Gauge,
  Sparkles,
  Crown,
  Wallet,
  Layers,
  Sliders,
  ArrowRight,
  Car,
  Scale,
} from 'lucide-react';
import { getUser, removeToken } from '@/services/api';
import { Logo } from '@/components/common/Logo';
import { AnimatedMenuToggle } from '@/components/motion/AnimatedMenuToggle';
import { useTheme } from '@/context/ThemeContext';
import { subscribeFavorites, fetchFavoriteIds, getFavoriteCount } from '@/services/favoriteStore';
import { getCompareIds, subscribeCompare } from '@/services/compareStore';

interface UserProfile {
  id: number;
  nama: string;
  email: string;
  role: string;
}

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [user, setUserState] = useState<UserProfile | null>(getUser());
  const [favCount, setFavCount] = useState<number>(getFavoriteCount());
  const [compareCount, setCompareCount] = useState<number>(getCompareIds().length);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUserState(getUser());
    setActiveMenu(null);
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    fetchFavoriteIds().then(() => {
      setFavCount(getFavoriteCount());
    });
    const unsubFav = subscribeFavorites(() => {
      setFavCount(getFavoriteCount());
    });
    const unsubComp = subscribeCompare(() => {
      setCompareCount(getCompareIds().length);
    });
    return () => {
      unsubFav();
      unsubComp();
    };
  }, [user]);

  // Click outside to close active dropdown menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    removeToken();
    localStorage.removeItem('cekgarasi_user');
    setUserState(null);
    setActiveMenu(null);
    navigate('/');
  };

  const isHomeActive = location.pathname === '/';
  const isKatalogActive = location.pathname === '/cari';
  const isSegmenActive = location.pathname.startsWith('/segmen');
  const isBandingkanActive = location.pathname.startsWith('/bandingkan');
  const isFavoritActive = location.pathname.startsWith('/favorit');

  return (
    <header
      ref={navRef}
      className="sticky top-0 z-[1000] w-full bg-[#0B0B0F] dark:bg-[#11111A] text-white border-b border-white/10 dark:border-[#2A2A38] shadow-sm select-none"
      style={{ height: '64px' }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left Section: Brand Logo */}
        <div className="flex items-center gap-6 lg:gap-8 flex-shrink-0">
          <Link
            to="/"
            className="flex items-center gap-2.5 group flex-shrink-0 cursor-pointer"
            aria-label="CekGarasi Beranda"
            onClick={() => {
              setActiveMenu(null);
              setMobileOpen(false);
            }}
          >
            <Logo size="md" wordmarkClassName="text-white font-bold tracking-tight text-lg" />
          </Link>

          {/* Center Navigation Bar (Desktop) */}
          <nav
            className="hidden lg:flex items-center gap-1.5 text-[14px] font-medium whitespace-nowrap"
            aria-label="Navigasi Utama"
          >
            {/* 1. Beranda */}
            <Link
              to="/"
              onClick={() => setActiveMenu(null)}
              className={`rounded-full px-3.5 py-1.5 transition-colors cursor-pointer ${
                isHomeActive
                  ? 'bg-[#2A2A33] text-white font-semibold'
                  : 'text-zinc-300 hover:text-white hover:bg-white/10'
              }`}
            >
              Beranda
            </Link>

            {/* 2. Katalog Mobil (Dropdown) */}
            <div
              className="relative"
              onMouseEnter={() => setActiveMenu('katalog')}
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button
                type="button"
                onClick={() => setActiveMenu(activeMenu === 'katalog' ? null : 'katalog')}
                className={`rounded-full px-3.5 py-1.5 transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                  isKatalogActive || activeMenu === 'katalog'
                    ? 'bg-[#2A2A33] text-white font-semibold'
                    : 'text-zinc-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>Katalog</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    activeMenu === 'katalog' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Flyout Dropdown Menu */}
              {activeMenu === 'katalog' && (
                <div className="absolute left-0 top-full pt-2 w-[500px] z-50">
                  <div className="rounded-2xl border border-zinc-200 dark:border-[#2A2A38] bg-white dark:bg-[#1A1A24] text-zinc-900 dark:text-zinc-100 p-4 shadow-xl grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 mb-2.5 block uppercase">
                        Kategori Mobil
                      </span>
                      <div className="space-y-1">
                        <Link
                          to="/cari?transmisi=Automatic"
                          onClick={() => setActiveMenu(null)}
                          className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center flex-shrink-0">
                            <Car className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                              Transmisi Otomatis
                            </span>
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block leading-tight">
                              Nyaman untuk harian
                            </span>
                          </div>
                        </Link>

                        <Link
                          to="/cari?segmen=keluarga-muda"
                          onClick={() => setActiveMenu(null)}
                          className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#10B981] dark:text-[#34D399] flex items-center justify-center flex-shrink-0">
                            <Users className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                              MPV &amp; Mobil Keluarga
                            </span>
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block leading-tight">
                              Kabin lega 7-penumpang
                            </span>
                          </div>
                        </Link>

                        <Link
                          to="/cari?segmen=premium"
                          onClick={() => setActiveMenu(null)}
                          className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                              SUV &amp; Crossover
                            </span>
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block leading-tight">
                              Tangguh &amp; fitur lengkap
                            </span>
                          </div>
                        </Link>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 mb-2.5 block uppercase">
                        Pencarian Spesifik
                      </span>
                      <div className="space-y-1">
                        <Link
                          to="/cari?harga_max=150000000"
                          onClick={() => setActiveMenu(null)}
                          className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-[#D97706] dark:text-[#FBBF24] flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                              Budget &lt; Rp 150 Jt
                            </span>
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block leading-tight">
                              Pilihan hemat &amp; terjangkau
                            </span>
                          </div>
                        </Link>

                        <Link
                          to="/cari?segmen=ekonomis"
                          onClick={() => setActiveMenu(null)}
                          className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center flex-shrink-0">
                            <Gauge className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                              City Car Harian
                            </span>
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block leading-tight">
                              Lincah &amp; hemat BBM
                            </span>
                          </div>
                        </Link>

                        <div className="pt-2">
                          <Link
                            to="/cari"
                            onClick={() => setActiveMenu(null)}
                            className="flex items-center justify-between p-2 rounded-xl bg-[#5B4EF0] hover:bg-[#4B3FE0] text-white transition-colors font-medium text-xs shadow-xs"
                          >
                            <span>Semua 610 Unit</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Segmen Pasar (Dropdown) */}
            <div
              className="relative"
              onMouseEnter={() => setActiveMenu('segmen')}
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button
                type="button"
                onClick={() => setActiveMenu(activeMenu === 'segmen' ? null : 'segmen')}
                className={`rounded-full px-3.5 py-1.5 transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                  isSegmenActive || activeMenu === 'segmen'
                    ? 'bg-[#2A2A33] text-white font-semibold'
                    : 'text-zinc-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>Segmen</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    activeMenu === 'segmen' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Flyout Dropdown Menu */}
              {activeMenu === 'segmen' && (
                <div className="absolute left-0 top-full pt-2 w-[480px] z-50">
                  <div className="rounded-2xl border border-zinc-200 dark:border-[#2A2A38] bg-white dark:bg-[#1A1A24] text-zinc-900 dark:text-zinc-100 p-4 shadow-xl grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 mb-2.5 block uppercase">
                        Klaster K-Means (K=3)
                      </span>
                      <div className="space-y-1">
                        <Link
                          to="/cari?segmen=premium"
                          onClick={() => setActiveMenu(null)}
                          className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center flex-shrink-0">
                            <Crown className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                              Premium (260 Unit)
                            </span>
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block leading-tight">
                              Fitur mewah &amp; prestise
                            </span>
                          </div>
                        </Link>

                        <Link
                          to="/cari?segmen=keluarga-muda"
                          onClick={() => setActiveMenu(null)}
                          className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-[#10B981] dark:text-[#34D399] flex items-center justify-center flex-shrink-0">
                            <Users className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                              Keluarga Muda (195 Unit)
                            </span>
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block leading-tight">
                              Kabin lapang &amp; hemat BBM
                            </span>
                          </div>
                        </Link>

                        <Link
                          to="/cari?segmen=ekonomis"
                          onClick={() => setActiveMenu(null)}
                          className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-[#D97706] dark:text-[#FBBF24] flex items-center justify-center flex-shrink-0">
                            <Wallet className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                              Ekonomis &amp; Praktis (155 Unit)
                            </span>
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block leading-tight">
                              Biaya ringan &amp; perawatan mudah
                            </span>
                          </div>
                        </Link>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 mb-2.5 block uppercase">
                        Eksplorasi
                      </span>
                      <div className="space-y-1">
                        <Link
                          to="/segmen"
                          onClick={() => setActiveMenu(null)}
                          className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center flex-shrink-0">
                            <Layers className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                              Analisis Segmen
                            </span>
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block leading-tight">
                              Statistik median harga &amp; sebaran
                            </span>
                          </div>
                        </Link>

                        <Link
                          to="/preferensi"
                          onClick={() => setActiveMenu(null)}
                          className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#5B4EF0] flex items-center justify-center flex-shrink-0">
                            <Sliders className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                              Kuis Preferensi
                            </span>
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block leading-tight">
                              Temukan segmen sesuai kebutuhan
                            </span>
                          </div>
                        </Link>

                        <div className="pt-2">
                          <Link
                            to="/segmen"
                            onClick={() => setActiveMenu(null)}
                            className="flex items-center justify-between p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white transition-colors font-medium text-xs"
                          >
                            <span>Buka Ringkasan Segmen</span>
                            <ArrowRight className="w-3.5 h-3.5 text-[#5B4EF0]" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Bandingkan (Direct Link with Badge) */}
            <Link
              to="/bandingkan"
              onClick={() => setActiveMenu(null)}
              className={`rounded-full px-3.5 py-1.5 transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                isBandingkanActive
                  ? 'bg-[#2A2A33] text-white font-semibold'
                  : 'text-zinc-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>Bandingkan</span>
              {compareCount > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#5B4EF0] px-1 text-[10px] font-bold text-white shadow-xs">
                  {compareCount}
                </span>
              )}
            </Link>
          </nav>
        </div>

        {/* Right Section: Actions & Auth */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Theme Toggle Button with Rotate Micro-Interaction */}
          <motion.button
            type="button"
            onClick={toggleTheme}
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.88, rotate: 180 }}
            aria-label={theme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
            title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
            className="rounded-full w-9 h-9 flex items-center justify-center transition-colors cursor-pointer text-zinc-300 hover:text-white bg-white/10 hover:bg-white/15 border border-white/10"
          >
            <motion.div
              key={theme}
              initial={{ rotate: -90, scale: 0.8, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-zinc-300" />
              )}
            </motion.div>
          </motion.button>

          {/* Favorite Heart Icon with Pop Micro-Interaction & Numeric Badge */}
          <Link
            to="/favorit"
            aria-label={favCount > 0 ? `Favorit, ${favCount} unit` : 'Favorit, kosong'}
            title="Mobil Favorit Tersimpan"
            className={`group relative rounded-full w-9 h-9 flex items-center justify-center transition-all cursor-pointer border hover:scale-105 active:scale-95 ${
              isFavoritActive
                ? 'border-rose-500/50 bg-rose-500/20 text-rose-400'
                : 'text-zinc-300 hover:text-white bg-white/10 hover:bg-white/15 border-white/10'
            }`}
          >
            <Heart
              className={`h-4 w-4 transition-transform group-hover:scale-110 duration-200 ${
                favCount > 0 ? 'fill-[#EF4444] text-[#EF4444]' : 'text-zinc-300'
              }`}
            />
            {favCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#EF4444] px-1 text-[10px] font-bold text-white shadow-xs animate-heart-pop">
                {favCount > 99 ? '99+' : favCount}
              </span>
            )}
          </Link>

          {/* Portal Dealer Link with Hover Micro-Elevation */}
          <Link
            to="/admin/dashboard"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-1.5 text-xs font-semibold transition-all border border-white/15 bg-white/10 hover:bg-white/20 hover:-translate-y-0.5 active:scale-95 text-white cursor-pointer shadow-2xs"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#8277FF]" />
            <span>Portal Dealer</span>
          </Link>

          {/* User Auth: Avatar Dropdown or Masuk/Daftar */}
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveMenu(activeMenu === 'user' ? null : 'user')}
                className="inline-flex items-center gap-2 rounded-full pl-2 pr-3 py-1 text-xs font-medium bg-white/10 hover:bg-white/15 border border-white/15 text-white transition-colors cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-[#5B4EF0] flex items-center justify-center text-white font-bold text-[11px]">
                  {(user.nama || user.email).charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[90px] truncate">{user.nama || user.email}</span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>

              {activeMenu === 'user' && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-zinc-200 dark:border-[#2A2A38] bg-white dark:bg-[#1A1A24] text-zinc-900 dark:text-zinc-100 p-2 shadow-xl z-50">
                  <div className="px-3 py-2 border-b border-zinc-100 dark:border-[#2A2A38]">
                    <span className="block text-xs font-bold truncate text-zinc-900 dark:text-white">
                      {user.nama || 'Pengguna'}
                    </span>
                    <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      {user.email}
                    </span>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/favorit"
                      onClick={() => setActiveMenu(null)}
                      className="flex items-center gap-2 px-3 py-2 text-xs rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <Heart className="w-3.5 h-3.5 text-[#EF4444]" />
                      <span>Mobil Favorit</span>
                      {favCount > 0 && (
                        <span className="ml-auto text-[10px] font-bold text-zinc-500">
                          {favCount}
                        </span>
                      )}
                    </Link>

                    <Link
                      to="/bandingkan"
                      onClick={() => setActiveMenu(null)}
                      className="flex items-center gap-2 px-3 py-2 text-xs rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <Scale className="w-3.5 h-3.5 text-[#5B4EF0]" />
                      <span>Bandingkan</span>
                      {compareCount > 0 && (
                        <span className="ml-auto text-[10px] font-bold text-zinc-500">
                          {compareCount}
                        </span>
                      )}
                    </Link>

                    <Link
                      to="/admin/dashboard"
                      onClick={() => setActiveMenu(null)}
                      className="flex items-center gap-2 px-3 py-2 text-xs rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-[#8277FF]" />
                      <span>Portal Dealer / Admin</span>
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-zinc-100 dark:border-[#2A2A38]">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Keluar Akun</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/welcome"
                className="inline-flex items-center justify-center rounded-[10px] px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
              >
                Masuk
              </Link>
              <Link
                to="/daftar"
                className="inline-flex items-center justify-center rounded-[10px] px-3.5 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors shadow-xs active:scale-95"
              >
                Daftar
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Toggle with True SVG Morphing Animation */}
          <motion.button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.05 }}
            className="lg:hidden rounded-full w-9 h-9 flex items-center justify-center text-zinc-300 hover:text-white bg-white/10 hover:bg-white/15 border border-white/10 transition-colors cursor-pointer"
            aria-label="Buka menu navigasi"
          >
            <AnimatedMenuToggle isOpen={mobileOpen} className="w-4 h-4 text-white" />
          </motion.button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-white/10 bg-[#0B0B0F] px-4 pt-3 pb-6 space-y-2 text-white">
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className={`block px-3 py-2 rounded-xl text-sm font-medium ${
              isHomeActive ? 'bg-[#2A2A33] text-white font-semibold' : 'text-zinc-300 hover:bg-white/10'
            }`}
          >
            Beranda
          </Link>
          <Link
            to="/cari"
            onClick={() => setMobileOpen(false)}
            className={`block px-3 py-2 rounded-xl text-sm font-medium ${
              isKatalogActive ? 'bg-[#2A2A33] text-white font-semibold' : 'text-zinc-300 hover:bg-white/10'
            }`}
          >
            Katalog Mobil
          </Link>
          <Link
            to="/segmen"
            onClick={() => setMobileOpen(false)}
            className={`block px-3 py-2 rounded-xl text-sm font-medium ${
              isSegmenActive ? 'bg-[#2A2A33] text-white font-semibold' : 'text-zinc-300 hover:bg-white/10'
            }`}
          >
            Segmen Pasar
          </Link>
          <Link
            to="/bandingkan"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium ${
              isBandingkanActive ? 'bg-[#2A2A33] text-white font-semibold' : 'text-zinc-300 hover:bg-white/10'
            }`}
          >
            <span>Bandingkan</span>
            {compareCount > 0 && (
              <span className="h-5 min-w-[20px] rounded-full bg-[#5B4EF0] px-1.5 text-xs font-bold text-white flex items-center justify-center">
                {compareCount}
              </span>
            )}
          </Link>
          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <Link
              to="/admin/dashboard"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-white"
            >
              <BarChart3 className="w-4 h-4 text-[#8277FF]" />
              <span>Portal Dealer</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
