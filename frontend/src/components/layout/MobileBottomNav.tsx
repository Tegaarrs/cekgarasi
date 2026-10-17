import { useEffect, useState, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, Layers, Heart, User } from 'lucide-react';
import { getToken, apiFetch } from '@/services/api';

export function MobileBottomNav() {
  const location = useLocation();
  const [favoriteCount, setFavoriteCount] = useState<number>(0);
  const token = getToken();

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
    apiFetch<{ items: unknown[] }>('/favorit')
      .then((res) => {
        if (res && Array.isArray(res.items)) {
          setFavoriteCount(res.items.length);
        }
      })
      .catch(() => {
        // ignore errors
      });
  }, [token]);

  useEffect(() => {
    refreshFavoriteCount();

    const handleFavChange = () => refreshFavoriteCount();
    window.addEventListener('cekgarasi:favorite_changed', handleFavChange);
    return () => {
      window.removeEventListener('cekgarasi:favorite_changed', handleFavChange);
    };
  }, [refreshFavoriteCount, location.pathname]);

  if (shouldHide) {
    return null;
  }

  const navItems = [
    { to: '/', label: 'Beranda', icon: Home, exact: true },
    { to: '/cari', label: 'Cari', icon: Search },
    { to: '/segmen', label: 'Segmen', icon: Layers },
    { to: '/favorit', label: 'Favorit', icon: Heart, badge: favoriteCount },
    { to: '/akun', label: 'Akun', icon: User },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg md:hidden pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
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
              className={`flex flex-col items-center justify-center py-1 transition-colors relative ${
                isActive ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.5px]' : 'stroke-2'
                  }`}
                  fill={isActive ? 'currentColor' : 'none'}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2.5 bg-rose-500 text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center leading-none shadow-xs">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight leading-none">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
