import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell 
} from 'recharts';
import { 
  RefreshCw, AlertCircle, Info, Layers, CheckCircle2, TrendingUp, Sparkles, Sliders 
} from 'lucide-react';
import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { Skeleton } from '@/components/motion/Skeleton';
import { apiFetch } from '@/services/api';

export interface ClusterProfile {
  klaster: number;
  count: number;
  median_price: number;
  median_year: number;
  median_mileage: number;
  mean_total_fitur: number;
  top_2_tipe_bodi: string[];
}

export interface ScenarioResult {
  skenario: 'produksi' | 'A' | 'B';
  k: number;
  fitur: string[];
  pakai_tipe: number;
  silhouette: number;
  davies_bouldin: number;
  calinski_harabasz: number;
  silhouette_uji: number;
  ari_rata: number;
  ari_min: number;
  profile: ClusterProfile[];
}

export interface PairwiseARIPair {
  pair: string;
  scenario1: string;
  scenario2: string;
  ari: number;
  kesamaan: string;
}

export interface ScenarioSummaryResponse {
  skenario: {
    produksi: ScenarioResult;
    A: ScenarioResult;
    B: ScenarioResult;
  };
  matrix: {
    [key: string]: { [key: string]: number };
  };
  pairs: PairwiseARIPair[];
  k: number;
}

const SCENARIO_META: Record<string, { label: string; badge: string; color: string; border: string; bg: string; text: string; features: string }> = {
  produksi: {
    label: 'Skenario Produksi',
    badge: 'Baseline (4 Dimensi)',
    color: '#2563EB',
    border: 'border-blue-200',
    bg: 'bg-blue-50/60',
    text: 'text-blue-700',
    features: 'harga_rp, tahun, jarak_tempuh_ribu_km, total_fitur',
  },
  A: {
    label: 'Skenario A',
    badge: 'Kategorikal (7 Dimensi)',
    color: '#8B5CF6',
    border: 'border-purple-200',
    bg: 'bg-purple-50/60',
    text: 'text-purple-700',
    features: 'harga_rp, tahun, tipe_bodi (One-Hot 5 Kategori)',
  },
  B: {
    label: 'Skenario B',
    badge: 'Tanpa Tahun (3 Dimensi)',
    color: '#0D9488',
    border: 'border-teal-200',
    bg: 'bg-teal-50/60',
    text: 'text-teal-700',
    features: 'harga_rp, jarak_tempuh_ribu_km, total_fitur',
  },
};

