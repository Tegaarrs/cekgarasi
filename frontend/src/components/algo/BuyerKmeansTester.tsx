import { useState, useEffect } from 'react';
import { 
  Sparkles, RotateCcw, ArrowRight, Gauge, 
  Calendar, DollarSign, CheckCircle2, Sliders
} from 'lucide-react';
import { apiFetch } from '@/services/api';

export interface BuyerKmeansTesterProps {
  onApplyFilters?: (filters: {
    segmen?: string;
    hargaMax?: number;
    tahunMin?: number;
    kmMax?: number;
    fiturMin?: number;
  }) => void;
  compact?: boolean;
  title?: string;
  subtitle?: string;
}

interface PredictionResponse {
  produksi: {
    klaster: number;
    nama_lengkap: string;
    nama_pendek: string;
    warna_hex: string;
    deskripsi: string;
    fitur?: string[];
  };
}

export function BuyerKmeansTester({
  onApplyFilters,
  compact = false,
  title = "Cari Kategori Mobil Sesuai Budget & Kriteria Anda",
  subtitle = "Atur kisaran harga, tahun pembuatan, jarak tempuh, dan kelengkapan fitur untuk menemukan kategori mobil yang paling pas untuk kebutuhan Anda.",
}: BuyerKmeansTesterProps) {
  const [harga, setHarga] = useState<number>(180000000);
  const [tahun, setTahun] = useState<number>(2020);
  const [km, setKm] = useState<number>(40);
  const [fiturCount, setFiturCount] = useState<number>(3);

  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Debounced real-time prediction
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      apiFetch<PredictionResponse>('/uji-komparasi-skenario', {
        method: 'POST',
        body: JSON.stringify({
          harga_rp: harga,
          tahun,
          jarak_tempuh_ribu_km: km,
          total_fitur: fiturCount,
          tipe_bodi: 'MPV',
        }),
      })
        .then((res) => {
          setResult(res);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }, 150);

    return () => clearTimeout(timer);
  }, [harga, tahun, km, fiturCount]);

  const handleReset = () => {
    setHarga(180000000);
    setTahun(2020);
    setKm(40);
    setFiturCount(3);
  };

  const currentCluster = result?.produksi;
  const slug = currentCluster
    ? currentCluster.klaster === 0
      ? 'premium'
      : currentCluster.klaster === 1
      ? 'keluarga-muda'
      : 'ekonomis'
    : 'premium';

  const handleApply = () => {
    if (onApplyFilters) {
      onApplyFilters({
        segmen: slug,
        hargaMax: harga,
        tahunMin: tahun,
        kmMax: km,
        fiturMin: fiturCount,
      });
    }
  };

  return (
    <div className={`ios-glass-card rounded-3xl ${compact ? 'p-3.5 sm:p-4 text-xs' : 'p-5 sm:p-6'}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-blue-600/90 text-white shadow-xs backdrop-blur-md">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {title}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleReset}
            className="ios-glass-btn-secondary inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          {onApplyFilters && (
            <button
              type="button"
              onClick={handleApply}
              className="ios-glass-btn-primary liquid-shine inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white"
            >
              <span>Terapkan ke Filter</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Interactive Controls & Live Result Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
        
        {/* Left: 4 Input Sliders */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* 1. Harga OTR */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 sm:p-5 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-100">
                <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Estimasi Harga</span>
              </span>
              <span className="font-mono text-blue-700 dark:text-blue-400 font-black text-base sm:text-lg">
                Rp {(harga / 1000000).toLocaleString('id-ID')} Juta
              </span>
            </div>
            <input
              type="range"
              min={70000000}
              max={550000000}
              step={5000000}
              value={harga}
              onChange={(e) => setHarga(Number(e.target.value))}
              aria-label="Estimasi Harga Listing"
              className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mt-2">
              <span className="font-extrabold text-slate-900 dark:text-white">Rp 70 Jt</span>
              <span className="font-medium text-slate-500 dark:text-slate-400">Rp 250 Jt</span>
              <span className="font-extrabold text-slate-900 dark:text-white">Rp 550 Jt</span>
            </div>
          </div>

          {/* 2. Tahun Pembuatan */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 sm:p-5 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-100">
                <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Tahun Pembuatan</span>
              </span>
              <span className="font-mono text-emerald-700 dark:text-emerald-400 font-black text-base sm:text-lg">
                Tahun {tahun}
              </span>
            </div>
            <input
              type="range"
              min={2012}
              max={2024}
              step={1}
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value))}
              aria-label="Tahun Pembuatan"
              className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mt-2">
              <span className="font-extrabold text-slate-900 dark:text-white">2012</span>
              <span className="font-medium text-slate-500 dark:text-slate-400">2018</span>
              <span className="font-extrabold text-slate-900 dark:text-white">2024</span>
            </div>
          </div>

          {/* 3 & 4: Jarak Tempuh & Fitur */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Odometer */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 sm:p-5 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-100">
                  <Gauge className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Jarak Tempuh</span>
                </span>
                <span className="font-mono text-amber-700 dark:text-amber-400 font-black text-sm sm:text-base">
                  {km} rb km
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={180}
                step={5}
                value={km}
                onChange={(e) => setKm(Number(e.target.value))}
                aria-label="Jarak Tempuh Odometer"
                className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mt-2">
                <span className="font-extrabold text-slate-900 dark:text-white">5 rb km</span>
                <span className="font-medium text-slate-500 dark:text-slate-400">90 rb km</span>
                <span className="font-extrabold text-slate-900 dark:text-white">180 rb km</span>
              </div>
            </div>

            {/* Kelengkapan Fitur */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 sm:p-5 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-100">
                  <Sliders className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Kelengkapan Fitur</span>
                </span>
                <span className="font-mono text-purple-700 dark:text-purple-400 font-black text-sm sm:text-base">
                  {fiturCount} / 11 Fitur
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={11}
                step={1}
                value={fiturCount}
                onChange={(e) => setFiturCount(Number(e.target.value))}
                aria-label="Kelengkapan Fitur"
                className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mt-2">
                <span className="font-extrabold text-slate-900 dark:text-white">Standar (0)</span>
                <span className="font-medium text-slate-500 dark:text-slate-400">Menengah (5)</span>
                <span className="font-extrabold text-slate-900 dark:text-white">Lengkap (11)</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right: Live Classification Output */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-5 sm:p-6 shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600" />
                </span>
                <span className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Hasil Pencocokan Sistem Pintar (Live)
                </span>
              </div>
              {loading && (
                <span className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-bold animate-pulse">
                  Menganalisis pola pasar...
                </span>
              )}
            </div>

            {currentCluster ? (
              <div className="space-y-4">
                <div 
                  className="rounded-2xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden cg-ripple transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  style={{ backgroundColor: currentCluster.warna_hex || '#2563EB' }}
                >
                  <span className="inline-block text-xs sm:text-sm font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-white/20 border border-white/30 backdrop-blur-md mb-2">
                    Rekomendasi Pintar • Kelas #{currentCluster.klaster + 1}
                  </span>
                  <div className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
                    {currentCluster.nama_lengkap?.replace(/komuter/gi, 'Praktis')}
                  </div>
                  <div className="text-sm sm:text-base font-medium opacity-95 mt-2.5 leading-relaxed">
                    {currentCluster.deskripsi?.replace(/komuter/gi, 'Praktis')}
                  </div>
                  <div className="absolute -bottom-6 -right-6 w-28 h-28 rounded-full bg-white/10 blur-sm pointer-events-none" />
                </div>

                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 p-4 sm:p-5 space-y-2.5 shadow-2xs">
                  <div className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span>Hasil Analisis Pola Pasar:</span>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    Berdasarkan pembelajaran data dari ratusan unit di pasar, kombinasi budget <strong className="font-black text-slate-900 dark:text-white">Rp {(harga/1000000).toLocaleString('id-ID')} Jt</strong>, tahun <strong className="font-black text-slate-900 dark:text-white">{tahun}</strong>, dan jarak tempuh <strong className="font-black text-slate-900 dark:text-white">{km} rb km</strong> secara otomatis dikelompokkan oleh sistem pintar kami ke kategori <strong className="font-black text-blue-600 dark:text-blue-400">{currentCluster.nama_pendek?.replace(/komuter/gi, 'Praktis')}</strong> yang paling bernilai untuk Anda.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-400 py-8 text-center">
                Menganalisis kecocokan kategori mobil...
              </div>
            )}
          </div>

          {onApplyFilters && currentCluster && (
            <div className="pt-5 border-t border-slate-200 dark:border-slate-800 mt-5">
              <button
                type="button"
                onClick={handleApply}
                className="btn-luxury-primary cg-ripple w-full flex items-center justify-center gap-2.5 py-3 sm:py-3.5 px-5 rounded-2xl text-white font-extrabold text-sm sm:text-base shadow-md transition-all cursor-pointer group"
              >
                <span>Lihat Koleksi Mobil {currentCluster.nama_pendek?.replace(/komuter/gi, 'Praktis')} di Katalog</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
