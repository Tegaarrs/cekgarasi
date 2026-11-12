import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  Tooltip, CartesianGrid, ReferenceLine, ScatterChart, Scatter 
} from 'recharts';
import { 
  Layers, GitBranch, Database, ShieldCheck, 
  ArrowRight, Info, BarChart3, Binary, AlertCircle
} from 'lucide-react';
import { apiFetch } from '@/services/api';

interface KurvaK {
  k: number;
  inertia: number;
  silhouette: number;
}

interface CentroidItem {
  klaster: number;
  z: {
    tahun: number;
    jarak_tempuh_ribu_km: number;
    harga_rp: number;
    total_fitur: number;
  };
  asli: {
    tahun: number;
    jarak_tempuh_ribu_km: number;
    harga_rp: number;
    total_fitur: number;
  };
}

interface ProfilItem {
  klaster: number;
  nama_pendek: string;
  nama_lengkap: string;
  warna_hex: string;
  jumlah: number;
  persen: number;
  rata_harga: number;
  median_harga: number;
  rata_tahun: number;
  median_tahun: number;
  rata_km: number;
  median_km: number;
  rata_fitur: number;
  alasan_nama: string;
}

interface PcaPoint {
  id: number;
  x: number;
  y: number;
  klaster: number;
}

interface MetodologiData {
  dibuat_pada: string;
  jumlah_data: number;
  id_dikeluarkan_km_tidak_wajar: number[];
  batas_km_wajar_ribu: number;
  fitur: string[];
  scaler: {
    jenis: string;
    mean: Record<string, number>;
    std: Record<string, number>;
  };
  kurva_k: KurvaK[];
  k_produksi: number;
  produksi: {
    inertia: number;
    silhouette: number;
    davies_bouldin: number;
    label_beda_dengan_db: number;
  };
  centroid: CentroidItem[];
  pca: {
    varian_dijelaskan: number[];
    komponen: {
      PC1: Record<string, number>;
      PC2: Record<string, number>;
    };
    titik: PcaPoint[];
    centroid: { klaster: number; x: number; y: number }[];
  };
  profil: ProfilItem[];
}