export function PerbandinganSkenarioTab() {
  const shouldReduce = useReducedMotion();

  const [selectedK, setSelectedK] = useState<number>(3);
  const [data, setData] = useState<ScenarioSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [profileViewTab, setProfileViewTab] = useState<'semua' | 'produksi' | 'A' | 'B'>('semua');

  const loadData = (kVal: number) => {
    setLoading(true);
    setError(null);
    apiFetch<ScenarioSummaryResponse>(`/admin/uji-skenario/ringkasan?k=${kVal}`)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message || 'Gagal memuat ringkasan uji skenario.');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData(selectedK);
  }, [selectedK]);

  const handleKChange = (kVal: number) => {
    if (kVal === selectedK && !loading) {
      loadData(kVal);
    } else {
      setSelectedK(kVal);
    }
  };

  const prod = data?.skenario.produksi;
  const a = data?.skenario.A;
  const b = data?.skenario.B;

  // Data for Chart 1: Silhouette Comparison (Train & Test)
  const silhouetteChartData = [
    {
      skenario: 'Produksi',
      fullSkenario: 'Skenario Produksi',
      silhouette: prod?.silhouette ?? 0,
      silhouette_uji: prod?.silhouette_uji ?? 0,
      color: '#2563EB',
    },
    {
      skenario: 'Skenario A',
      fullSkenario: 'Skenario A (+ Tipe Bodi)',
      silhouette: a?.silhouette ?? 0,
      silhouette_uji: a?.silhouette_uji ?? 0,
      color: '#8B5CF6',
    },
    {
      skenario: 'Skenario B',
      fullSkenario: 'Skenario B (Tanpa Tahun)',
      silhouette: b?.silhouette ?? 0,
      silhouette_uji: b?.silhouette_uji ?? 0,
      color: '#0D9488',
    },
  ];

  // Data for Chart 2: Davies-Bouldin Comparison (Lower is better)
  const daviesBouldinChartData = [
    {
      skenario: 'Produksi',
      davies_bouldin: prod?.davies_bouldin ?? 0,
      color: '#2563EB',
    },
    {
      skenario: 'Skenario A',
      davies_bouldin: a?.davies_bouldin ?? 0,
      color: '#8B5CF6',
    },
    {
      skenario: 'Skenario B',
      davies_bouldin: b?.davies_bouldin ?? 0,
      color: '#0D9488',
    },
  ];

  // Data for Chart 3: Calinski-Harabasz Comparison (Higher is better)
  const calinskiChartData = [
    {
      skenario: 'Produksi',
      calinski_harabasz: prod?.calinski_harabasz ?? 0,
      color: '#2563EB',
    },
    {
      skenario: 'Skenario A',
      calinski_harabasz: a?.calinski_harabasz ?? 0,
      color: '#8B5CF6',
    },
    {
      skenario: 'Skenario B',
      calinski_harabasz: b?.calinski_harabasz ?? 0,
      color: '#0D9488',
    },
  ];

  const formatRupiah = (val: number) => {
    return `Rp ${(val / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Jt`;
  };

  const getHeatmapColor = (ari: number) => {
    if (ari >= 0.99) return 'bg-slate-100 text-slate-800 font-bold';
    if (ari >= 0.70) return 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/80';
    if (ari >= 0.40) return 'bg-indigo-50 text-indigo-800 font-semibold border border-indigo-200/80';
    return 'bg-amber-50 text-amber-800 font-semibold border border-amber-200/80';
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-slate-900">
              Perbandingan Skenario Klasterisasi
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-300">
              <AlertCircle className="h-3 w-3" />
              Pemetaan tipe bodi masih draf
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Eksperimen non-destruktif in-memory untuk menguji dampak penambahan tipe bodi (one-hot) vs eliminasi variabel waktu pada K={selectedK}
          </p>
        </div>

        {/* K Selector 2-6 & Reload */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 pl-2 flex items-center gap-1">
              <Sliders className="h-3.5 w-3.5 text-slate-400" />
              Jumlah Klaster:
            </span>
            <div className="flex rounded-xl bg-slate-100 p-0.5">
              {[2, 3, 4, 5, 6].map((kVal) => (
                <button
                  key={kVal}
                  onClick={() => handleKChange(kVal)}
                  disabled={loading}
                  className={`relative px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    selectedK === kVal
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 disabled:opacity-50'
                  }`}
                >
                  {selectedK === kVal && !shouldReduce && (
                    <motion.div
                      layoutId="skenarioKPill"
                      className="absolute inset-0 bg-blue-600 rounded-lg -z-10"
                      transition={{ duration: 0.2 }}
                    />
                  )}
                  K={kVal}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => loadData(selectedK)}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-50"
            title="Hitung ulang simulasi in-memory"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>{loading ? 'Menghitung...' : 'Jalankan Ulang'}</span>
          </button>
        </div>
      </div>

      {/* Mandatory Note & Methodology Alert Card */}
      <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-600 p-2 text-white shadow-sm flex-shrink-0 mt-0.5">
            <Info className="h-4 w-4" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-slate-900">
                Catatan Penting Perbandingan Dimensi Fitur
              </h3>
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                Pemetaan tipe bodi masih draf
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-800 leading-relaxed">
              Skor antar skenario tidak sepenuhnya setara karena jumlah dimensi berbeda. Tipe mobil adalah variabel kategorikal yang diubah menjadi one-hot.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-[11px] text-slate-600">
              <div className="rounded-xl bg-white/80 p-2.5 border border-slate-200/80">
                <span className="font-bold text-blue-700 block mb-0.5">1. Skenario Produksi (4D)</span>
                <span>Standarisasi Z-score pada 4 fitur numerik kontinu: <code>[harga_rp, tahun, jarak_tempuh_ribu_km, total_fitur]</code>.</span>
              </div>
              <div className="rounded-xl bg-white/80 p-2.5 border border-slate-200/80">
                <span className="font-bold text-purple-700 block mb-0.5">2. Skenario A (7D)</span>
                <span>Numerik Z-score <code>[harga_rp, tahun]</code> digabung dengan 5 kolom biner One-Hot <code>[Hatchback, MPV, SUV, Sedan, Niaga]</code>.</span>
              </div>
              <div className="rounded-xl bg-white/80 p-2.5 border border-slate-200/80">
                <span className="font-bold text-teal-700 block mb-0.5">3. Skenario B (3D)</span>
                <span>Numerik Z-score <code>[harga_rp, jarak_tempuh_ribu_km, total_fitur]</code> tanpa pengaruh depresiasi tahun pembuatan.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metric Cards Quick Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {(['produksi', 'A', 'B'] as const).map((scKey) => {
          const scMeta = SCENARIO_META[scKey];
          const scData = data?.skenario[scKey];

          return (
            <div
              key={scKey}
              className={`rounded-2xl border ${scMeta.border} bg-white p-5 shadow-sm transition-all hover:shadow-md`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${scMeta.text}`}>
                    {scMeta.label}
                  </span>
                  <div className="font-display text-base font-bold text-slate-900 mt-0.5">
                    {scMeta.badge}
                  </div>
                </div>
                <div className={`rounded-xl px-2.5 py-1 text-[11px] font-bold ${scMeta.bg} ${scMeta.text}`}>
                  K = {selectedK}
                </div>
              </div>

              {loading ? (
                <div className="py-4 space-y-2">
                  <Skeleton height={20} width="60%" />
                  <Skeleton height={28} width="80%" />
                  <Skeleton height={14} width="50%" />
                </div>
              ) : scData ? (
                <div className="pt-4 space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Silhouette Score:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      <AnimatedNumber value={scData.silhouette} format={(n) => n.toFixed(4)} duration={0.5} />
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Davies-Bouldin Index:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      <AnimatedNumber value={scData.davies_bouldin} format={(n) => n.toFixed(3)} duration={0.5} />
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Calinski-Harabasz:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      <AnimatedNumber value={scData.calinski_harabasz} format={(n) => n.toFixed(1)} duration={0.5} />
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                    <span className="text-slate-500">Stabilitas ARI Rata-rata:</span>
                    <span className="font-mono font-semibold text-emerald-700">
                      {(scData.ari_rata * 100).toFixed(1)}% ({scData.ari_rata.toFixed(4)})
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* 1. Comparison Table (Silhouette, Davies-Bouldin, Calinski-Harabasz, test silhouette, stability ARI mean and min) */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" />
              Tabel Perbandingan Kuantitatif Skenario (K = {selectedK})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Evaluasi komparatif metrik separasi klaster dan pengujian stabilitas 30-run (80/20 train/test split)
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            N = 609 Kendaraan
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Metrik Evaluasi</th>
                <th className="py-3 px-4">Kriteria Ideal</th>
                <th className="py-3 px-4 bg-blue-50/50 text-blue-900 border-x border-blue-100">
                  Skenario Produksi <br />
                  <span className="font-normal text-[10px] text-blue-700">4 Fitur Numerik</span>
                </th>
                <th className="py-3 px-4 bg-purple-50/50 text-purple-900 border-r border-purple-100">
                  Skenario A <br />
                  <span className="font-normal text-[10px] text-purple-700">2 Numerik + One-Hot Tipe</span>
                </th>
                <th className="py-3 px-4 bg-teal-50/50 text-teal-900">
                  Skenario B <br />
                  <span className="font-normal text-[10px] text-teal-700">3 Fitur (Tanpa Tahun)</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {/* Silhouette Score */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3.5 px-4 font-semibold text-slate-900">
                  Silhouette Score
                  <span className="block text-[10px] font-normal text-slate-400">Koefisien siluet data penuh</span>
                </td>
                <td className="py-3.5 px-4 text-slate-500">Mendekati 1.0 (Lebih tinggi lebih baik)</td>
                <td className="py-3.5 px-4 font-mono font-bold text-blue-900 bg-blue-50/20 border-x border-blue-100">
                  {loading ? <Skeleton height={16} width={60} /> : prod?.silhouette.toFixed(4)}
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-purple-900 bg-purple-50/20 border-r border-purple-100">
                  {loading ? <Skeleton height={16} width={60} /> : a?.silhouette.toFixed(4)}
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-teal-900 bg-teal-50/20">
                  {loading ? <Skeleton height={16} width={60} /> : (
                    <div className="flex items-center gap-1.5">
                      <span>{b?.silhouette.toFixed(4)}</span>
                      {selectedK === 3 && (
                        <span className="rounded-full bg-teal-100 px-1.5 py-0.2 text-[9px] font-bold text-teal-800">
                          Puncak
                        </span>
                      )}
                    </div>
                  )}
                </td>
              </tr>

              {/* Davies-Bouldin Index */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3.5 px-4 font-semibold text-slate-900">
                  Davies-Bouldin Index
                  <span className="block text-[10px] font-normal text-slate-400">Tingkat separasi & kemiripan</span>
                </td>
                <td className="py-3.5 px-4 text-slate-500">Mendekati 0.0 (Lebih rendah lebih baik)</td>
                <td className="py-3.5 px-4 font-mono font-bold text-blue-900 bg-blue-50/20 border-x border-blue-100">
                  {loading ? <Skeleton height={16} width={60} /> : prod?.davies_bouldin.toFixed(3)}
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-purple-900 bg-purple-50/20 border-r border-purple-100">
                  {loading ? <Skeleton height={16} width={60} /> : a?.davies_bouldin.toFixed(3)}
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-teal-900 bg-teal-50/20">
                  {loading ? <Skeleton height={16} width={60} /> : (
                    <div className="flex items-center gap-1.5">
                      <span>{b?.davies_bouldin.toFixed(3)}</span>
                      {selectedK === 3 && (
                        <span className="rounded-full bg-teal-100 px-1.5 py-0.2 text-[9px] font-bold text-teal-800">
                          Terendah
                        </span>
                      )}
                    </div>
                  )}
                </td>
              </tr>

              {/* Calinski-Harabasz Score */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3.5 px-4 font-semibold text-slate-900">
                  Calinski-Harabasz Score
                  <span className="block text-[10px] font-normal text-slate-400">Variance Ratio Criterion</span>
                </td>
                <td className="py-3.5 px-4 text-slate-500">Lebih besar lebih baik</td>
                <td className="py-3.5 px-4 font-mono font-bold text-blue-900 bg-blue-50/20 border-x border-blue-100">
                  {loading ? <Skeleton height={16} width={60} /> : prod?.calinski_harabasz.toFixed(1)}
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-purple-900 bg-purple-50/20 border-r border-purple-100">
                  {loading ? <Skeleton height={16} width={60} /> : a?.calinski_harabasz.toFixed(1)}
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-teal-900 bg-teal-50/20">
                  {loading ? <Skeleton height={16} width={60} /> : (
                    <div className="flex items-center gap-1.5">
                      <span>{b?.calinski_harabasz.toFixed(1)}</span>
                      {selectedK === 3 && (
                        <span className="rounded-full bg-teal-100 px-1.5 py-0.2 text-[9px] font-bold text-teal-800">
                          Tertinggi
                        </span>
                      )}
                    </div>
                  )}
                </td>
              </tr>

              {/* Test Silhouette */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3.5 px-4 font-semibold text-slate-900">
                  Test Silhouette (Uji 80/20)
                  <span className="block text-[10px] font-normal text-slate-400">Rata-rata 30-run holdout test set</span>
                </td>
                <td className="py-3.5 px-4 text-slate-500">Konsisten dengan siluet latih</td>
                <td className="py-3.5 px-4 font-mono font-bold text-blue-900 bg-blue-50/20 border-x border-blue-100">
                  {loading ? <Skeleton height={16} width={60} /> : prod?.silhouette_uji.toFixed(4)}
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-purple-900 bg-purple-50/20 border-r border-purple-100">
                  {loading ? <Skeleton height={16} width={60} /> : a?.silhouette_uji.toFixed(4)}
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-teal-900 bg-teal-50/20">
                  {loading ? <Skeleton height={16} width={60} /> : b?.silhouette_uji.toFixed(4)}
                </td>
              </tr>

              {/* Stability ARI Mean */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3.5 px-4 font-semibold text-slate-900">
                  Stabilitas ARI Rata-rata
                  <span className="block text-[10px] font-normal text-slate-400">Mean Adjusted Rand Index (30 runs)</span>
                </td>
                <td className="py-3.5 px-4 text-slate-500">Mendekati 1.0 (Reproduktibilitas tinggi)</td>
                <td className="py-3.5 px-4 font-mono font-bold text-blue-900 bg-blue-50/20 border-x border-blue-100">
                  {loading ? <Skeleton height={16} width={60} /> : prod?.ari_rata.toFixed(4)}
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-purple-900 bg-purple-50/20 border-r border-purple-100">
                  {loading ? <Skeleton height={16} width={60} /> : a?.ari_rata.toFixed(4)}
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-teal-900 bg-teal-50/20">
                  {loading ? <Skeleton height={16} width={60} /> : b?.ari_rata.toFixed(4)}
                </td>
              </tr>

              {/* Stability ARI Min */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3.5 px-4 font-semibold text-slate-900">
                  Stabilitas ARI Minimum
                  <span className="block text-[10px] font-normal text-slate-400">Worst-case scenario dari 30 split</span>
                </td>
                <td className="py-3.5 px-4 text-slate-500">&gt; 0.70 batas aman stabilitas</td>
                <td className="py-3.5 px-4 font-mono font-bold text-blue-900 bg-blue-50/20 border-x border-blue-100">
                  {loading ? <Skeleton height={16} width={60} /> : prod?.ari_min.toFixed(4)}
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-purple-900 bg-purple-50/20 border-r border-purple-100">
                  {loading ? <Skeleton height={16} width={60} /> : a?.ari_min.toFixed(4)}
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-teal-900 bg-teal-50/20">
                  {loading ? <Skeleton height={16} width={60} /> : b?.ari_min.toFixed(4)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Three Bar Charts */}
      <div>
        <div className="mb-4">
          <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-600" />
            Visualisasi Grafik Komparasi Metrik (Tiga Bar Chart)
          </h2>
          <p className="text-xs text-slate-500">
            Perbandingan grafis langsung antara Skenario Produksi, Skenario A, dan Skenario B
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bar Chart 1: Silhouette Score */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-display text-sm font-bold text-slate-900">
                  1. Koefisien Silhouette
                </h3>
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  Higher is Better
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-4">
                Membandingkan Silhouette Data Latih vs Test Holdout (80/20)
              </p>
            </div>

            <div className="h-64 w-full">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <Skeleton height={200} width="90%" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={silhouetteChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="skenario" stroke="#94A3B8" fontSize={11} />
                    <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 0.45]} />
                    <Tooltip
                      content={({ payload }) => {
                        if (!payload || !payload.length) return null;
                        const item = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-md text-xs space-y-1">
                            <div className="font-bold text-slate-900">{item.fullSkenario}</div>
                            <div className="text-blue-600">Latih (Train): {item.silhouette.toFixed(4)}</div>
                            <div className="text-slate-500">Uji (Test): {item.silhouette_uji.toFixed(4)}</div>
                          </div>
                        );
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={32}
                      formatter={(val) => <span className="text-[10px] text-slate-600 font-semibold">{val === 'silhouette' ? 'Silhouette Latih' : 'Silhouette Uji'}</span>}
                    />
                    <Bar dataKey="silhouette" name="silhouette" fill="#2563EB" radius={[4, 4, 0, 0]} isAnimationActive={!shouldReduce} animationDuration={700}>
                      {silhouetteChartData.map((entry, idx) => (
                        <Cell key={`sil-cell-${idx}`} fill={entry.color} />
                      ))}
                    </Bar>
                    <Bar dataKey="silhouette_uji" name="silhouette_uji" fill="#94A3B8" radius={[4, 4, 0, 0]} isAnimationActive={!shouldReduce} animationDuration={700} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-100 mt-2">
              B = 0.3526 | Produksi = 0.3061 | A = 0.2865
            </div>
          </div>

          {/* Bar Chart 2: Davies-Bouldin Index */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-display text-sm font-bold text-slate-900">
                  2. Davies-Bouldin Index
                </h3>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Lower is Better
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-4">
                Derajat kemiripan antar-klaster (jarak intra vs inter klaster)
              </p>
            </div>

            <div className="h-64 w-full">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <Skeleton height={200} width="90%" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={daviesBouldinChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="skenario" stroke="#94A3B8" fontSize={11} />
                    <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 1.5]} />
                    <Tooltip
                      content={({ payload }) => {
                        if (!payload || !payload.length) return null;
                        const item = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-md text-xs">
                            <div className="font-bold text-slate-900">{item.skenario}</div>
                            <div className="text-emerald-700 font-semibold">Davies-Bouldin: {item.davies_bouldin.toFixed(3)}</div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="davies_bouldin" radius={[6, 6, 0, 0]} isAnimationActive={!shouldReduce} animationDuration={700}>
                      {daviesBouldinChartData.map((entry, idx) => (
                        <Cell key={`db-cell-${idx}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-100 mt-2">
              B = 1.014 (Optimal) | Produksi = 1.108 | A = 1.202
            </div>
          </div>

          {/* Bar Chart 3: Calinski-Harabasz Score */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-display text-sm font-bold text-slate-900">
                  3. Calinski-Harabasz Score
                </h3>
                <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                  Higher is Better
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-4">
                Rasio dispersi total (antara varians antar klaster vs dalam klaster)
              </p>
            </div>

            <div className="h-64 w-full">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <Skeleton height={200} width="90%" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={calinskiChartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="skenario" stroke="#94A3B8" fontSize={11} />
                    <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 400]} />
                    <Tooltip
                      content={({ payload }) => {
                        if (!payload || !payload.length) return null;
                        const item = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-md text-xs">
                            <div className="font-bold text-slate-900">{item.skenario}</div>
                            <div className="text-purple-700 font-semibold">Calinski-Harabasz: {item.calinski_harabasz.toFixed(1)}</div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="calinski_harabasz" radius={[6, 6, 0, 0]} isAnimationActive={!shouldReduce} animationDuration={700}>
                      {calinskiChartData.map((entry, idx) => (
                        <Cell key={`ch-cell-${idx}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-100 mt-2">
              B = 329.1 | Produksi = 284.0 | A = 257.6
            </div>
          </div>
        </div>
      </div>

      {/* 3. Pairwise ARI Matrix */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              Matriks Pasangan ARI (Pairwise Adjusted Rand Index)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Mengukur tingkat kesamaan partisi klaster antar skenario pada K = {selectedK}
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-800">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> Tinggi (&ge; 0.70)
            </span>
            <span className="flex items-center gap-1.5 text-indigo-800">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500"></span> Moderat (0.40 - 0.69)
            </span>
            <span className="flex items-center gap-1.5 text-amber-800">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span> Rendah (&lt; 0.40)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5">
          {/* Matrix Table */}
          <div className="lg:col-span-6 overflow-x-auto">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-xs font-bold text-slate-400 text-left">Skenario</th>
                  <th className="p-3 text-xs font-bold text-blue-700 bg-blue-50/50 rounded-t-lg">Produksi</th>
                  <th className="p-3 text-xs font-bold text-purple-700 bg-purple-50/50 rounded-t-lg">Skenario A</th>
                  <th className="p-3 text-xs font-bold text-teal-700 bg-teal-50/50 rounded-t-lg">Skenario B</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {(['produksi', 'A', 'B'] as const).map((rowKey) => {
                  const rowLabel = rowKey === 'produksi' ? 'Produksi' : `Skenario ${rowKey}`;
                  return (
                    <tr key={rowKey} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 text-left font-bold text-slate-800 bg-slate-50/50">
                        {rowLabel}
                      </td>
                      {(['produksi', 'A', 'B'] as const).map((colKey) => {
                        const val = data?.matrix?.[rowKey]?.[colKey] ?? (rowKey === colKey ? 1.0 : 0);
                        const cellColor = getHeatmapColor(val);
                        return (
                          <td key={`${rowKey}-${colKey}`} className="p-2">
                            <div className={`py-3 px-2 rounded-xl font-mono text-sm transition-all ${cellColor}`}>
                              {loading ? (
                                <Skeleton height={18} width={45} className="mx-auto" />
                              ) : (
                                val.toFixed(3)
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Matrix Analytical Insights */}
          <div className="lg:col-span-6 space-y-3 flex flex-col justify-center text-xs">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
              <div className="flex items-center justify-between font-bold text-emerald-900">
                <span>Produksi &harr; Skenario B</span>
                <span className="font-mono bg-emerald-200/80 px-2 py-0.5 rounded text-emerald-950">
                  ARI: {data?.matrix?.produksi?.B?.toFixed(3) ?? '0.760'}
                </span>
              </div>
              <p className="mt-1 text-emerald-800 text-[11px] leading-relaxed">
                <strong>Tingkat Kesamaan Tinggi:</strong> Tanpa variabel <code>tahun</code>, pengelompokan unit tetap mempertahankan 76% struktur klaster aslinya. Jarak tempuh dan harga mendominasi penentuan segmen.
              </p>
            </div>

            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3.5">
              <div className="flex items-center justify-between font-bold text-indigo-900">
                <span>Produksi &harr; Skenario A</span>
                <span className="font-mono bg-indigo-200/80 px-2 py-0.5 rounded text-indigo-950">
                  ARI: {data?.matrix?.produksi?.A?.toFixed(3) ?? '0.462'}
                </span>
              </div>
              <p className="mt-1 text-indigo-800 text-[11px] leading-relaxed">
                <strong>Tingkat Kesamaan Moderat:</strong> Penambahan variabel <code>tipe_bodi</code> (one-hot) secara signifikan mereorganisasi klaster. Mobil berharga serupa namun tipe bodi berbeda (misal SUV vs Hatchback) terpisah ke klaster lain.
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
              <div className="flex items-center justify-between font-bold text-amber-900">
                <span>Skenario A &harr; Skenario B</span>
                <span className="font-mono bg-amber-200/80 px-2 py-0.5 rounded text-amber-950">
                  ARI: {data?.matrix?.A?.B?.toFixed(3) ?? '0.318'}
                </span>
              </div>
              <p className="mt-1 text-amber-800 text-[11px] leading-relaxed">
                <strong>Tingkat Kesamaan Rendah:</strong> Kedua model menggunakan ruang fitur yang sangat berlainan sehingga pola partisi klaster yang dihasilkan hampir independen satu sama lain.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. One Profile Table Per Scenario */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Tabel Profil Karakteristik Klaster Tiap Skenario
            </h2>
            <p className="text-xs text-slate-500">
              Statistik per klaster (median harga, median tahun, median km, rata-rata fitur, top 2 tipe bodi)
            </p>
          </div>

          {/* View Filter Pill */}
          <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs">
            {[
              { id: 'semua', label: 'Tampilkan Semua (3 Skenario)' },
              { id: 'produksi', label: 'Produksi' },
              { id: 'A', label: 'Skenario A' },
              { id: 'B', label: 'Skenario B' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setProfileViewTab(tab.id as typeof profileViewTab)}
                className={`px-3 py-1 font-bold rounded-lg transition-colors ${
                  profileViewTab === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {(['produksi', 'A', 'B'] as const).map((scKey) => {
            if (profileViewTab !== 'semua' && profileViewTab !== scKey) {
              return null;
            }

            const scMeta = SCENARIO_META[scKey];
            const scData = data?.skenario[scKey];

            return (
              <div
                key={`profile-card-${scKey}`}
                className={`rounded-2xl border ${scMeta.border} bg-white overflow-hidden shadow-sm`}
              >
                <div className={`p-4 ${scMeta.bg} border-b ${scMeta.border} flex flex-col sm:flex-row sm:items-center justify-between gap-2`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-display text-sm font-bold ${scMeta.text}`}>
                        {scMeta.label}
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200 shadow-xs">
                        {scMeta.badge}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5 font-mono">
                      Fitur: {scMeta.features}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Silhouette:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {scData?.silhouette.toFixed(4) ?? '-'}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500">Davies-Bouldin:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {scData?.davies_bouldin.toFixed(3) ?? '-'}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-4">Klaster</th>
                        <th className="py-2.5 px-4">Jumlah Mobil</th>
                        <th className="py-2.5 px-4">Median Harga</th>
                        <th className="py-2.5 px-4">Median Tahun</th>
                        <th className="py-2.5 px-4">Median Jarak Tempuh</th>
                        <th className="py-2.5 px-4">Rata-rata Total Fitur</th>
                        <th className="py-2.5 px-4">Top 2 Tipe Bodi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {loading ? (
                        Array.from({ length: selectedK }).map((_, i) => (
                          <tr key={i}>
                            <td className="py-3 px-4"><Skeleton height={14} width={50} /></td>
                            <td className="py-3 px-4"><Skeleton height={14} width={70} /></td>
                            <td className="py-3 px-4"><Skeleton height={14} width={90} /></td>
                            <td className="py-3 px-4"><Skeleton height={14} width={50} /></td>
                            <td className="py-3 px-4"><Skeleton height={14} width={60} /></td>
                            <td className="py-3 px-4"><Skeleton height={14} width={50} /></td>
                            <td className="py-3 px-4"><Skeleton height={14} width={100} /></td>
                          </tr>
                        ))
                      ) : scData?.profile && scData.profile.length > 0 ? (
                        scData.profile.map((p) => {
                          const pct = ((p.count / 609) * 100).toFixed(1);
                          return (
                            <tr key={`p-${scKey}-${p.klaster}`} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-4 font-bold text-slate-900">
                                <span className="inline-flex items-center justify-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-mono font-bold text-slate-700">
                                  Klaster {p.klaster}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-bold text-slate-900">{p.count} unit</span>
                                <span className="text-[10px] text-slate-400 block">({pct}%)</span>
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-900">
                                {formatRupiah(p.median_price)}
                              </td>
                              <td className="py-3 px-4 font-mono">
                                {p.median_year}
                              </td>
                              <td className="py-3 px-4 font-mono">
                                {p.median_mileage.toFixed(1)} rb km
                              </td>
                              <td className="py-3 px-4 font-mono">
                                {p.mean_total_fitur.toFixed(2)} fitur
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {p.top_2_tipe_bodi && p.top_2_tipe_bodi.length > 0 ? (
                                    p.top_2_tipe_bodi.map((t, idx) => (
                                      <span
                                        key={idx}
                                        className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                                      >
                                        {t}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-slate-400 italic">Tidak ada data</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                            Data profil klaster belum tersedia.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
