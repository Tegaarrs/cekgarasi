import { useEffect, useState, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, Layers, Heart, User } from 'lucide-react';
import { getToken } from '@/services/api';
import {
  subscribeFavorites,
  fetchFavoriteIds,
  getFavoriteCount,
  requestLoginPrompt,
} from '@/services/favoriteStore';

export function MobileBottomNav() {
  const location = useLocation();
  const token = getToken();
  const [favoriteCount, setFavoriteCount] = useState<number>(getFavoriteCount());

  // Hide nav on detail, booking, auth routes
  const hideRoutes = [
    '/mobil/',
    '/booking',
    '/booking-sukses',
    '/welcome',
    '/login',
    '/masuk',
    '/daftar',
    '/preferensi',
  ];

  const shouldHide = hideRoutes.some((prefix) => location.pathname.startsWith(prefix));

  // Load favorite count for logged in users
  const refreshFavoriteCount = useCallback(() => {
    if (!token) {
      setFavoriteCount(0);
      return;
    }
    fetchFavoriteIds().then(() => {
      setFavoriteCount(getFavoriteCount());
    });
  }, [token]);

  useEffect(() => {
    refreshFavoriteCount();

    const unsub = subscribeFavorites(() => {
      setFavoriteCount(token ? getFavoriteCount() : 0);
    });
    return unsub;
  }, [refreshFavoriteCount, token]);

  if (shouldHide) {
    return null;
  }

  const navItems = [
    { to: '/', label: 'Beranda', icon: Home, exact: true },
    { to: '/cari', label: 'Katalog', icon: Search },
    { to: '/segmen', label: 'Segmen', icon: Layers },
    { to: '/favorit', label: 'Favorit', icon: Heart, badge: favoriteCount },
    { to: '/akun', label: 'Akun', icon: User },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-[#F6F6FB]/95 dark:bg-[#0D0D14]/95 backdrop-blur-md border-t border-[#E4E4EE] dark:border-[#2A2A38] shadow-md md:hidden pb-[calc(0.5rem+env(safe-area-inset-bottom))] transition-colors duration-200"
      aria-label="Navigasi Utama Mobile"
    >
      <div className="grid grid-cols-5 h-14 max-w-md mx-auto items-center">
        {navItems.map((item) => {
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={(e) => {
                if (item.to === '/favorit' && !token) {
                  e.preventDefault();
                  requestLoginPrompt({
                    title: 'Masuk untuk melihat favorit kamu',
                    description: 'Simpan mobil yang Anda taksir, bandingkan, dan lihat rekomendasi yang mirip.',
                  });
                }
              }}
              className={`flex flex-col items-center justify-center py-1 transition-colors relative text-xs group active:scale-95 ${
                isActive
                  ? 'text-[#5B4EF0] dark:text-[#8277FF] font-bold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 font-medium'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? 'scale-110 stroke-[2.2px]' : 'stroke-2'
                  }`}
                  fill={isActive ? 'currentColor' : 'none'}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#EF4444] px-1 text-[10px] font-bold leading-none text-white shadow-xs">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
