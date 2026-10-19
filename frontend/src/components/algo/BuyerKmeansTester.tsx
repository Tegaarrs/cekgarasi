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
  title = "Simulasi Segmen Pasar (Publik / Tanpa Login)",
  subtitle = "Uji langsung bagaimana karakteristik mobil dikelompokkan ke dalam segmen pasar berdasarkan 4 variabel data nyata.",
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
    <div className={`rounded-2xl border border-blue-200/90 bg-gradient-to-br from-blue-50/90 via-white to-indigo-50/80 shadow-sm ${compact ? 'p-3.5 sm:p-4 text-xs' : 'p-5 sm:p-6'}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-blue-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-blue-600 text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="font-display text-base sm:text-lg font-bold text-slate-900">
              {title}
            </h3>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          {onApplyFilters && (
            <button
              type="button"
              onClick={handleApply}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-xs transition-colors"
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
          <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
            <div className="flex justify-between items-center text-xs font-bold mb-1.5">
              <span className="flex items-center gap-1.5 text-slate-700">
                <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                <span>Estimasi Harga</span>
              </span>
              <span className="font-mono text-blue-700 font-extrabold text-sm">
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
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Rp 70 Jt</span>
              <span>Rp 250 Jt</span>
              <span>Rp 550 Jt</span>
            </div>
          </div>

          {/* 2. Tahun Pembuatan */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
            <div className="flex justify-between items-center text-xs font-bold mb-1.5">
              <span className="flex items-center gap-1.5 text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tahun Pembuatan</span>
              </span>
              <span className="font-mono text-emerald-700 font-extrabold text-sm">
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
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>2012</span>
              <span>2018</span>
              <span>2024</span>
            </div>
          </div>

          {/* 3 & 4: Jarak Tempuh & Fitur */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Odometer */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
              <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <Gauge className="w-3.5 h-3.5 text-amber-600" />
                  <span>Jarak Tempuh</span>
                </span>
                <span className="font-mono text-amber-700 font-extrabold">
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
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>5 rb</span>
                <span>90 rb</span>
                <span>180 rb</span>
              </div>
            </div>

            {/* Kelengkapan Fitur */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
              <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <Sliders className="w-3.5 h-3.5 text-purple-600" />
                  <span>Kelengkapan Fitur</span>
                </span>
                <span className="font-mono text-purple-700 font-extrabold">
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
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>Standar (0)</span>
                <span>Menengah (5)</span>
                <span>Lengkap (11)</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right: Live Classification Output */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-blue-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Perkiraan Segmen Pasar (Live)
              </span>
              {loading && (
                <span className="text-[10px] text-blue-600 font-semibold animate-pulse">
                  Mencocokkan segmen...
                </span>
              )}
            </div>

            {currentCluster ? (
              <div className="space-y-3.5">
                <div 
                  className="rounded-xl p-3.5 text-white shadow-xs"
                  style={{ backgroundColor: currentCluster.warna_hex || '#2563EB' }}
                >
                  <div className="text-[11px] font-semibold opacity-90">
                    Segmen {currentCluster.klaster}
                  </div>
                  <div className="text-base sm:text-lg font-black tracking-tight mt-0.5">
                    {currentCluster.nama_lengkap}
                  </div>
                  <div className="text-xs opacity-95 mt-1 leading-relaxed">
                    {currentCluster.deskripsi}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 space-y-2 text-xs text-slate-600">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Analisis Karakteristik Unit:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    Kombinasi harga <strong>Rp {(harga/1000000).toLocaleString('id-ID')} Jt</strong>, tahun <strong>{tahun}</strong>, dan jarak tempuh <strong>{km} rb km</strong> paling cocok masuk ke dalam kategori <strong>{currentCluster.nama_pendek}</strong>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-6 text-center">
                Memuat estimasi segmen pasar...
              </div>
            )}
          </div>

          {onApplyFilters && currentCluster && (
            <div className="pt-4 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={handleApply}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                <span>Terapkan Segmen ({currentCluster.nama_pendek}) ke Katalog</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
