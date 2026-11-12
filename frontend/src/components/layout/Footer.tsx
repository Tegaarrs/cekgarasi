import { Link } from 'react-router-dom';
import { Layers, BarChart3, ShieldCheck, GitBranch } from 'lucide-react';
import { Logo } from '@/components/common/Logo';

export function Footer() {
  return (
    <footer className="border-t border-white/10 dark:border-[#2A2A38] bg-[#0B0B0F] text-zinc-300 mt-auto transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          
          {/* Brand & Capstone Attribution */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3 group">
              <Logo size="md" wordmarkClassName="text-white" />
            </Link>
            <p className="text-xs text-zinc-400 max-w-md leading-relaxed font-normal">
              CekGarasi: Platform Business Intelligence dan analisis pasar mobil bekas berbasis algoritma <span className="text-[#60A5FA] font-semibold">K-Means Clustering</span>. Membantu calon pembeli dan pengelola dealer memahami segmentasi pasar, posisi harga objektif, serta karakteristik unit secara transparan dan terukur.
            </p>
          </div>

          {/* Navigasi Pembeli */}
          <div>
            <h4 className="text-xs font-semibold tracking-wider uppercase text-white mb-3">
              Navigasi Platform
            </h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li><Link to="/" className="hover:text-white transition-colors">Beranda</Link></li>
              <li><Link to="/cari" className="hover:text-white transition-colors">Katalog Mobil</Link></li>
              <li><Link to="/segmen" className="hover:text-white transition-colors">Segmen Pasar K-Means</Link></li>
              <li><Link to="/bandingkan" className="hover:text-white transition-colors">Bandingkan Unit</Link></li>
              <li><Link to="/metodologi" className="hover:text-white transition-colors">Metodologi &amp; Evaluasi</Link></li>
              <li><Link to="/favorit" className="hover:text-white transition-colors">Mobil Favorit</Link></li>
            </ul>
          </div>

          {/* Landasan Metodologi & Dealer Portal */}
          <div>
            <h4 className="text-xs font-semibold tracking-wider uppercase text-white mb-3">
              Business Intelligence
            </h4>
            <div className="space-y-2.5 text-xs text-zinc-400">
              <div className="flex items-start gap-2">
                <Layers className="h-4 w-4 text-[#5B4EF0] flex-shrink-0 mt-0.5" />
                <span>Segmentasi K-Means (K=3)</span>
              </div>
              <div className="flex items-start gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Indeks Posisi Harga Pasar</span>
              </div>
              <div className="flex items-start gap-2">
                <GitBranch className="h-4 w-4 text-zinc-400 flex-shrink-0 mt-0.5" />
                <span>Normalisasi MinMax &amp; Evaluasi Silhouette</span>
              </div>
              <div className="pt-2">
                <Link
                  to="/admin/dashboard"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8277FF] hover:text-[#988FFF] transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Portal Dealer &amp; Admin</span>
                </Link>
              </div>
            </div>
          </div>

        </div>

        <div className="pt-6 border-t border-white/10 text-xs text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>&copy; {new Date().getFullYear()} CekGarasi. Segmentasi otomatis algoritma K-Means Clustering (K=3).</span>
        </div>
      </div>
    </footer>
  );
}
