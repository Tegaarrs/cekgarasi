import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { 
  LayoutDashboard, PieChart, Car, Users, Database, 
  ArrowLeft, LogOut
} from 'lucide-react';
import { getUser, removeToken } from '@/services/api';

export function AdminLayout() {
  const navigate = useNavigate();
  const shouldReduce = useReducedMotion();
  const user = getUser<{ nama: string; role: string }>();

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center text-white">
        <div className="max-w-md p-8 rounded-2xl border border-white/10 bg-slate-800 shadow-2xl">
          <img src="/images/logo.png" alt="CekGarasi Logo" className="h-16 w-16 mx-auto mb-4 rounded-full ring-2 ring-amber-400/40 shadow-lg object-contain" />
          <h2 className="text-xl font-bold">Akses Terbatas Administrator</h2>
          <p className="mt-2 text-xs text-slate-400">
            Halaman ini khusus untuk dealer & admin CekGarasi. Silakan masuk terlebih dahulu dengan akun berwenang.
          </p>
          <button
            onClick={() => navigate('/admin/login')}
            className="mt-6 w-full rounded-xl bg-indigo-600 py-3 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            Masuk ke Portal Dealer
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Ringkasan KPI' },
    { to: '/admin/segmentasi', icon: PieChart, label: 'Evaluasi K-Means' },
    { to: '/admin/inventori', icon: Car, label: 'Manajemen Inventori' },
    { to: '/admin/leads', icon: Users, label: 'Leads & Test Drive' },
    { to: '/admin/database', icon: Database, label: 'Database Explorer' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      
      {/* Sidebar with items fading in once on first load */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col justify-between border-r border-slate-800">
        <div>
          <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src="/images/logo.png"
                alt="CekGarasi Logo"
                className="h-10 w-10 object-contain rounded-full ring-2 ring-amber-400/40 shadow-sm"
              />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Dealer Center
                </span>
                <div className="font-display text-base font-bold text-white leading-tight">CekGarasi Admin</div>
              </div>
            </div>
            <span className="rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">
              v1.0
            </span>
          </div>

          <nav className="p-3 space-y-1">
            {navItems.map((item, idx) => (
              <motion.div
                key={item.to}
                initial={shouldReduce ? { opacity: 1 } : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: shouldReduce ? 0 : idx * 0.05, duration: 0.25 }}
              >
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              </motion.div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content Area with Sticky Top Navigation Bar */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Bar Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200/60 text-xs font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              Dealer Portal Hub
            </span>
          </div>

          {/* Bar Atas Pojok Kanan (Moved from Sidebar as requested) */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50" />
              <span className="truncate max-w-[160px] sm:max-w-none">{user.nama}</span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#001540] text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-blue-600" />
              <span>Kembali ke Website</span>
            </button>

            <button
              type="button"
              onClick={() => {
                removeToken();
                localStorage.removeItem('cekgarasi_user');
                navigate('/admin/login');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Keluar Akun Admin</span>
            </button>
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
