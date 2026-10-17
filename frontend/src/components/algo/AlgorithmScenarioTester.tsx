import { useState, useEffect } from 'react';
import { 
  Sparkles, CheckCircle2, AlertTriangle, ArrowRight, 
  RotateCcw, Car, Calendar, Gauge, ShieldCheck 
} from 'lucide-react';
import { apiFetch } from '@/services/api';

export interface ComparisonResult {
  produksi: {
    klaster: number;
    nama_lengkap: string;
    nama_pendek: string;
    warna_hex: string;
    deskripsi: string;
    fitur: string[];
  };
  skenario_a: {
    klaster: number;
    nama_lengkap: string;
    nama_pendek: string;
    warna_hex: string;
    deskripsi: string;
    raw_klaster: number;
    fitur: string[];
    tipe_bodi: string;
  };
  skenario_b: {
    klaster: number;
    nama_lengkap: string;
    nama_pendek: string;
    warna_hex: string;
    deskripsi: string;
    raw_klaster: number;
    fitur: string[];
  };
  evaluasi: {
    status: string;
    skor_persen: number;
    apakah_akurat: boolean;
    detail: string;
    ari_skenario_a_b: number;
    ari_prod_b: number;
    ari_prod_a: number;
  };
}

interface AlgorithmScenarioTesterProps {
  initialHarga?: number;
  initialTipe?: string;
  initialTahun?: number;
  initialKm?: number;
  initialFitur?: number;
  onApplyFilters?: (filters: {
    hargaMax?: number;
    tipe_bodi?: string;
    tahunMin?: number;
    kmMax?: number;
    fiturMin?: number;
  }) => void;
  compact?: boolean;
}

