import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Car, TrendingUp, Sparkles, AlertTriangle, 
  ArrowRight, Calendar, Download, 
  FileSpreadsheet, ArrowUpRight, ArrowDownRight,
  Zap, Network
} from 'lucide-react';
import { apiFetch } from '@/services/api';

interface AdminSummary {
  kpi: {
    total_mobil: number;
    total_tayang?: number;
    total_draft?: number;
    total_merek: number;
    median_harga?: number;
    median_harga_keseluruhan?: number;
    total_test_drive?: number;
    leads_menunggu?: number;
    silhouette_score: number;
    davies_bouldin_index: number;
  };
  segmen: {
    klaster: number;
    nama_lengkap: string;
    nama_pendek: string;
    warna_hex: string;
    count: number;
    share: number;
    median_harga: number;
    median_tahun: number;
  }[];
  scatter: {
    id: number;
    nama_mobil: string;
    pca1: number;
    pca2: number;
    klaster: number;
    warna_hex: string;
  }[];
  anomali_harga?: {
    id: number;
    nama_mobil: string;
    tahun: number;
    harga_rp: number;
    klaster: number;
    q1_segmen: number;
    q3_segmen: number;
    tipe_anomali: string;
  }[];
  total_anomali?: number;
}

export function AdminDashboardPage() {
  const [data, setData] = useState<AdminSummary | null>(null);

  // Scatter plot mode: 'tahun' (Tahun vs Harga) or 'km' (KM vs Harga)
  const [scatterMode, setScatterMode] = useState<'tahun' | 'km'>('tahun');

  // Action list filter: 'all' | 'above' | 'below'
  const [anomalyFilter, setAnomalyFilter] = useState<'all' | 'above' | 'below'>('all');
  const [anomalySearch, setAnomalySearch] = useState('');

  useEffect(() => {
    apiFetch<AdminSummary>('/admin/ringkasan')
      .then((res) => setData(res))
      .catch(() => {});
  }, []);

  const kpi = data?.kpi || {
    total_mobil: 609,
    total_merek: 13,
    median_harga: 177000000,
    median_harga_keseluruhan: 177000000,
    silhouette_score: 0.3061,
    davies_bouldin_index: 0.762,
    total_test_drive: 12,
  };

  const totalMobil = kpi.total_mobil ?? 609;
  const medianHarga = kpi.median_harga ?? kpi.median_harga_keseluruhan ?? 177000000;
  const silhouetteScore = kpi.silhouette_score ?? 0.3061;
  const totalTestDrive = kpi.total_test_drive ?? 12;

  // Static fallback anomaly items if API list is empty, fully matching mockup A2
  const rawAnomalies = data?.anomali_harga && data.anomali_harga.length > 0
    ? data.anomali_harga.map((a) => ({
        id: a.id,
        nama: a.nama_mobil,
        sub: `Tahun ${a.tahun} • Klaster ${a.klaster}`,
        klaster: a.klaster,
        klasterNama: a.klaster === 0 ? 'Premium' : a.klaster === 1 ? 'Keluarga Muda' : 'Ekonomis',
        warnaHex: a.klaster === 0 ? '#2557D6' : a.klaster === 1 ? '#0CA678' : '#AE3EC9',
        harga: a.harga_rp,
        rentang: `Rp ${Math.round(a.q1_segmen / 1000000)} – ${Math.round(a.q3_segmen / 1000000)} Jt`,
        status: a.tipe_anomali === 'Di Atas Q3' ? 'Di atas rentang' : 'Di bawah rentang',
        selisih: a.tipe_anomali === 'Di Atas Q3' 
          ? `+Rp ${Math.round((a.harga_rp - a.q3_segmen) / 1000000)} Jt`
          : `-Rp ${Math.round((a.q1_segmen - a.harga_rp) / 1000000)} Jt`,
        isAbove: a.tipe_anomali === 'Di Atas Q3',
      }))
    : [
        {
          id: 1,
          nama: 'Toyota Fortuner 2.4 VRZ',
          sub: 'Tahun 2018 • B 1849 POF • 52.300 km',
          klaster: 0,
          klasterNama: 'Premium',
          warnaHex: '#2557D6',
          harga: 315000000,
          rentang: 'Rp 197 – 255 Jt',
          status: 'Di atas rentang',
          selisih: '+Rp 60 Jt',
          isAbove: true,
        },
        {
          id: 2,
          nama: 'Honda Brio Satya S',
          sub: 'Tahun 2016 • B 2901 UYZ • 98.200 km',
          klaster: 2,
          klasterNama: 'Ekonomis',
          warnaHex: '#AE3EC9',
          harga: 88000000,
          rentang: 'Rp 115 – 152 Jt',
          status: 'Di bawah rentang',
          selisih: '-Rp 27 Jt',
          isAbove: false,
        },
        {
          id: 3,
          nama: 'Mitsubishi Pajero Sport Dakar',
          sub: 'Tahun 2019 • B 1092 VCD • 48.000 km',
          klaster: 0,
          klasterNama: 'Premium',
          warnaHex: '#2557D6',
          harga: 335000000,
          rentang: 'Rp 197 – 255 Jt',
          status: 'Di atas rentang',
          selisih: '+Rp 80 Jt',
          isAbove: true,
        },
        {
          id: 4,
          nama: 'Toyota Avanza 1.3 E M/T',
          sub: 'Tahun 2017 • B 1324 GHI • 45.100 km',
          klaster: 1,
          klasterNama: 'Keluarga Muda',
          warnaHex: '#0CA678',
          harga: 112000000,
          rentang: 'Rp 128 – 165 Jt',
          status: 'Di bawah rentang',
          selisih: '-Rp 16 Jt',
          isAbove: false,
        },
        {
          id: 5,
          nama: 'Mazda CX-5 2.5 Elite',
          sub: 'Tahun 2019 • B 2811 QRS • 61.200 km',
          klaster: 0,
          klasterNama: 'Premium',
          warnaHex: '#2557D6',
          harga: 285000000,
          rentang: 'Rp 197 – 255 Jt',
          status: 'Di atas rentang',
          selisih: '+Rp 30 Jt',
          isAbove: true,
        },
        {
          id: 6,
          nama: 'Daihatsu Ayla 1.0 D',
          sub: 'Tahun 2015 • B 1993 LMN • 108.000 km',
          klaster: 2,
          klasterNama: 'Ekonomis',
          warnaHex: '#AE3EC9',
          harga: 79000000,
          rentang: 'Rp 115 – 152 Jt',
          status: 'Di bawah rentang',
          selisih: '-Rp 36 Jt',
          isAbove: false,
        },
      ];

  const filteredAnomalies = rawAnomalies.filter((item) => {
    if (anomalyFilter === 'above' && !item.isAbove) return false;
    if (anomalyFilter === 'below' && item.isAbove) return false;
    if (anomalySearch && !item.nama.toLowerCase().includes(anomalySearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-10 max-w-[1360px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 text-slate-800">
      
      {/* ============================================================ */}
      {/* 1. OVERVIEW & KPI SECTION                                   */}
      {/* ============================================================ */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#A83900]">
                Ringkasan Eksekutif
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#FE6A2B]" />
              <span className="text-[11px] text-slate-500 font-semibold">Portal A2</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#001540] tracking-tight">
              Ringkasan Eksekutif &amp; KPI Inventaris
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-4xl">
              Evaluasi kesehatan portofolio stok 609 unit, performa klasterisasi algoritma K-Means, dan konversi minat test drive minggu ini.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button 
              type="button"
              className="flex items-center gap-2 px-3.5 py-2 bg-white shadow-xs border border-slate-200 rounded-lg text-[#001540] hover:bg-slate-50 transition-all text-xs font-semibold"
            >
              <Calendar className="h-4 w-4 text-slate-500" />
              <span>7 Hari Terakhir</span>
            </button>
            <button 
              type="button"
              className="flex items-center gap-2 px-3.5 py-2 bg-[#FE6A2B] text-white rounded-lg shadow-sm hover:bg-[#A83900] transition-all text-xs font-bold"
            >
              <Download className="h-4 w-4" />
              <span>Unduh Laporan</span>
            </button>
          </div>
        </div>

        {/* Five KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* KPI 1: Total Stok */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-bl-full pointer-events-none group-hover:scale-105 transition-transform" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-semibold">Total Stok</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#001540] flex items-center justify-center">
                  <Car className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#001540] tracking-tight">{totalMobil} Unit</div>
            </div>
            <div className="mt-4 pt-3 flex flex-col gap-1 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">100% lolos inspeksi menyeluruh</span>
                <span className="px-2 py-0.5 rounded-full bg-orange-100 text-[#380D00] text-[10px] font-bold">+18 bln ini</span>
              </div>
            </div>
          </div>

          {/* KPI 2: Median Harga */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-bl-full pointer-events-none group-hover:scale-105 transition-transform" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-semibold">Median Harga</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#001540] flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#001540] tracking-tight">
                Rp {Math.round(medianHarga / 1000000)} Jt
              </div>
            </div>
            <div className="mt-4 pt-3 flex flex-col gap-1 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 truncate" title="Rentang IQR: Rp 135 Jt - Rp 215 Jt">IQR: Rp 135 - 215 Jt</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[10px] font-bold">+2.4% MoM</span>
              </div>
            </div>
          </div>

          {/* KPI 3: Segmen Terbentuk */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-bl-full pointer-events-none group-hover:scale-105 transition-transform" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-semibold">Segmen Terbentuk</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Network className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#001540] tracking-tight">3 Klaster</div>
            </div>
            <div className="mt-4 pt-3 flex flex-col gap-1 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">K-Means optimal k=3</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 text-[10px] font-bold">Elbow Valid</span>
              </div>
            </div>
          </div>

          {/* KPI 4: Silhouette Score */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/60 rounded-bl-full pointer-events-none group-hover:scale-105 transition-transform" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-semibold">Silhouette Score</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#001540] tracking-tight">
                {silhouetteScore.toFixed(3).replace('.', ',')}
              </div>
            </div>
            <div className="mt-4 pt-3 flex flex-col gap-1 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Pemisahan kohesif</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Good Separation</span>
              </div>
            </div>
          </div>

          {/* KPI 5: Test Drive Minggu Ini */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50/60 rounded-bl-full pointer-events-none group-hover:scale-105 transition-transform" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-semibold">Test Drive Minggu Ini</span>
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#FE6A2B] flex items-center justify-center">
                  <Zap className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#A83900] tracking-tight">{totalTestDrive} Jadwal</div>
            </div>
            <div className="mt-4 pt-3 flex flex-col gap-1 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Dari portal pembeli (B6)</span>
                <span className="px-2 py-0.5 rounded-full bg-[#FE6A2B] text-white text-[10px] font-bold">5 Perlu Respon</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. SEGMENT INSIGHT & SCATTER PLOT SECTION                   */}
      {/* ============================================================ */}
      <section className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold text-[#001540] tracking-tight">
            Peta Segmen Pasar &amp; Wawasan Otomatis
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Analisis distribusi sebaran harga vs tahun produksi serta identifikasi anomali posisi unit terhadap klaster referensi.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: Scatter Plot (8 cols) */}
          <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-base font-bold text-[#001540]">Peta Segmen Pasar (Scatter Plot)</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-[#001540] text-[11px] font-bold border border-blue-200/60">
                  <Sparkles className="h-3 w-3 text-[#FE6A2B]" />
                  Algoritma K-Means (k=3)
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setScatterMode('tahun')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                    scatterMode === 'tahun'
                      ? 'bg-white shadow-xs text-[#001540]'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Tahun vs Harga
                </button>
                <button
                  type="button"
                  onClick={() => setScatterMode('km')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                    scatterMode === 'km'
                      ? 'bg-white shadow-xs text-[#001540]'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  KM vs Harga
                </button>
              </div>
            </div>

            {/* Interactive SVG Scatter Plot */}
            <div className="relative w-full bg-[#F9F9FF] rounded-xl p-4 overflow-x-auto border border-slate-100">
              <svg className="w-full min-w-[560px] h-[340px]" fill="none" viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg">
                {/* Grid Background Lines */}
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="50" x2="650" y1="30" y2="30" />
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="50" x2="650" y1="90" y2="90" />
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="50" x2="650" y1="150" y2="150" />
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="50" x2="650" y1="210" y2="210" />
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="50" x2="650" y1="270" y2="270" />
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="110" x2="110" y1="20" y2="280" />
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="230" x2="230" y1="20" y2="280" />
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="350" x2="350" y1="20" y2="280" />
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="470" x2="470" y1="20" y2="280" />
                <line stroke="#E2E8F0" strokeDasharray="3 3" x1="590" x2="590" y1="20" y2="280" />

                {/* Axes Labels */}
                <text className="text-[10px] fill-slate-400 font-mono" textAnchor="end" x="42" y="34">320 Jt</text>
                <text className="text-[10px] fill-slate-400 font-mono" textAnchor="end" x="42" y="94">260 Jt</text>
                <text className="text-[10px] fill-slate-400 font-mono" textAnchor="end" x="42" y="154">200 Jt</text>
                <text className="text-[10px] fill-slate-400 font-mono" textAnchor="end" x="42" y="214">140 Jt</text>
                <text className="text-[10px] fill-slate-400 font-mono" textAnchor="end" x="42" y="274">80 Jt</text>

                {scatterMode === 'tahun' ? (
                  <>
                    <text className="text-[10px] fill-slate-400 font-mono" textAnchor="middle" x="110" y="298">2014</text>
                    <text className="text-[10px] fill-slate-400 font-mono" textAnchor="middle" x="230" y="298">2016</text>
                    <text className="text-[10px] fill-slate-400 font-mono" textAnchor="middle" x="350" y="298">2018</text>
                    <text className="text-[10px] fill-slate-400 font-mono" textAnchor="middle" x="470" y="298">2020</text>
                    <text className="text-[10px] fill-slate-400 font-mono" textAnchor="middle" x="590" y="298">2022</text>
                  </>
                ) : (
                  <>
                    <text className="text-[10px] fill-slate-400 font-mono" textAnchor="middle" x="110" y="298">110k km</text>
                    <text className="text-[10px] fill-slate-400 font-mono" textAnchor="middle" x="230" y="298">85k km</text>
                    <text className="text-[10px] fill-slate-400 font-mono" textAnchor="middle" x="350" y="298">60k km</text>
                    <text className="text-[10px] fill-slate-400 font-mono" textAnchor="middle" x="470" y="298">35k km</text>
                    <text className="text-[10px] fill-slate-400 font-mono" textAnchor="middle" x="590" y="298">15k km</text>
                  </>
                )}

                {/* Centroid Halos */}
                <circle cx="210" cy="215" fill="#AE3EC9" fillOpacity="0.08" r="54" />
                <circle cx="420" cy="200" fill="#0CA678" fillOpacity="0.08" r="62" />
                <circle cx="480" cy="110" fill="#2557D6" fillOpacity="0.08" r="72" />

                {/* Dots Segmen 3: Ekonomis (#AE3EC9) */}
                <circle cx="115" cy="265" fill="#AE3EC9" fillOpacity="0.75" r="4" />
                <circle cx="130" cy="250" fill="#AE3EC9" fillOpacity="0.75" r="4" />
                <circle cx="145" cy="235" fill="#AE3EC9" fillOpacity="0.8" r="4.5" />
                <circle cx="160" cy="245" fill="#AE3EC9" fillOpacity="0.75" r="4" />
                <circle cx="180" cy="225" fill="#AE3EC9" fillOpacity="0.8" r="4" />
                <circle cx="195" cy="205" fill="#AE3EC9" fillOpacity="0.75" r="4" />
                <circle cx="210" cy="220" fill="#AE3EC9" fillOpacity="0.8" r="4.5" />
                <circle cx="225" cy="200" fill="#AE3EC9" fillOpacity="0.75" r="4" />
                <circle cx="240" cy="230" fill="#AE3EC9" fillOpacity="0.7" r="4" />
                <circle cx="255" cy="215" fill="#AE3EC9" fillOpacity="0.85" r="4.5" />
                <circle cx="270" cy="205" fill="#AE3EC9" fillOpacity="0.75" r="4" />
                <circle cx="180" cy="275" fill="#AE3EC9" fillOpacity="0.9" r="5.5" />

                {/* Dots Segmen 2: Keluarga Muda (#0CA678) */}
                <circle cx="330" cy="220" fill="#0CA678" fillOpacity="0.75" r="4" />
                <circle cx="345" cy="205" fill="#0CA678" fillOpacity="0.8" r="4" />
                <circle cx="360" cy="195" fill="#0CA678" fillOpacity="0.85" r="4.5" />
                <circle cx="380" cy="210" fill="#0CA678" fillOpacity="0.75" r="4" />
                <circle cx="395" cy="185" fill="#0CA678" fillOpacity="0.85" r="4" />
                <circle cx="410" cy="200" fill="#0CA678" fillOpacity="0.85" r="5" />
                <circle cx="425" cy="190" fill="#0CA678" fillOpacity="0.8" r="4" />
                <circle cx="440" cy="205" fill="#0CA678" fillOpacity="0.8" r="4" />
                <circle cx="460" cy="180" fill="#0CA678" fillOpacity="0.8" r="4.5" />
                <circle cx="475" cy="195" fill="#0CA678" fillOpacity="0.75" r="4" />
                <circle cx="495" cy="185" fill="#0CA678" fillOpacity="0.8" r="4" />
                <circle cx="510" cy="170" fill="#0CA678" fillOpacity="0.8" r="4.5" />
                <circle cx="320" cy="255" fill="#0CA678" fillOpacity="0.9" r="5.5" />

                {/* Dots Segmen 1: Premium (#2557D6) */}
                <circle cx="360" cy="130" fill="#2557D6" fillOpacity="0.8" r="4.5" />
                <circle cx="385" cy="120" fill="#2557D6" fillOpacity="0.8" r="4" />
                <circle cx="415" cy="105" fill="#2557D6" fillOpacity="0.85" r="4.5" />
                <circle cx="430" cy="135" fill="#2557D6" fillOpacity="0.8" r="4" />
                <circle cx="450" cy="90" fill="#2557D6" fillOpacity="0.85" r="5" />
                <circle cx="470" cy="115" fill="#2557D6" fillOpacity="0.8" r="4" />
                <circle cx="490" cy="75" fill="#2557D6" fillOpacity="0.9" r="5" />
                <circle cx="510" cy="100" fill="#2557D6" fillOpacity="0.8" r="4.5" />
                <circle cx="535" cy="85" fill="#2557D6" fillOpacity="0.85" r="4.5" />
                <circle cx="550" cy="60" fill="#2557D6" fillOpacity="0.9" r="5" />
                <circle cx="575" cy="70" fill="#2557D6" fillOpacity="0.85" r="5" />
                <circle cx="590" cy="50" fill="#2557D6" fillOpacity="0.95" r="5.5" />
                <circle cx="615" cy="40" fill="#2557D6" fillOpacity="0.95" r="5.5" />
                <circle cx="370" cy="45" fill="#2557D6" fillOpacity="1" r="6" />

                {/* Centroid 1: Premium (480, 110) */}
                <g transform="translate(480, 110)">
                  <rect fill="#2557D6" height="16" transform="rotate(45)" width="16" x="-8" y="-8" />
                  <circle cx="0" cy="0" fill="#ffffff" r="3" />
                  <text className="text-[11px] font-bold fill-[#2557D6]" x="14" y="4">C1 (2018, Rp 212 Jt)</text>
                </g>

                {/* Centroid 2: Keluarga Muda (420, 200) */}
                <g transform="translate(420, 200)">
                  <rect fill="#0CA678" height="16" transform="rotate(45)" width="16" x="-8" y="-8" />
                  <circle cx="0" cy="0" fill="#ffffff" r="3" />
                  <text className="text-[11px] font-bold fill-[#0CA678]" x="14" y="4">C2 (2019, Rp 141 Jt)</text>
                </g>

                {/* Centroid 3: Ekonomis (210, 215) */}
                <g transform="translate(210, 215)">
                  <rect fill="#AE3EC9" height="16" transform="rotate(45)" width="16" x="-8" y="-8" />
                  <circle cx="0" cy="0" fill="#ffffff" r="3" />
                  <text className="text-[11px] font-bold fill-[#AE3EC9]" x="14" y="4">C3 (2016, Rp 139 Jt)</text>
                </g>
              </svg>
            </div>

            {/* Scatter Legend */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#2557D6]" />
                  <span>Segmen Premium (258 Unit)</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#0CA678]" />
                  <span>Segmen Keluarga Muda (197 Unit)</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#AE3EC9]" />
                  <span>Segmen Ekonomis (154 Unit)</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <span className="w-2.5 h-2.5 rotate-45 bg-[#001540] inline-block" />
                <span>Titik Centroid Klaster</span>
              </div>
            </div>
          </div>

          {/* Right: Insight Segmen Otomatis (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-3.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-base font-bold text-[#001540]">Insight Segmen Otomatis</span>
              <span className="px-2 py-0.5 rounded bg-[#001540] text-white text-[11px] font-semibold">AI Digest</span>
            </div>

            {/* Card 1: Premium */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#2557D6]" />
              <div className="pl-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#2557D6]" />
                  <span className="text-[10px] font-bold text-[#2557D6] tracking-wide uppercase">KLASTER 1: PREMIUM</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Segmen Premium mencakup <strong className="font-bold text-[#001540]">42% stok</strong> (258 unit) dengan median <strong className="font-bold text-[#001540]">Rp 212 Jt</strong> dan didominasi <strong className="font-bold text-[#001540]">91% transmisi matik</strong>.
                </p>
                <div className="mt-2.5 flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                  <span>Margin perputaran tertinggi di Fatmawati Hub</span>
                </div>
              </div>
            </div>

            {/* Card 2: Ekonomis */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#AE3EC9]" />
              <div className="pl-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#AE3EC9]" />
                  <span className="text-[10px] font-bold text-[#AE3EC9] tracking-wide uppercase">KLASTER 3: EKONOMIS</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Segmen Ekonomis punya jarak tempuh rata-rata tertinggi (<strong className="font-bold text-[#001540]">95 rb km</strong>) dengan median <strong className="font-bold text-[#001540]">Rp 139 Jt</strong>, cocok untuk target pembeli komuter harian.
                </p>
                <div className="mt-2.5 flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <Zap className="h-3.5 w-3.5 text-purple-600" />
                  <span>Depresiasi tahunan stabil (&lt; 6.5%)</span>
                </div>
              </div>
            </div>

            {/* Card 3: Keluarga Muda */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#0CA678]" />
              <div className="pl-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#0CA678]" />
                  <span className="text-[10px] font-bold text-[#0CA678] tracking-wide uppercase">KLASTER 2: KELUARGA MUDA</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Segmen Keluarga Muda paling muda (tahun tipikal <strong className="font-bold text-[#001540]">2019, 39 rb km</strong>) dengan <strong className="font-bold text-[#001540]">perputaran unit tercepat (14 hari)</strong> di bursa.
                </p>
                <div className="mt-2.5 flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <Car className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Permintaan test drive harian tertinggi</span>
                </div>
              </div>
            </div>

            {/* Bottom Alert Card */}
            <div className="bg-orange-50 border border-orange-200/80 p-4 rounded-xl shadow-xs flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#FE6A2B] text-white flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#001540]">Perhatian Audit Harga</p>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                  <strong className="font-bold text-[#A83900]">21 unit</strong> terdeteksi berada di luar rentang interkuartil (Q1–Q3) segmen masing-masing.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. SEGMENT PROFILE CARDS                                    */}
      {/* ============================================================ */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-[#001540] tracking-tight">Profil Klaster Segmen Pasar</h2>
            <p className="text-xs text-slate-500 mt-1">
              Pelajari karakteristik mendalam tiap klaster untuk penyesuaian strategi pengadaan unit dan penetapan target pasar dealer.
            </p>
          </div>
          <Link
            to="/admin/segmentasi"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#001540] hover:text-[#FE6A2B] transition-colors group shrink-0"
          >
            <span>Lihat Matriks Lengkap</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Segment 1: Premium */}
          <Link 
            to="/admin/segmentasi" 
            className="bg-white rounded-xl border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:-translate-y-1"
          >
            <div>
              <div className="h-2 w-full bg-[#2557D6]" />
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-1 rounded-full bg-[#EDF2FE] text-[#2557D6] text-[10px] font-bold inline-flex items-center gap-1.5 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2557D6]" />
                      SEGMEN: PREMIUM
                    </span>
                    <h3 className="text-base font-bold text-[#001540]">Klaster Premium</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-[#2557D6]">258</span>
                    <span className="block text-[10px] text-slate-400">Unit (42% Pangsa)</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Median Harga</span>
                  <div className="text-lg text-[#001540] font-bold mt-0.5">Rp 212 Jt</div>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Rentang Sehat: Rp 197 – 255 Jt</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Tahun Tipikal</span>
                    <span className="font-bold text-[#001540]">2018</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Rata-rata Odometer</span>
                    <span className="font-bold text-[#001540]">57.000 km</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Proporsi Matik</span>
                    <span className="font-bold text-[#001540]">91% Transmisi</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Fitur Unggulan</span>
                    <span className="font-bold text-[#001540]">1.8 Rata-rata</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                    <span>Pangsa Portofolio Dealer</span>
                    <span className="font-bold text-[#001540]">42.4%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#2557D6] rounded-full" style={{ width: '42.4%' }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[#2557D6] text-xs font-bold group-hover:bg-[#EDF2FE] transition-colors">
              <span>Buka Analisis A3</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

          {/* Segment 2: Keluarga Muda */}
          <Link 
            to="/admin/segmentasi" 
            className="bg-white rounded-xl border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:-translate-y-1"
          >
            <div>
              <div className="h-2 w-full bg-[#0CA678]" />
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-1 rounded-full bg-[#E6F7F0] text-[#0CA678] text-[10px] font-bold inline-flex items-center gap-1.5 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0CA678]" />
                      KELUARGA MUDA
                    </span>
                    <h3 className="text-base font-bold text-[#001540]">Keluarga Muda</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-[#0CA678]">197</span>
                    <span className="block text-[10px] text-slate-400">Unit (32% Pangsa)</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Median Harga</span>
                  <div className="text-lg text-[#001540] font-bold mt-0.5">Rp 141 Jt</div>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Rentang Sehat: Rp 128 – 165 Jt</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Tahun Tipikal</span>
                    <span className="font-bold text-[#001540]">2019 (Terbaru)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Rata-rata Odometer</span>
                    <span className="font-bold text-[#001540]">39.000 km</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Proporsi Matik</span>
                    <span className="font-bold text-[#001540]">53% Transmisi</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Fitur Unggulan</span>
                    <span className="font-bold text-[#001540]">0.4 Rata-rata</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                    <span>Pangsa Portofolio Dealer</span>
                    <span className="font-bold text-[#001540]">32.3%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#0CA678] rounded-full" style={{ width: '32.3%' }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[#0CA678] text-xs font-bold group-hover:bg-[#E6F7F0] transition-colors">
              <span>Buka Analisis A3</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

          {/* Segment 3: Ekonomis Siap Kerja */}
          <Link 
            to="/admin/segmentasi" 
            className="bg-white rounded-xl border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:-translate-y-1"
          >
            <div>
              <div className="h-2 w-full bg-[#AE3EC9]" />
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-1 rounded-full bg-[#F8EDFB] text-[#AE3EC9] text-[10px] font-bold inline-flex items-center gap-1.5 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#AE3EC9]" />
                      EKONOMIS &amp; EFISIEN
                    </span>
                    <h3 className="text-base font-bold text-[#001540]">Ekonomis Siap Kerja</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-[#AE3EC9]">154</span>
                    <span className="block text-[10px] text-slate-400">Unit (25% Pangsa)</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Median Harga</span>
                  <div className="text-lg text-[#001540] font-bold mt-0.5">Rp 139 Jt</div>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Rentang Sehat: Rp 115 – 152 Jt</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Tahun Tipikal</span>
                    <span className="font-bold text-[#001540]">2016</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Rata-rata Odometer</span>
                    <span className="font-bold text-[#001540]">95.000 km</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Proporsi Matik</span>
                    <span className="font-bold text-[#001540]">70% Transmisi</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Fitur Unggulan</span>
                    <span className="font-bold text-[#001540]">0.7 Rata-rata</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                    <span>Pangsa Portofolio Dealer</span>
                    <span className="font-bold text-[#001540]">25.3%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#AE3EC9] rounded-full" style={{ width: '25.3%' }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[#AE3EC9] text-xs font-bold group-hover:bg-[#F8EDFB] transition-colors">
              <span>Buka Analisis A3</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. CHARTS SECTION (Stok per Segmen & Komposisi Merek)       */}
      {/* ============================================================ */}
      <section className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold text-[#001540] tracking-tight">Distribusi Portofolio &amp; Komposisi Merek</h2>
          <p className="text-xs text-slate-500 mt-1">
            Monitor diversifikasi inventaris antar pabrikan utama dan alokasi unit pada tiap klaster segmen.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left: Bar Chart Stok per Segmen */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#001540]">Stok per Segmen (Unit)</h3>
                <span className="text-xs text-slate-400">Komparasi volume unit dan kecepatan rotasi</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md text-[#001540] text-xs font-bold">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>609 Total</span>
              </div>
            </div>

            <div className="flex flex-col gap-4 my-auto py-2">
              {/* Premium Bar */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline text-xs font-semibold">
                  <span className="font-bold text-[#001540] flex items-center gap-2">
                    <span className="w-3 h-3 rounded-xs bg-[#2557D6]" />
                    Klaster Premium
                  </span>
                  <span className="font-mono font-bold text-[#001540]">
                    258 Unit <span className="text-slate-400 font-normal font-sans text-[11px]">(42.4%)</span>
                  </span>
                </div>
                <div className="h-4 w-full bg-slate-100 rounded-lg overflow-hidden flex">
                  <div className="h-full bg-[#2557D6]" style={{ width: '42.4%' }} />
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Fast-Moving: 182 unit</span>
                  <span>Buffer Cadangan: 76 unit</span>
                </div>
              </div>

              {/* Keluarga Muda Bar */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline text-xs font-semibold">
                  <span className="font-bold text-[#001540] flex items-center gap-2">
                    <span className="w-3 h-3 rounded-xs bg-[#0CA678]" />
                    Klaster Keluarga Muda
                  </span>
                  <span className="font-mono font-bold text-[#001540]">
                    197 Unit <span className="text-slate-400 font-normal font-sans text-[11px]">(32.3%)</span>
                  </span>
                </div>
                <div className="h-4 w-full bg-slate-100 rounded-lg overflow-hidden flex">
                  <div className="h-full bg-[#0CA678]" style={{ width: '32.3%' }} />
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Fast-Moving: 164 unit</span>
                  <span>Buffer Cadangan: 33 unit</span>
                </div>
              </div>

              {/* Ekonomis Bar */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline text-xs font-semibold">
                  <span className="font-bold text-[#001540] flex items-center gap-2">
                    <span className="w-3 h-3 rounded-xs bg-[#AE3EC9]" />
                    Klaster Ekonomis Siap Kerja
                  </span>
                  <span className="font-mono font-bold text-[#001540]">
                    154 Unit <span className="text-slate-400 font-normal font-sans text-[11px]">(25.3%)</span>
                  </span>
                </div>
                <div className="h-4 w-full bg-slate-100 rounded-lg overflow-hidden flex">
                  <div className="h-full bg-[#AE3EC9]" style={{ width: '25.3%' }} />
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Fast-Moving: 109 unit</span>
                  <span>Buffer Cadangan: 45 unit</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 bg-slate-50 p-3 rounded-lg flex items-center justify-between text-slate-600 text-[11px]">
              <span className="flex items-center gap-1.5 font-semibold text-[#001540]">
                <Zap className="h-3.5 w-3.5 text-emerald-600" />
                Perputaran rata-rata portofolio: 21,8 Hari
              </span>
              <span className="text-slate-400">Target dealer: &lt; 25 Hari (Sehat)</span>
            </div>
          </div>

          {/* Right: Donut Chart Komposisi Merek */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-bold text-[#001540]">Komposisi Merek Mobil</h3>
                <span className="text-xs text-slate-400">Diversifikasi pabrikan dari 609 unit aktif</span>
              </div>
              <span className="px-2.5 py-1 rounded bg-orange-100 text-[#A83900] text-[10px] font-bold">
                Top 5 Brands
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 my-auto py-3">
              {/* Inline SVG Donut Chart */}
              <div className="relative w-40 h-40 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" fill="transparent" r="38" stroke="#E2E8F0" strokeWidth="14" />
                  <circle cx="50" cy="50" fill="transparent" r="38" stroke="#0F2A5F" strokeDasharray="90.7 238.7" strokeDashoffset="0" strokeWidth="14" />
                  <circle cx="50" cy="50" fill="transparent" r="38" stroke="#FE6A2B" strokeDasharray="62.0 238.7" strokeDashoffset="-90.7" strokeWidth="14" />
                  <circle cx="50" cy="50" fill="transparent" r="38" stroke="#0CA678" strokeDasharray="43.0 238.7" strokeDashoffset="-152.7" strokeWidth="14" />
                  <circle cx="50" cy="50" fill="transparent" r="38" stroke="#2557D6" strokeDasharray="26.2 238.7" strokeDashoffset="-195.7" strokeWidth="14" />
                  <circle cx="50" cy="50" fill="transparent" r="38" stroke="#AE3EC9" strokeDasharray="16.7 238.7" strokeDashoffset="-221.9" strokeWidth="14" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-lg font-extrabold text-[#001540] leading-none">609</span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">Total Unit</span>
                </div>
              </div>

              {/* Detailed Legend */}
              <div className="flex flex-col gap-2.5 w-full sm:w-auto text-xs">
                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#0F2A5F]" />
                    <span className="font-semibold text-[#001540]">Toyota</span>
                  </div>
                  <div className="font-mono font-bold text-slate-700">231 <span className="text-slate-400 font-normal font-sans">(38%)</span></div>
                </div>

                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#FE6A2B]" />
                    <span className="font-semibold text-[#001540]">Honda</span>
                  </div>
                  <div className="font-mono font-bold text-slate-700">158 <span className="text-slate-400 font-normal font-sans">(26%)</span></div>
                </div>

                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#0CA678]" />
                    <span className="font-semibold text-[#001540]">Daihatsu</span>
                  </div>
                  <div className="font-mono font-bold text-slate-700">110 <span className="text-slate-400 font-normal font-sans">(18%)</span></div>
                </div>

                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#2557D6]" />
                    <span className="font-semibold text-[#001540]">Mitsubishi</span>
                  </div>
                  <div className="font-mono font-bold text-slate-700">67 <span className="text-slate-400 font-normal font-sans">(11%)</span></div>
                </div>

                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#AE3EC9]" />
                    <span className="font-semibold text-[#001540]">Suzuki &amp; Lainnya</span>
                  </div>
                  <div className="font-mono font-bold text-slate-700">43 <span className="text-slate-400 font-normal font-sans">(7%)</span></div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 bg-slate-50 p-3 rounded-lg flex items-center justify-between text-slate-500 text-[11px]">
              <span className="text-[#001540] font-semibold">Tingkat Penjualan Tertinggi: Toyota &amp; Honda</span>
              <span className="text-[#A83900] font-bold">64% Portofolio Utama</span>
            </div>
          </div>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. ACTION LIST: Table "Harga di Luar Rentang Segmen (Q1–Q3)" */}
      {/* ============================================================ */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-[#A83900] text-white text-[10px] font-bold uppercase tracking-wider">
                Prioritas Manager
              </span>
              <span className="text-xs text-[#A83900] font-bold">21 Unit Perlu Review</span>
            </div>
            <h2 className="text-xl font-bold text-[#001540] tracking-tight">
              Daftar Tindakan: Harga di Luar Rentang Segmen (Q1–Q3)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Tinjau unit dengan deviasi harga signifikan untuk segera dilakukan penyesuaian markup atau audit ulang kondisi fisik.
            </p>
          </div>
          <Link
            to="/admin/inventori"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#A83900] hover:text-[#5B1B00] transition-colors group shrink-0"
          >
            <span>Buka Audit Lengkap A4</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Filter Bar & Table Container */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          
          {/* Action Filter Bar */}
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAnomalyFilter('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-all ${
                  anomalyFilter === 'all'
                    ? 'bg-[#001540] text-white'
                    : 'bg-white text-slate-600 hover:text-[#001540] border border-slate-200'
                }`}
              >
                Semua (21)
              </button>
              <button
                type="button"
                onClick={() => setAnomalyFilter('above')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  anomalyFilter === 'above'
                    ? 'bg-[#001540] text-white'
                    : 'bg-white text-slate-600 hover:text-[#001540] border border-slate-200'
                }`}
              >
                Di Atas Rentang (14)
              </button>
              <button
                type="button"
                onClick={() => setAnomalyFilter('below')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  anomalyFilter === 'below'
                    ? 'bg-[#001540] text-white'
                    : 'bg-white text-slate-600 hover:text-[#001540] border border-slate-200'
                }`}
              >
                Di Bawah Rentang (7)
              </button>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                value={anomalySearch}
                onChange={(e) => setAnomalySearch(e.target.value)}
                placeholder="Cari data anomali..."
                className="pl-3.5 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs"
              />
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-[#001540] text-xs font-semibold shadow-2xs transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Ekspor CSV</span>
              </button>
            </div>
          </div>

          {/* Table View */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Model &amp; Varian Kendaraan</th>
                  <th className="py-3.5 px-4">Klaster Terpasang</th>
                  <th className="py-3.5 px-4">Harga Listing Dealer</th>
                  <th className="py-3.5 px-4">Rentang Sehat (Q1–Q3)</th>
                  <th className="py-3.5 px-4">Deviasi / Status</th>
                  <th className="py-3.5 px-4 text-right">Tindakan Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                {filteredAnomalies.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4 font-semibold text-[#001540]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-[#001540] shrink-0">
                          <Car className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-bold block text-[#001540]">{item.nama}</span>
                          <span className="text-[11px] text-slate-400">{item.sub}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span 
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5"
                        style={{
                          backgroundColor: `${item.warnaHex}15`,
                          color: item.warnaHex
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.warnaHex }} />
                        {item.klasterNama}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-bold text-sm text-[#001540]">
                      Rp {item.harga.toLocaleString('id-ID')}
                    </td>

                    <td className="py-4 px-4 text-slate-500">
                      {item.rentang}
                    </td>

                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                        item.isAbove
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-blue-100 text-blue-900'
                      }`}>
                        {item.isAbove ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {item.status} ({item.selisih})
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <Link
                        to="/admin/inventori"
                        className="inline-flex items-center gap-1 text-[#001540] hover:text-[#FE6A2B] font-bold text-xs group"
                      >
                        <span>Audit Unit</span>
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Table Note */}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Menampilkan <strong>{filteredAnomalies.length} dari 21 unit anomali</strong> • Klik baris untuk membuka layar Audit Harga</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold">
              <button type="button" className="px-2.5 py-1 rounded bg-white font-bold text-[#001540] border border-slate-200 shadow-2xs">1</button>
              <button type="button" className="px-2.5 py-1 rounded hover:bg-slate-100 text-slate-600">2</button>
              <button type="button" className="px-2.5 py-1 rounded hover:bg-slate-100 text-slate-600">3</button>
            </div>
          </div>
        </div>

      </section>

    </div>
  );
}
