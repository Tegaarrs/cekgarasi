import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { 
  LayoutDashboard, PieChart, Car, Users, UserCheck, Database, 
  ArrowLeft, LogOut, BarChart3, Sun, Moon
} from 'lucide-react';
import { getUser, removeToken } from '@/services/api';
import { useTheme } from '@/context/ThemeContext';

export function AdminLayout() {
  const navigate = useNavigate();
  const shouldReduce = useReducedMotion();
  const { theme, toggleTheme } = useTheme();
  const user = getUser<{ nama: string; role: string }>();

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center text-white">
        <div className="max-w-md p-8 rounded-2xl border border-white/10 bg-slate-800 shadow-2xl">
          <img src="/images/logo.png" alt="CekGarasi Logo" className="h-14 w-14 mx-auto mb-4 rounded-full ring-2 ring-white/20 shadow-md object-contain" />
          <h2 className="text-xl font-bold">Akses Terbatas Administrator</h2>
          <p className="mt-2 text-xs text-slate-400">
            Halaman ini khusus untuk dealer &amp; admin CekGarasi. Silakan masuk terlebih dahulu dengan akun berwenang.
          </p>
          <button
            onClick={() => navigate('/admin/login')}
            className="cg-btn-primary mt-6 w-full rounded-[10px] py-2.5 text-xs font-semibold text-white cursor-pointer"
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
    { to: '/admin/inventori', icon: Car, label: 'Manajemen Inventori' },
    { to: '/admin/leads', icon: Users, label: 'Leads & Test Drive' },
    { to: '/admin/pengguna', icon: UserCheck, label: 'Manajemen Pengguna' },
    { to: '/admin/database', icon: Database, label: 'Database Explorer' },
  ];

  return (
    <div className="min-h-screen bg-[#F6F6FB] dark:bg-[#0D0D14] text-[#14141F] dark:text-[#E8E8F0] flex flex-col md:flex-row transition-colors duration-200">
      
      {/* Sidebar - CekGarasi Control Room */}
      <aside className="w-full md:w-64 bg-[#0B0B0F] text-white flex-shrink-0 flex flex-col justify-between border-r border-white/10 font-sans">
        <div>
          <div className="p-4 border-b border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src="/images/logo.png"
                alt="CekGarasi Logo"
                className="h-9 w-9 object-contain rounded-full ring-1 ring-white/20 shadow-sm bg-zinc-900"
              />
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8277FF] block">
                  PORTAL DEALER
                </span>
                <div className="text-base font-bold text-white leading-tight">
                  CekGarasi
                </div>
              </div>
            </div>
            <span className="rounded-full bg-[#5B4EF0] px-2 py-0.5 text-[10px] font-bold text-white">
              Admin
            </span>
          </div>

          <nav className="p-3 space-y-1">
            {navItems.map((item, idx) => (
              <motion.div
                key={item.to}
                initial={shouldReduce ? { opacity: 1 } : { opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: shouldReduce ? 0 : idx * 0.04, duration: 0.2 }}
                whileHover={shouldReduce ? {} : { x: 3 }}
                whileTap={shouldReduce ? {} : { scale: 0.98 }}
              >
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `group relative flex items-center justify-between rounded-[10px] px-3 py-2.5 text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-[#2A2A33] text-white font-semibold'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-2.5 relative z-10">
                        <div
                          className={`p-1.5 rounded-[8px] transition-colors ${
                            isActive
                              ? 'bg-[#5B4EF0] text-white shadow-xs'
                              : 'bg-zinc-800/80 text-zinc-400 group-hover:text-white group-hover:bg-zinc-700'
                          }`}
                        >
                          <item.icon className="h-4 w-4" />
                        </div>
                        <span>{item.label}</span>
                      </div>

                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active-pill"
                          className="relative z-10 w-1.5 h-4 rounded-full bg-[#5B4EF0]"
                          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              </motion.div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content Area with Sticky Top Navigation Bar */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden bg-[#F6F6FB] dark:bg-[#0D0D14] transition-colors">
        {/* Top Bar Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 bg-[#0B0B0F] text-white border-b border-white/10 select-none">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-[8px] text-xs font-medium bg-white/10 border border-white/10 text-white">
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
              className="p-2 rounded-full border border-white/10 bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-zinc-300" />
              )}
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-xs font-medium text-white border border-white/10 bg-white/10">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="truncate max-w-[140px] sm:max-w-none">{user.nama}</span>
            </div>

            <motion.button
              type="button"
              onClick={() => navigate('/')}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-medium border border-white/15 bg-white/10 hover:bg-white/15 text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-zinc-300" />
              <span>Kembali ke Website</span>
            </motion.button>

            <motion.button
              type="button"
              onClick={() => {
                removeToken();
                localStorage.removeItem('cekgarasi_user');
                navigate('/admin/login');
              }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Keluar</span>
            </motion.button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
