import { Link } from 'react-router-dom';
import { Layers, Calendar, Calculator } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { content } from '@/content/id';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3 group">
              <Logo size="md" />
            </Link>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
              {content.brand.description}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
              Jelajahi
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li><Link to="/" className="hover:text-blue-600 transition-colors">Beranda</Link></li>
              <li><Link to="/cari" className="hover:text-blue-600 transition-colors">Katalog Mobil</Link></li>
              <li><Link to="/segmen" className="hover:text-blue-600 transition-colors">Segmen Pasar</Link></li>
              <li><Link to="/welcome" className="hover:text-blue-600 transition-colors">Portal Masuk</Link></li>
              <li><Link to="/admin/dashboard" className="hover:text-blue-600 transition-colors">Portal Dealer & Admin</Link></li>
            </ul>
          </div>

          {/* Fitur Utama */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
              Fitur CekGarasi
            </h4>
            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <span>Segmentasi K-Means Otomatis</span>
              </div>
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>Simulasi Cicilan Transparan</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                <span>Jadwal Test Drive Online</span>
              </div>
            </div>
          </div>

        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>&copy; {new Date().getFullYear()} CekGarasi. Hak cipta dilindungi undang-undang.</span>
          <span className="text-[11px] text-slate-400">
            Ditenagai oleh Machine Learning K-Means Scikit-Learn
          </span>
        </div>
      </div>
    </footer>
  );
}
