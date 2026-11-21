import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, PieChart, Car, Users, UserCheck, Database, 
  ArrowLeft, LogOut, BarChart3, Sun, Moon, BookOpen
} from 'lucide-react';
import { getUser, removeToken } from '@/services/api';
import { useTheme } from '@/context/ThemeContext';

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const mainScrollRef = useRef<HTMLElement>(null);
  const { theme, toggleTheme } = useTheme();
  const user = getUser<{ nama: string; role: string }>();

  useEffect(() => {
    mainScrollRef.current?.scrollTo({ top: 0, left: 0 });
  }, [location.pathname]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center text-white">
        <div className="max-w-md p-8 rounded-2xl border border-white/10 bg-slate-800 shadow-2xl">
          <img src="/images/logo.png" alt="CekGarasi Logo" className="h-14 w-14 mx-auto mb-4 rounded-full ring-2 ring-white/20 shadow-md object-contain" />
          <h2 className="text-xl font-bold">Akses Terbatas Administrator</h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Halaman ini khusus untuk dealer &amp; admin CekGarasi. Silakan masuk terlebih dahulu dengan akun berwenang.
          </p>
          <button
            onClick={() => navigate('/admin/login')}
            className="cg-btn-primary mt-6 w-full rounded-[10px] py-2.5 text-sm font-semibold text-white cursor-pointer"
          >
            Masuk ke Portal Dealer
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { to: '/admin/bi', icon: BarChart3, label: 'Dashboard BI K-Means' },
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Ringkasan KPI' },
    { to: '/admin/segmentasi', icon: PieChart, label: 'Evaluasi K-Means' },
    { to: '/admin/metodologi', icon: BookOpen, label: 'Metodologi & Algoritma' },
    { to: '/admin/inventori', icon: Car, label: 'Manajemen Inventori' },
    { to: '/admin/leads', icon: Users, label: 'Leads & Test Drive' },
    { to: '/admin/pengguna', icon: UserCheck, label: 'Manajemen Pengguna' },
    { to: '/admin/database', icon: Database, label: 'Database Explorer' },
  ];

  return (
    <div className="soft-light-shell min-h-screen md:h-screen md:overflow-hidden bg-[#E4E9F0] dark:bg-[#0D0D14] text-[#161D2A] dark:text-[#E8E8F0] flex flex-col md:flex-row transition-colors duration-200">
      
      {/* Static Sidebar - CekGarasi Control Room */}
      <aside className="w-full md:w-[272px] md:h-screen md:sticky md:top-0 md:overflow-y-auto bg-[#0B0B0F] dark:bg-[#11111A] text-white flex-shrink-0 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/10 font-sans transition-colors duration-200">
        <div>
          <div className="p-4 border-b border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src="/images/logo.png"
                alt="Logo CekGarasi"
                width={40}
                height={40}
                className="h-10 w-10 object-contain rounded-full ring-1 ring-white/20 shadow-sm bg-zinc-900"
              />
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#60A5FA] block">
                  PORTAL DEALER
                </span>
                <div className="text-lg font-bold text-white leading-tight">
                  CekGarasi
                </div>
              </div>
            </div>
            <span className="rounded-md bg-[#2563EB] px-2.5 py-0.5 text-xs font-bold text-white">
              Admin
            </span>
          </div>

          <nav aria-label="Menu Navigasi Admin" className="p-3 space-y-1.5">
            {navItems.map((item) => (
              <div key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `group relative flex items-center justify-between min-h-[44px] rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      isActive
                        ? 'bg-[#2A2A33] text-white font-semibold'
                        : 'text-zinc-300 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-2.5 relative z-10">
                        <div
                          className={`p-1.5 rounded-[8px] transition-colors ${
                            isActive
                              ? 'bg-[#2563EB] text-white shadow-xs'
                              : 'bg-zinc-800/80 text-zinc-400 group-hover:text-white group-hover:bg-zinc-700'
                          }`}
                        >
                          <item.icon aria-hidden="true" className="h-4 w-4" />
                        </div>
                        <span>{item.label}</span>
                      </div>

                      {isActive && (
                        <div className="relative z-10 w-1.5 h-4 rounded-full bg-[#3B82F6]" />
                      )}
                    </>
                  )}
                </NavLink>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content Area with Fixed Top Header & Independent Scroll */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen md:min-h-0 md:h-screen md:overflow-hidden bg-[#E4E9F0] dark:bg-[#0D0D14] transition-colors duration-200">
        {/* Top Bar Header */}
        <header className="sticky top-0 md:static flex-shrink-0 z-30 flex flex-wrap items-center justify-between gap-2 px-6 py-3 bg-[#0B0B0F] dark:bg-[#11111A] text-white border-b border-white/10 select-none transition-colors duration-200">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-[13px] font-medium bg-white/10 border border-white/10 text-white">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Portal Dealer &amp; Business Intelligence</span>
            </span>
          </div>

          {/* Bar Atas Pojok Kanan */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
              title={theme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
              className="p-2 rounded-full border border-white/10 bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-zinc-300" />
              )}
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-[13px] font-medium text-white border border-white/10 bg-white/10">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="truncate max-w-[140px] sm:max-w-none">{user.nama}</span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-[10px] text-[13px] font-medium border border-white/15 bg-white/10 hover:bg-white/15 text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5 text-zinc-300" />
              <span>Kembali ke Website</span>
            </button>

            <button
              type="button"
              onClick={() => {
                removeToken();
                localStorage.removeItem('cekgarasi_user');
                navigate('/admin/login', { replace: true });
              }}
              className="flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-[10px] text-[13px] font-semibold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              <LogOut aria-hidden="true" className="h-3.5 w-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        {/* Independently Scrollable Page Content */}
        <main
          ref={mainScrollRef}
          className="admin-workspace flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 text-[#161D2A] dark:text-[#E8E8F0] transition-colors duration-200"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
