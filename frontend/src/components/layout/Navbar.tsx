import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User as UserIcon, LogOut, Heart } from 'lucide-react';
import { getUser, removeToken } from '@/services/api';
import { Logo } from '@/components/common/Logo';
import { subscribeFavorites, fetchFavoriteIds, getFavoriteCount } from '@/services/favoriteStore';

interface UserProfile {
  id: number;
  nama: string;
  email: string;
  role: string;
}

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUserState] = useState<UserProfile | null>(getUser());
  const [favCount, setFavCount] = useState<number>(getFavoriteCount());

  useEffect(() => {
    setUserState(getUser());
  }, [location.pathname]);

  useEffect(() => {
    if (user) {
      fetchFavoriteIds().then(() => {
        setFavCount(getFavoriteCount());
      });
    }
    const unsub = subscribeFavorites(() => {
      setFavCount(getFavoriteCount());
    });
    return unsub;
  }, [user]);

  const handleLogout = () => {
    removeToken();
    localStorage.removeItem('cekgarasi_user');
    setUserState(null);
    navigate('/');
  };

  const navLinks = [
    { to: '/welcome', label: 'Portal Masuk' },
    { to: '/', label: 'Beranda' },
    { to: '/cari', label: 'Katalog Mobil' },
    { to: '/admin/dashboard', label: 'Portal Dealer' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5 group">
          <Logo size="md" />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((item) => {
            const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-100 text-blue-600 dark:bg-slate-800 dark:text-blue-400 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2.5">
              <Link
                to="/favorit"
                aria-label={favCount > 0 ? `Favorit saya, ${favCount} mobil` : 'Favorit saya, kosong'}
                className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  location.pathname === '/favorit'
                    ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-400'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <Heart
                  className={`h-4 w-4 transition-colors ${
                    location.pathname === '/favorit' || favCount > 0
                      ? 'fill-rose-500 text-rose-500'
                      : 'text-slate-500'
                  }`}
                />
                <span>Favorit saya</span>
                {favCount > 0 && (
                  <span className="ml-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white shadow-xs">
                    {favCount > 99 ? '99+' : favCount}
                  </span>
                )}
              </Link>

              <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <UserIcon className="h-3.5 w-3.5 text-blue-600" />
                <span>{user.nama || user.email}</span>
                {user.role === 'admin' && (
                  <Link
                    to="/admin/dashboard"
                    className="rounded bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-blue-700 transition-colors ml-1 shadow-sm"
                  >
                    Dashboard Admin
                  </Link>
                )}
              </span>
              <button
                onClick={handleLogout}
                title="Keluar"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/welcome"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Masuk
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