export function MetodologiPage() {
  const [data, setData] = useState<MetodologiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch<MetodologiData>('/bi/metodologi')
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => {
        console.error('Gagal memuat data metodologi:', err);
        setError('Gagal memuat evaluasi K-Means. Pastikan service backend aktif.');
      })
      .finally(() => setLoading(false));
  }, []);

  const clusterColors = ['#1D4ED8', '#059669', '#7C3AED'];

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Error Notification */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-center gap-3 text-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State Skeleton */}
        {loading && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center py-16 animate-pulse">
            <Binary className="w-10 h-10 text-blue-600 mx-auto mb-3 animate-spin" />
            <h3 className="font-bold text-slate-800 text-sm">Menyiapkan Visualisasi Evaluasi K-Means...</h3>
            <p className="text-xs text-slate-400 mt-1">Mengambil koordinat PCA, inersia, dan centroid</p>
          </div>
        )}
        
        {/* Page Header */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold inline-flex items-center gap-1.5">
              <Binary className="w-3.5 h-3.5" />
              <span>Capstone Project Machine Learning</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
              Evaluasi Ilmiah & Bisnis
            </span>
          </div>

          <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Metodologi & Evaluasi Algoritma K-Means
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-4xl leading-relaxed">
            Halaman ini mendokumentasikan implementasi dan evaluasi empiris algoritma <strong>K-Means Clustering</strong> pada platform Business Intelligence CekGarasi untuk segmentasi pasar pembelian mobil bekas. Seluruh metrik dihitung langsung dari dataset 610 unit mobil bekas nyata.
          </p>

          {/* Quick Metrics Bar */}
          <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center sm:text-left">
            <div>
              <span className="text-xs text-slate-400 font-medium block">Dataset Training</span>
              <span className="text-lg font-extrabold text-slate-900">
                {data?.jumlah_data || 609} Unit
              </span>
              <span className="text-[11px] text-slate-500 block">Outlier disaring</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">Jumlah Klaster</span>
              <span className="text-lg font-extrabold text-blue-600">K = 3</span>
              <span className="text-[11px] text-slate-500 block">Optimal via Elbow & Silhouette</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">Silhouette Score</span>
              <span className="text-lg font-extrabold text-emerald-600">
                {data?.produksi?.silhouette ? data.produksi.silhouette.toFixed(4) : '0.2969'}
              </span>
              <span className="text-[11px] text-slate-500 block">Koefisien validasi klaster</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">Davies-Bouldin Index</span>
              <span className="text-lg font-extrabold text-violet-600">
                {data?.produksi?.davies_bouldin ? data.produksi.davies_bouldin.toFixed(4) : '1.1027'}
              </span>
              <span className="text-[11px] text-slate-500 block">Rasio separasi klaster</span>
            </div>
          </div>
        </div>

        {/* Section 1: Preprocessing & 4 Fitur Utama */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.45 }}
          className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-5 h-5 text-blue-600" />
            <h2 className="font-display text-xl font-bold text-slate-900">
              1. Fitur Clustering & Pra-pemrosesan Data
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
            Clustering dilakukan pada 4 variabel kontinu yang mewakili dimensi finansial, usia pakai, intensitas pemakaian, dan kelengkapan utilitas kendaraan.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-xs font-bold text-blue-700 block mb-1">tahun</span>
              <h3 className="font-bold text-sm text-slate-900 mb-1">Tahun Pembuatan</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Menentukan depresiasi usia pakai dan generasi teknologi kendaraan.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-xs font-bold text-emerald-700 block mb-1">jarak_tempuh_ribu_km</span>
              <h3 className="font-bold text-sm text-slate-900 mb-1">Odometer (Ribu KM)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tingkat keausan mekanikal mobil selama pemakaian riil.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-xs font-bold text-violet-700 block mb-1">harga_rp</span>
              <h3 className="font-bold text-sm text-slate-900 mb-1">Harga Listing (Rp)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Nilai penawaran pasar yang mencerminkan kelas dan likuiditas unit.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-xs font-bold text-amber-700 block mb-1">total_fitur</span>
              <h3 className="font-bold text-sm text-slate-900 mb-1">Kelengkapan 11 Fitur</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Skor 0-11 dari fitur premium (kamera 360, cruise control, keyless start, dll).
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-2xl bg-blue-50/60 border border-blue-200/70 text-xs text-blue-900 flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Pembersihan Outlier & Standarisasi:</strong> Sebelum clustering, seluruh variabel distandarkan menggunakan <em>StandardScaler (z-score)</em> agar fitur dengan rentang besar (harga dalam ratusan juta) tidak mendominasi jarak Euclidean. Unit dengan ID 610 memiliki nilai odometer typo 61.300.000 km dan telah disaring secara objektif.
            </div>
          </div>
        </motion.section>

        {/* Section 2: Kurva Evaluasi Elbow & Silhouette */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.45 }}
          className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h2 className="font-display text-xl font-bold text-slate-900">
              2. Penentuan Nilai Optimal K (Elbow Method & Silhouette)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
            Pengujian dilakukan pada K = 2 hingga K = 10 untuk menemukan titik kompromi terbaik antara inersia klaster (within-cluster sum of squares) dan pemisahan antar klaster (silhouette score).
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Chart 1: Elbow Method */}
            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/40">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Metode Elbow (Inersia vs K)</h3>
                  <p className="text-xs text-slate-500">Penurunan tajam terjadi pada K=3</p>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-bold">
                  Siku di K=3
                </span>
              </div>

              <div className="h-64 w-full">
                {data && data.kurva_k ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.kurva_k} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="k" label={{ value: 'Jumlah Klaster (K)', position: 'insideBottom', offset: -5, fontSize: 11 }} />
                      <YAxis tickFormatter={(val) => `${val}`} fontSize={11} />
                      <Tooltip formatter={(value: any) => [Number(value).toFixed(2), 'Inersia']} />
                      <ReferenceLine x={3} stroke="#1D4ED8" strokeDasharray="4 4" label={{ value: 'K=3', fill: '#1D4ED8', fontSize: 11 }} />
                      <Line type="monotone" dataKey="inertia" stroke="#1D4ED8" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-slate-400">Memuat kurva...</div>
                )}
              </div>
            </div>

            {/* Chart 2: Silhouette Coefficient */}
            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/40">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Silhouette Coefficient (K=2 s/d 10)</h3>
                  <p className="text-xs text-slate-500">Nilai koefisien siluet per jumlah klaster</p>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-700 text-xs font-bold">
                  Skor K=3: 0.297
                </span>
              </div>

              <div className="h-64 w-full">
                {data && data.kurva_k ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.kurva_k} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="k" label={{ value: 'Jumlah Klaster (K)', position: 'insideBottom', offset: -5, fontSize: 11 }} />
                      <YAxis domain={[0, 0.4]} fontSize={11} />
                      <Tooltip formatter={(value: any) => [Number(value).toFixed(4), 'Silhouette']} />
                      <Bar 
                        dataKey="silhouette" 
                        fill="#059669" 
                        radius={[4, 4, 0, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-slate-400">Memuat kurva...</div>
                )}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Section 3: Visualisasi Reduksi Dimensi PCA (2D) */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.45 }}
          className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <GitBranch className="w-5 h-5 text-blue-600" />
            <h2 className="font-display text-xl font-bold text-slate-900">
              3. Visualisasi Pemisahan Klaster dengan PCA (2 Dimensi)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
            Untuk memverifikasi separasi klaster dalam ruang berdimensi 4, dilakukan Principal Component Analysis (PCA). Dua komponen utama pertama menjelaskan <strong>{data ? Math.round(((data.pca.varian_dijelaskan[0] + data.pca.varian_dijelaskan[1]) * 100)) : 78}%</strong> total variansi data.
          </p>

          <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/40">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-blue-700">
                  <span className="w-3 h-3 rounded-full bg-[#1D4ED8]" />
                  <span>Segmen 0: Premium (260 unit)</span>
                </span>
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <span className="w-3 h-3 rounded-full bg-[#059669]" />
                  <span>Segmen 1: Keluarga Muda (195 unit)</span>
                </span>
                <span className="flex items-center gap-1.5 text-purple-700">
                  <span className="w-3 h-3 rounded-full bg-[#7C3AED]" />
                  <span>Segmen 2: Ekonomis (154 unit)</span>
                </span>
              </div>
              <span className="text-xs text-slate-500">609 Titik Data Riil</span>
            </div>

            <div className="h-80 w-full">
              {data && data.pca && data.pca.titik ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis type="number" dataKey="x" name="Principal Component 1" label={{ value: 'PC1 (45.5% Variansi)', position: 'insideBottom', offset: -10, fontSize: 11 }} />
                    <YAxis type="number" dataKey="y" name="Principal Component 2" label={{ value: 'PC2 (32.1% Variansi)', angle: -90, position: 'insideLeft', offset: 0, fontSize: 11 }} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter 
                      name="Premium" 
                      data={data.pca.titik.filter(t => t.klaster === 0)} 
                      fill="#1D4ED8" 
                      opacity={0.65} 
                    />
                    <Scatter 
                      name="Keluarga Muda" 
                      data={data.pca.titik.filter(t => t.klaster === 1)} 
                      fill="#059669" 
                      opacity={0.65} 
                    />
                    <Scatter 
                      name="Ekonomis" 
                      data={data.pca.titik.filter(t => t.klaster === 2)} 
                      fill="#7C3AED" 
                      opacity={0.65} 
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-slate-400">Memuat grafik PCA...</div>
              )}
            </div>
          </div>
        </motion.section>

        {/* Section 4: Tabel Centroid Karakteristik Klaster */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.45 }}
          className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <h2 className="font-display text-xl font-bold text-slate-900">
              4. Karakteristik Centroid 3 Segmen Pasar
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
            Centroid merupakan titik koordinat rata-rata yang menjadi identitas dasar tiap segmen pasar pada data asli (sebelum standarisasi).
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="py-3 px-4 font-bold text-slate-900">Segmen Pasar</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Pangsa Pasar</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Rata-rata Harga</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Median Harga</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Tahun Rata-rata</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Odometer Rata-rata</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Rata-rata Fitur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.profil || []).map((prof) => (
                  <tr key={prof.klaster} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: clusterColors[prof.klaster] }}
                      />
                      <span>{prof.nama_lengkap}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {prof.jumlah} unit ({prof.persen}%)
                    </td>
                    <td className="py-3 px-4">
                      Rp {Math.round(prof.rata_harga).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 font-bold text-blue-700">
                      Rp {Math.round(prof.median_harga).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4">
                      {prof.rata_tahun.toFixed(1)} (median {prof.median_tahun})
                    </td>
                    <td className="py-3 px-4">
                      {prof.rata_km.toFixed(1)} rb km
                    </td>
                    <td className="py-3 px-4">
                      {prof.rata_fitur.toFixed(2)} dari 11
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* Section 5: Implementasi Business Intelligence */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.45 }}
          className="bg-gradient-to-br from-[#0B192C] to-[#0F2038] rounded-3xl p-8 text-white shadow-xl"
        >
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <h2 className="font-display text-xl font-bold text-white">
              Pemanfaatan Hasil K-Means pada Platform CekGarasi
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
            Hasil pengelompokan K-Means tidak berhenti pada evaluasi teoritis, melainkan menjadi pondasi fitur Business Intelligence di seluruh aplikasi:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/60">
              <span className="text-xs font-bold text-blue-400 block mb-1">Katalog & Filter</span>
              <h3 className="font-bold text-sm text-white mb-2">Pencarian Berbasis Segmen</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Pembeli dapat langsung menyaring 610 mobil berdasarkan segmen pasar objektif (Premium, Keluarga Muda, Ekonomis) tanpa bias merek.
              </p>
            </div>

            <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/60">
              <span className="text-xs font-bold text-emerald-400 block mb-1">Detail Mobil</span>
              <h3 className="font-bold text-sm text-white mb-2">Indeks Posisi Harga & Kedekatan</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Menghitung deviasi harga listing terhadap median segmen (Murah / Wajar / Mahal) dan menghitung jarak Euclidean unit ke pusat klaster.
              </p>
            </div>

            <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/60">
              <span className="text-xs font-bold text-violet-400 block mb-1">Portal Dealer</span>
              <h3 className="font-bold text-sm text-white mb-2">Dashboard Business Intelligence</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Dealer dan pengambil keputusan dapat memantau komposisi stok, anomali harga listing, dan pangsa pasar tiap segmen secara real-time.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs text-slate-400">
              Ingin melihat implementasi visual pada unit mobil langsung?
            </span>
            <div className="flex items-center gap-3">
              <Link
                to="/cari"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-md"
              >
                <span>Buka Katalog Mobil</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/bandingkan"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all"
              >
                Bandingkan Segmen
              </Link>
            </div>
          </div>
        </motion.section>

      </div>
    </div>
  );
}
