import { Link } from 'react-router-dom';
import { ShieldCheck, Award } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src="/images/logo.png"
                alt="CekGarasi Logo"
                className="h-12 w-12 object-contain rounded-full shadow-md ring-1 ring-amber-400/30 group-hover:scale-105 transition-transform"
              />
              <div>
                <span className="font-display text-xl font-extrabold text-slate-900 dark:text-white leading-none">
                  Cek<span className="text-blue-600">Garasi</span>
                </span>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mt-0.5">
                  Beli Mobil Bekas Cerdas
                </span>
              </div>
            </Link>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
              Platform pasar mobil bekas pintar dengan segmentasi K-Means berbasis machine learning nyata. Transparan, terverifikasi inspeksi 160 titik, dan garansi resmi.
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
              <li><Link to="/welcome" className="hover:text-blue-600 transition-colors">Portal Masuk</Link></li>
              <li><Link to="/admin/dashboard" className="hover:text-blue-600 transition-colors">Portal Dealer & Admin</Link></li>
            </ul>
          </div>

          {/* Guarantee */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
              Jaminan CekGarasi
            </h4>
            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>100% Lolos Inspeksi 160 Titik</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <span>Garansi Mesin & Transmisi 1 Tahun</span>
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