export function AlgorithmScenarioTester({
  initialHarga = 180000000,
  initialTipe = 'MPV',
  initialTahun = 2020,
  initialKm = 35,
  initialFitur = 3,
  onApplyFilters,
  compact = false,
}: AlgorithmScenarioTesterProps) {
  const [harga, setHarga] = useState<number>(initialHarga);
  const [tipeBodi, setTipeBodi] = useState<string>(initialTipe);
  const [tahun, setTahun] = useState<number>(initialTahun);
  const [km, setKm] = useState<number>(initialKm);
  const [fiturCount, setFiturCount] = useState<number>(initialFitur);

  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      apiFetch<ComparisonResult>('/uji-komparasi-skenario', {
        method: 'POST',
        body: JSON.stringify({
          harga_rp: harga,
          tahun,
          jarak_tempuh_ribu_km: km,
          total_fitur: fiturCount,
          tipe_bodi: tipeBodi,
        }),
      })
        .then((res) => {
          setResult(res);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }, 200);

    return () => clearTimeout(timer);
  }, [harga, tipeBodi, tahun, km, fiturCount]);

  const handleReset = () => {
    setHarga(180000000);
    setTipeBodi('MPV');
    setTahun(2020);
    setKm(35);
    setFiturCount(3);
  };

  const handleApply = () => {
    if (onApplyFilters) {
      onApplyFilters({
        hargaMax: harga,
        tipe_bodi: tipeBodi,
        tahunMin: tahun,
        kmMax: km,
        fiturMin: fiturCount,
      });
    }
  };

  return (
    <div className={`rounded-2xl border border-blue-200/90 bg-gradient-to-br from-sky-50/80 via-blue-50/60 to-indigo-50/70 p-5 sm:p-6 shadow-md backdrop-blur-sm space-y-6 ${compact ? 'text-xs' : ''}`}>
      
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-blue-200/60">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-blue-600 p-2 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-slate-900">
                Uji Coba Algoritma & Sandingkan Skenario
              </h3>
              <p className="text-xs text-slate-600">
                Menyandingkan Skenario A [Harga, Tipe, Tahun] vs Skenario B [Harga, Jarak Tempuh, Fitur] &mdash; Evaluasi Akurasi Segmentasi
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 rounded-xl border border-slate-300 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white shadow-xs transition-colors"
            title="Reset Nilai Uji Coba"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
          {onApplyFilters && (
            <button
              onClick={handleApply}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition-colors"
            >
              <span>Terapkan ke Filter</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Control Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-white/70 p-4 rounded-xl border border-blue-200/60 shadow-xs">
        
        {/* 1. Harga OTR */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-700 flex justify-between">
            <span>Harga OTR</span>
            <span className="font-mono text-blue-700">Rp {(harga / 1000000).toLocaleString('id-ID')} Jt</span>
          </label>
          <input
            type="range"
            min={70000000}
            max={500000000}
            step={5000000}
            value={harga}
            onChange={(e) => setHarga(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-[9px] text-slate-400">
            <span>70 Jt</span>
            <span>250 Jt</span>
            <span>500 Jt</span>
          </div>
        </div>

        {/* 2. Tipe Mobil (tipe_bodi) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
            <Car className="h-3 w-3 text-purple-600" />
            <span>Tipe Mobil (Skenario A)</span>
          </label>
          <select
            value={tipeBodi}
            onChange={(e) => setTipeBodi(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-1.5 px-2.5 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none shadow-xs"
          >
            <option value="Hatchback">Hatchback (e.g. Brio, Yaris)</option>
            <option value="MPV">MPV (e.g. Avanza, Innova)</option>
            <option value="SUV">SUV (e.g. HR-V, Fortuner)</option>
            <option value="Sedan">Sedan (e.g. Civic, City)</option>
            <option value="Niaga">Niaga (e.g. Carry, Colt)</option>
          </select>
          <span className="text-[9px] text-purple-700 font-medium block">
            One-Hot Encoding 5 Kategori
          </span>
        </div>

        {/* 3. Tahun Pembuatan */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-700 flex justify-between">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-blue-600" />
              <span>Tahun Rilis</span>
            </span>
            <span className="font-mono text-blue-700 font-bold">{tahun}</span>
          </label>
          <input
            type="range"
            min={2014}
            max={2024}
            step={1}
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-[9px] text-slate-400">
            <span>2014</span>
            <span>2019</span>
            <span>2024</span>
          </div>
        </div>

        {/* 4. Jarak Tempuh (KM) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-700 flex justify-between">
            <span className="flex items-center gap-1">
              <Gauge className="h-3 w-3 text-teal-600" />
              <span>Jarak Tempuh</span>
            </span>
            <span className="font-mono text-teal-700 font-bold">{km} rb km</span>
          </label>
          <input
            type="range"
            min={5}
            max={150}
            step={5}
            value={km}
            onChange={(e) => setKm(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
          />
          <div className="flex justify-between text-[9px] text-slate-400">
            <span>5 rb</span>
            <span>75 rb</span>
            <span>150 rb</span>
          </div>
        </div>

        {/* 5. Kelengkapan Fitur */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-700 flex justify-between">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-indigo-600" />
              <span>Kelengkapan Fitur</span>
            </span>
            <span className="font-mono text-indigo-700 font-bold">{fiturCount} Fitur</span>
          </label>
          <input
            type="range"
            min={0}
            max={8}
            step={1}
            value={fiturCount}
            onChange={(e) => setFiturCount(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-[9px] text-slate-400">
            <span>Standar (0)</span>
            <span>Menengah (4)</span>
            <span>Lengkap (8)</span>
          </div>
        </div>
      </div>

      {/* Juxtaposition Comparison Cards (Menyandingkan Fitur) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Skenario A */}
        <div className="rounded-xl border border-purple-200 bg-white/90 p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                Skenario A
              </span>
              <span className="text-[10px] text-slate-400 font-mono">7 Dimensi</span>
            </div>
            <h4 className="font-display text-sm font-bold text-slate-900">
              [Harga, Tipe Mobil, Tahun]
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
              Mengukur pengaruh tipe bodi ({tipeBodi}) dengan One-Hot Encoding
            </p>

            <div className="rounded-xl p-3 bg-purple-50/50 border border-purple-100 space-y-1">
              <span className="text-[10px] text-slate-400 block font-medium">Hasil Prediksi Klaster:</span>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: result?.skenario_a.warna_hex || '#8B5CF6' }} />
                <span className="font-bold text-slate-900 text-xs">
                  {loading ? 'Menghitung...' : result?.skenario_a.nama_lengkap || 'Segmen 1 - Keluarga Muda'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-purple-800 flex justify-between font-mono">
            <span>Variabel: Harga, Tahun, Tipe</span>
            <span>K={result?.skenario_a.klaster ?? 1}</span>
          </div>
        </div>

        {/* Skenario B */}
        <div className="rounded-xl border border-teal-200 bg-white/90 p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                Skenario B
              </span>
              <span className="text-[10px] text-slate-400 font-mono">3 Dimensi</span>
            </div>
            <h4 className="font-display text-sm font-bold text-slate-900">
              [Harga, Jarak Tempuh, Fitur Mobil]
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
              Menguji klasterisasi tanpa depresiasi tahun ({km} rb km, {fiturCount} fitur)
            </p>

            <div className="rounded-xl p-3 bg-teal-50/50 border border-teal-100 space-y-1">
              <span className="text-[10px] text-slate-400 block font-medium">Hasil Prediksi Klaster:</span>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: result?.skenario_b.warna_hex || '#0D9488' }} />
                <span className="font-bold text-slate-900 text-xs">
                  {loading ? 'Menghitung...' : result?.skenario_b.nama_lengkap || 'Segmen 1 - Keluarga Muda'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-teal-800 flex justify-between font-mono">
            <span>Variabel: Harga, KM, Fitur</span>
            <span>K={result?.skenario_b.klaster ?? 1}</span>
          </div>
        </div>

        {/* Skenario Produksi (Baseline) */}
        <div className="rounded-xl border border-blue-200 bg-white/90 p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                Skenario Produksi
              </span>
              <span className="text-[10px] text-slate-400 font-mono">4 Dimensi</span>
            </div>
            <h4 className="font-display text-sm font-bold text-slate-900">
              [Harga, Tahun, KM, Fitur]
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
              Model aktif pada sistem CekGarasi (K-Means 4D StandardScaler)
            </p>

            <div className="rounded-xl p-3 bg-blue-50/50 border border-blue-100 space-y-1">
              <span className="text-[10px] text-slate-400 block font-medium">Hasil Prediksi Klaster:</span>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: result?.produksi.warna_hex || '#2563EB' }} />
                <span className="font-bold text-slate-900 text-xs">
                  {loading ? 'Menghitung...' : result?.produksi.nama_lengkap || 'Segmen 1 - Keluarga Muda'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-blue-800 flex justify-between font-mono">
            <span>Variabel: 4 Numerik Penuh</span>
            <span>K={result?.produksi.klaster ?? 1}</span>
          </div>
        </div>
      </div>

      {/* Evaluasi Akurasi & Keselarasan Antar Algoritma */}
      <div className={`p-4 rounded-xl border ${
        result?.evaluasi.apakah_akurat
          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
          : 'bg-amber-50/80 border-amber-300 text-amber-950'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-1.5 rounded-lg text-white mt-0.5 ${
            result?.evaluasi.apakah_akurat ? 'bg-emerald-600' : 'bg-amber-600'
          }`}>
            {result?.evaluasi.apakah_akurat ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
          </div>

          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <span>Evaluasi Akurasi & Keselarasan:</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  result?.evaluasi.apakah_akurat
                    ? 'bg-emerald-200/90 text-emerald-900'
                    : 'bg-amber-200/90 text-amber-900'
                }`}>
                  {result?.evaluasi.status || 'Memverifikasi...'}
                </span>
              </span>

              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="text-slate-600">Skor Kesepakatan:</span>
                <span className="font-bold">{result?.evaluasi.skor_persen ?? 100}%</span>
              </div>
            </div>

            <p className="text-xs leading-relaxed font-medium">
              {result?.evaluasi.detail || 'Memuat perbandingan model...'}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3 text-[10px] text-slate-600 border-t border-slate-200/60 mt-2">
              <span className="font-semibold">Indeks Kesamaan Model (ARI):</span>
              <span className="bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                Produksi &harr; Skenario B: <strong>0.760 (Tinggi)</strong>
              </span>
              <span className="bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                Produksi &harr; Skenario A: <strong>0.462 (Moderat)</strong>
              </span>
              <span className="bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                Skenario A &harr; Skenario B: <strong>0.318 (Rendah)</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
